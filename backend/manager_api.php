<?php
require_once __DIR__ . '/config.php';   // loads secrets + ALLOWED_ORIGIN/COOKIE_SAMESITE
require_once __DIR__ . '/cors.php';      // credentialed CORS; handles OPTIONS preflight
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/auth_guard.php';
require_once __DIR__ . '/db.php';
$conn = db_connect();


/**
 * Invoice arithmetic, kept in one place.
 *
 * VAT is charged on section 2 (contract service charges, W/HT applicable) only.
 * Section 1 is third-party money passing through — customs duty, shipping line,
 * terminal handling — and is never taxed again. Applying VAT to the whole
 * subtotal would have overstated the sample invoice by GH\u20b51,400.
 */
function invoice_totals(array $items, float $vatRate, float $deposit): array {
    $sub1 = 0.0;
    $sub2 = 0.0;
    foreach ($items as $it) {
        $amount = (float)($it['qty'] ?? 0) * (float)($it['rate'] ?? 0);
        if ((int)$it['section'] === 1) { $sub1 += $amount; } else { $sub2 += $amount; }
    }
    $subtotal = $sub1 + $sub2;
    $vat      = round($sub2 * ($vatRate / 100), 2);
    $total    = round($subtotal + $vat, 2);
    return [
        'sub_total_1' => round($sub1, 2),
        'sub_total_2' => round($sub2, 2),
        'subtotal'    => round($subtotal, 2),
        'vat'         => $vat,
        'total'       => $total,
        'deposit'     => round($deposit, 2),
        'balance'     => round($total - $deposit, 2),
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

/**
 * Reads an <input type=file multiple> field ($_FILES[$field]) into an array of
 * ['name','mime','size','data'(base64)] rows ready to insert into a *_files
 * table. Uploads are stored in the DB rather than on disk because the
 * production host (Vercel container) has a read-only, ephemeral filesystem that
 * cannot persist files. Throws RuntimeException with a user-safe message when a
 * file exceeds the size limit.
 */
function read_uploaded_files($field) {
    $out = [];
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field]['name'])) return $out;
    $n = count($_FILES[$field]['name']);
    for ($i = 0; $i < $n; $i++) {
        $err = $_FILES[$field]['error'][$i];
        if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
            throw new RuntimeException("One of the attached files is too large. Please attach files under 4 MB.");
        }
        if ($err !== UPLOAD_ERR_OK) continue;   // empty slot
        $bytes = @file_get_contents($_FILES[$field]['tmp_name'][$i]);
        if ($bytes === false) continue;
        $name = basename($_FILES[$field]['name'][$i]);
        if ($name === '') $name = 'attachment';
        $out[] = [
            'name' => mb_substr($name, 0, 255),
            'mime' => $_FILES[$field]['type'][$i] ?: 'application/octet-stream',
            'size' => strlen($bytes),
            'data' => base64_encode($bytes),
        ];
    }
    return $out;
}

/**
 * Returns a map of ownerId => [{id,name,size}, ...] for a *_files table, so a
 * list endpoint can attach each row's attachment metadata (never the bytes).
 */
function load_files_map($conn, $table, $ownerColumn) {
    $map = [];
    $stmt = $conn->query("SELECT id, $ownerColumn AS owner, file_name, file_size FROM $table ORDER BY id");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $f) {
        $map[(int)$f['owner']][] = [
            'id' => (int)$f['id'],
            'name' => $f['file_name'],
            'size' => (int)$f['file_size'],
        ];
    }
    return $map;
}

/** Inserts prepared file rows (from read_uploaded_files) into a *_files table. */
function insert_owned_files($conn, $table, $ownerColumn, $ownerId, $files) {
    if (empty($files)) return;
    $stmt = $conn->prepare("INSERT INTO $table ($ownerColumn, file_name, mime_type, file_size, file_data) VALUES (:owner, :name, :mime, :size, :data)");
    foreach ($files as $f) {
        $stmt->execute([
            ':owner' => $ownerId,
            ':name' => $f['name'],
            ':mime' => $f['mime'],
            ':size' => $f['size'],
            ':data' => $f['data'],
        ]);
    }
}

/** Streams one stored file's bytes back inline (used by the download actions). */
function stream_stored_file($conn, $table, $fileId) {
    $stmt = $conn->prepare("SELECT file_name, mime_type, file_data FROM $table WHERE id = :id");
    $stmt->execute([':id' => $fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$file) {
        http_response_code(404);
        echo json_encode(["error" => "Attachment not found."]);
        exit();
    }
    $bytes = base64_decode($file['file_data'], true);
    if ($bytes === false) {
        http_response_code(500);
        echo json_encode(["error" => "Attachment is corrupted."]);
        exit();
    }
    $safeName = preg_replace('/[^A-Za-z0-9._ -]/', '_', (string)$file['file_name']);
    header('Content-Type: ' . ($file['mime_type'] ?: 'application/octet-stream'));
    header('Content-Disposition: inline; filename="' . $safeName . '"');
    header('Content-Length: ' . strlen($bytes));
    header('X-Content-Type-Options: nosniff');
    echo $bytes;
    exit();
}

// GET ACTIONS (READ ENGINE)
if ($method === 'GET') {
    try {
        // PUBLIC cargo tracking — no auth. A customer enters their Bill of
        // Lading / container / reference number and sees the shipment's current
        // status, route, and progress timeline. Deliberately returns only
        // non-sensitive fields: no client name, staff emails, file paths, or
        // finance data. Progress notes are parsed out of the notes column and
        // the staff email on each entry is stripped before returning.
        if ($action === 'track') {
            $ref = strtoupper(trim($_GET['ref'] ?? ''));
            if ($ref === '') {
                echo json_encode(["found" => false, "error" => "Please enter a Bill of Lading or reference number."]);
                exit();
            }

            $stmt = $conn->prepare('SELECT "containerNo", status, origin, destination, notes, "timestamp", edited_at FROM shipments WHERE UPPER("containerNo") = :ref LIMIT 1');
            $stmt->execute([':ref' => $ref]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                echo json_encode(["found" => false]);
                exit();
            }

            // Pull the timestamped progress entries out of notes
            // ("[Y-m-d H:i] someone@email: comment"), dropping the email.
            $updates = [];
            if (!empty($row['notes'])) {
                foreach (preg_split('/\n\n+/', trim($row['notes'])) as $block) {
                    if (preg_match('/^\[([^\]]+)\]\s*[^:]*:\s*(.+)$/s', trim($block), $mm)) {
                        $updates[] = ["date" => trim($mm[1]), "note" => trim($mm[2])];
                    }
                }
            }

            echo json_encode([
                "found"       => true,
                "containerNo" => $row['containerNo'],
                "status"      => $row['status'],
                "origin"      => $row['origin'],
                "destination" => $row['destination'],
                "loggedAt"    => $row['timestamp'],
                "lastUpdated" => $row['edited_at'] ?: $row['timestamp'],
                "updates"     => $updates,
            ]);
        }
        elseif ($action === 'get_overview') {
            require_manager_email();
            $shipmentCount = $conn->query("SELECT COUNT(*) FROM shipments")->fetchColumn();
            $employeeCount = $conn->query("SELECT COUNT(*) FROM employees")->fetchColumn();
            $shipmentCountToday = $conn->query('SELECT COUNT(*) FROM shipments WHERE "timestamp"::date = CURRENT_DATE')->fetchColumn();

            $totalIncome = $conn->query("SELECT SUM(amount) FROM transactions WHERE type='Income'")->fetchColumn() ?? 0;
            $totalExpense = $conn->query("SELECT SUM(amount) FROM transactions WHERE type='Expense'")->fetchColumn() ?? 0;
            $netBalance = $totalIncome - $totalExpense;

            $todayIncome = $conn->query("SELECT SUM(amount) FROM transactions WHERE type='Income' AND date_logged::date = CURRENT_DATE")->fetchColumn() ?? 0;
            $todayExpense = $conn->query("SELECT SUM(amount) FROM transactions WHERE type='Expense' AND date_logged::date = CURRENT_DATE")->fetchColumn() ?? 0;
            $netBalanceToday = $todayIncome - $todayExpense;

            echo json_encode([
                "total_shipments" => (int)$shipmentCount,
                "total_employees" => (int)$employeeCount,
                "net_profit" => (float)$netBalance,
                "total_shipments_today" => (int)$shipmentCountToday,
                "net_profit_today" => (float)$netBalanceToday
            ]);
        }
        elseif ($action === 'get_all_shipments') {
            // Shared across every staff role now — manager, finance, and every
            // agent/secretary on the field dashboard all see the same
            // company-wide manifest feed, not just their own submissions.
            require_authenticated_email();
            $rows = $conn->query("SELECT * FROM shipments ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
            $map = load_files_map($conn, 'shipment_files', 'shipment_id');
            foreach ($rows as &$r) { $r['files'] = $map[(int)$r['id']] ?? []; }
            unset($r);
            echo json_encode($rows);
        }
        elseif ($action === 'get_employees') {
            require_manager_email();
            $stmt = $conn->query("SELECT * FROM employees ORDER BY id DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        elseif ($action === 'get_transactions') {
            require_finance_email();
            $rows = $conn->query("SELECT * FROM transactions ORDER BY date_logged DESC")->fetchAll(PDO::FETCH_ASSOC);

            // Attach each transaction's file list (metadata only — never the bytes).
            // The frontend renders these as download links to ?action=download_transaction_file.
            $filesByTx = [];
            $fstmt = $conn->query("SELECT id, transaction_id, file_name, file_size FROM transaction_files ORDER BY id");
            foreach ($fstmt->fetchAll(PDO::FETCH_ASSOC) as $f) {
                $filesByTx[(int)$f['transaction_id']][] = [
                    'id' => (int)$f['id'],
                    'name' => $f['file_name'],
                    'size' => (int)$f['file_size'],
                ];
            }
            foreach ($rows as &$r) {
                $r['files'] = $filesByTx[(int)$r['id']] ?? [];
            }
            unset($r);

            echo json_encode($rows);
        }
        elseif ($action === 'download_transaction_file') {
            require_finance_email();
            // Streams inline, overriding the JSON content-type set at the top.
            stream_stored_file($conn, 'transaction_files', (int)($_GET['id'] ?? 0));
        }
        elseif ($action === 'download_shipment_file') {
            require_authenticated_email();   // any staff member may view manifests
            stream_stored_file($conn, 'shipment_files', (int)($_GET['id'] ?? 0));
        }
        elseif ($action === 'get_audit_log') {
            require_manager_email();
            $stmt = $conn->query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 2000");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        elseif ($action === 'get_my_shipments') {
            $authedEmail = require_authenticated_email();
            $agentEmail = isset($_GET['agent_email']) ? strtolower(trim($_GET['agent_email'])) : '';
            if (empty($agentEmail)) {
                echo json_encode(["error" => "Agent email is required for this query."]);
                exit();
            }
            // Agents may only ever pull their own manifest, regardless of what
            // agent_email the client sends — the manager can pull anyone's.
            if ($authedEmail !== strtolower(MANAGER_EMAIL) && $agentEmail !== $authedEmail) {
                auth_fail(403, "You may only view your own shipment log.");
            }
            $stmt = $conn->prepare('SELECT * FROM shipments WHERE "updatedBy" = :agentEmail ORDER BY "timestamp" DESC');
            $stmt->execute([':agentEmail' => $agentEmail]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $map = load_files_map($conn, 'shipment_files', 'shipment_id');
            foreach ($rows as &$r) { $r['files'] = $map[(int)$r['id']] ?? []; }
            unset($r);
            echo json_encode($rows);
        }
        elseif ($action === 'get_customers') {
            require_authenticated_email();
            $stmt = $conn->prepare('SELECT c.*, COUNT(sh.id) AS shipment_count
                                    FROM customers c
                                    LEFT JOIN shipments sh ON sh.customer_id = c.id
                                    GROUP BY c.id ORDER BY c.name');
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        elseif ($action === 'get_report') {
            // Period report: income vs expenditure, plus shipments grouped by
            // the classifications the client asked for. All aggregation happens
            // here so the on-screen report and the printed PDF cannot diverge.
            require_manager_email();

            $from = trim($_GET['from'] ?? '') ?: date('Y-01-01');
            $to   = trim($_GET['to'] ?? '')   ?: date('Y-m-d');
            // inclusive of the whole end day
            $toEnd = $to . ' 23:59:59';

            $out = ['from' => $from, 'to' => $to];

            // --- money ------------------------------------------------------
            $fin = $conn->prepare(
                "SELECT LOWER(type) AS t, COALESCE(SUM(amount),0) AS total, COUNT(*) AS n
                 FROM transactions WHERE date_logged BETWEEN :f AND :t GROUP BY LOWER(type)"
            );
            $fin->execute([':f' => $from, ':t' => $toEnd]);
            $income = 0.0; $expense = 0.0; $nIn = 0; $nEx = 0;
            foreach ($fin->fetchAll(PDO::FETCH_ASSOC) as $r) {
                if ($r['t'] === 'income') { $income = (float)$r['total']; $nIn = (int)$r['n']; }
                else { $expense += (float)$r['total']; $nEx += (int)$r['n']; }
            }
            $out['finance'] = [
                'income' => round($income, 2), 'expense' => round($expense, 2),
                'net' => round($income - $expense, 2),
                'income_count' => $nIn, 'expense_count' => $nEx,
                'margin_pct' => $income > 0 ? round((($income - $expense) / $income) * 100, 1) : 0,
            ];

            $byCat = $conn->prepare(
                "SELECT category, LOWER(type) AS t, COALESCE(SUM(amount),0) AS total, COUNT(*) AS n
                 FROM transactions WHERE date_logged BETWEEN :f AND :t
                 GROUP BY category, LOWER(type) ORDER BY total DESC"
            );
            $byCat->execute([':f' => $from, ':t' => $toEnd]);
            $out['finance_by_category'] = $byCat->fetchAll(PDO::FETCH_ASSOC);

            // --- shipments --------------------------------------------------
            $grouped = function (string $col) use ($conn, $from, $toEnd) {
                $sql = "SELECT COALESCE(NULLIF($col,''),'Unclassified') AS label, COUNT(*) AS n
                        FROM shipments WHERE \"timestamp\" BETWEEN :f AND :t
                        GROUP BY 1 ORDER BY n DESC";
                $st = $conn->prepare($sql);
                $st->execute([':f' => $from, ':t' => $toEnd]);
                return $st->fetchAll(PDO::FETCH_ASSOC);
            };

            $out['by_regime']      = $grouped('regime');
            $out['by_consignment'] = $grouped('consignment_type');
            $out['by_status']      = $grouped('status');
            $out['by_agent']       = $grouped('"updatedBy"');

            $tot = $conn->prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT \"clientName\") AS clients,
                                          COUNT(*) FILTER (WHERE approved = 1) AS approved
                                   FROM shipments WHERE \"timestamp\" BETWEEN :f AND :t");
            $tot->execute([':f' => $from, ':t' => $toEnd]);
            $t = $tot->fetch(PDO::FETCH_ASSOC);

            // Average per month across the selected span, so a quarter and a
            // year are comparable figures rather than raw counts.
            $months = max(1, (int)round((strtotime($to) - strtotime($from)) / 2629800));
            $out['shipments'] = [
                'total' => (int)$t['n'],
                'clients' => (int)$t['clients'],
                'approved' => (int)$t['approved'],
                'months' => $months,
                'avg_per_month' => round(((int)$t['n']) / $months, 1),
            ];

            $out['invoiced'] = (function () use ($conn, $from, $to) {
                $st = $conn->prepare("SELECT COUNT(*) AS n FROM invoices WHERE invoice_date BETWEEN :f AND :t");
                $st->execute([':f' => $from, ':t' => $to]);
                return (int)$st->fetchColumn();
            })();

            // --- customer demographics --------------------------------------
            // Counted over customers who had a shipment in the period, so the
            // figures describe the people actually served — the deck's "N".
            $demo = function (string $col) use ($conn, $from, $toEnd) {
                $sql = "SELECT COALESCE(NULLIF(c.$col,''),'Not recorded') AS label, COUNT(DISTINCT c.id) AS n
                        FROM customers c
                        JOIN shipments sh ON sh.customer_id = c.id
                        WHERE sh.\"timestamp\" BETWEEN :f AND :t
                        GROUP BY 1 ORDER BY n DESC";
                $st = $conn->prepare($sql);
                $st->execute([':f' => $from, ':t' => $toEnd]);
                return $st->fetchAll(PDO::FETCH_ASSOC);
            };

            $nStmt = $conn->prepare("SELECT COUNT(DISTINCT c.id) FROM customers c
                                     JOIN shipments sh ON sh.customer_id = c.id
                                     WHERE sh.\"timestamp\" BETWEEN :f AND :t");
            $nStmt->execute([':f' => $from, ':t' => $toEnd]);

            $out['demographics'] = [
                'n'            => (int)$nStmt->fetchColumn(),
                'gender'       => $demo('gender'),
                'marital'      => $demo('marital_status'),
                'religion'     => $demo('religion'),
                'nationality'  => $demo('nationality'),
                'occupation'   => $demo('occupation'),
                'location'     => $demo('location'),
            ];

            echo json_encode($out);
        }
        elseif ($action === 'next_invoice_no') {
            // Next number in the SIDMANFCL### series. Derived from the highest
            // existing numeric suffix rather than a counter, so it stays correct
            // if a number is edited by hand or an invoice is deleted.
            require_manager_email();
            $prefix = 'SIDMANFCL';
            $stmt = $conn->prepare(
                "SELECT MAX(CAST(SUBSTRING(invoice_no FROM '[0-9]+$') AS INTEGER))
                 FROM invoices WHERE invoice_no ~ ('^' || :p || '[0-9]+$')"
            );
            $stmt->execute([':p' => $prefix]);
            $max = (int)$stmt->fetchColumn();
            echo json_encode(["success" => true, "invoice_no" => $prefix . str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT)]);
        }
        elseif ($action === 'get_invoices') {
            require_manager_email();
            $stmt = $conn->prepare('SELECT * FROM invoices ORDER BY created_at DESC');
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Attach line items and compute the totals server-side, so the PDF,
            // the list and any future report can never disagree about a figure.
            $itemStmt = $conn->prepare('SELECT id, section, description, qty, rate, sort_order FROM invoice_items WHERE invoice_id = :i ORDER BY section, sort_order, id');
            foreach ($rows as &$r) {
                $itemStmt->execute([':i' => $r['id']]);
                $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
                $r['items'] = $items;
                $r['totals'] = invoice_totals($items, (float)$r['vat_rate'], (float)$r['deposit']);
            }
            unset($r);
            echo json_encode($rows);
        }
        elseif ($action === 'get_my_profile') {
            // Self-service: any signed-in user reading their OWN record. The two
            // fixed accounts (manager, finance) have no employees row — their
            // credentials live in auth_config.php — so synthesise a profile for
            // them and mark it read-only.
            $email = require_authenticated_email();
            $role = role_for_email($email);
            $fixed = ($email === strtolower(MANAGER_EMAIL) || $email === strtolower(FINANCE_EMAIL));

            if ($fixed) {
                echo json_encode([
                    "success" => true,
                    "profile" => [
                        "email" => $email, "role" => $role, "name" => null,
                        "phone" => null, "status" => "Active",
                        "fixed_account" => true, "can_edit" => false,
                    ],
                ]);
            } else {
                $stmt = $conn->prepare('SELECT id, name, email, phone, role, status, created_at, portal_access FROM employees WHERE LOWER(email) = :e LIMIT 1');
                $stmt->execute([':e' => $email]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    http_response_code(404);
                    echo json_encode(["error" => "No staff record found for this account."]);
                } else {
                    $row['fixed_account'] = false;
                    $row['can_edit'] = true;
                    echo json_encode(["success" => true, "profile" => $row]);
                }
            }
        }
        elseif ($action === 'whoami') {
            // Called right after Firebase sign-in, before the frontend commits
            // to routing the user into a dashboard — lets Login.jsx reject a
            // Firebase account that isn't (or is no longer) a real staff
            // record with a clean "Access Denied", instead of dropping them
            // onto a dashboard that just fails to load any data.
            $email = require_authenticated_email();
            $role = 'Agent';
            if ($email === strtolower(MANAGER_EMAIL)) {
                $role = 'Manager';
            } elseif ($email === strtolower(FINANCE_EMAIL)) {
                $role = 'Finance';
            }
            echo json_encode(["success" => true, "email" => $email, "role" => $role]);
        }
        else {
            echo json_encode(["error" => "Unknown GET action: " . $action]);
        }
    } catch(PDOException $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
}

// POST ACTIONS (WRITE & UPDATE ENGINE)
if ($method === 'POST') {
    try {
        // Public endpoint — the only POST action that runs WITHOUT a bearer
        // token, because it's how you get one. Verifies email+password and, on
        // success, drops the signed JWT into an HttpOnly cookie the browser
        // replays automatically on every subsequent request. The token itself
        // is never returned in the body (JavaScript must not be able to read
        // it); only the non-secret identity (email/role/exp) is, so the UI can
        // route and render without decoding the token.
        if ($action === 'login') {
            $email = strtolower(trim($_POST['email'] ?? ''));
            $password = (string)($_POST['password'] ?? '');

            if ($email === '' || $password === '') {
                auth_fail(400, "Email and password are required.");
            }

            $role = verify_portal_login($conn, $email, $password);
            if ($role === false) {
                // Deliberately vague — never reveal whether it was the email or
                // the password that was wrong, or whether access was revoked.
                auth_fail(401, "Invalid email or password.");
            }

            $exp = time() + AUTH_TTL;
            $token = jwt_issue(['email' => $email, 'role' => $role], AUTH_TTL);
            set_auth_cookie($token);
            log_audit_event($conn, $email, 'login', null, "$email logged in");
            echo json_encode(["success" => true, "email" => $email, "role" => $role, "exp" => $exp]);
        }
        // Clears the session cookie. No auth required — logging out an already
        // invalid/expired session is a harmless no-op.
        elseif ($action === 'logout') {
            clear_auth_cookie();
            echo json_encode(["success" => true]);
        }
        // PUBLIC — the website contact form. No auth. Sends the enquiry to the
        // company inbox via the site's own mailbox (SMTP), so there's no
        // third-party email service or monthly cap.
        elseif ($action === 'contact') {
            $name    = trim($_POST['name'] ?? '');
            $email   = trim($_POST['email'] ?? '');
            $phone   = trim($_POST['phone'] ?? '');
            $subject = trim($_POST['subject'] ?? '');
            $message = trim($_POST['message'] ?? '');

            // Honeypot: bots fill hidden fields humans never see. Pretend success.
            if (!empty($_POST['company'])) { echo json_encode(["success" => true]); exit(); }

            if ($name === '' || $email === '' || $subject === '' || $message === '') {
                echo json_encode(["error" => "Please fill in your name, email, subject, and message."]);
                exit();
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(["error" => "Please enter a valid email address."]);
                exit();
            }
            if (!defined('SMTP_HOST') || SMTP_HOST === '' || !defined('SMTP_PASS') || SMTP_PASS === '' || strpos(SMTP_PASS, 'REPLACE') !== false) {
                http_response_code(500);
                echo json_encode(["error" => "The contact service is not configured yet."]);
                exit();
            }

            $body = "New enquiry from the Sidman Freight Consult website\n\n"
                  . "Name:    $name\n"
                  . "Email:   $email\n"
                  . "Phone:   " . ($phone !== '' ? $phone : '-') . "\n"
                  . "Subject: $subject\n\n"
                  . "Message:\n$message\n";
            $to = (defined('CONTACT_TO') && CONTACT_TO !== '') ? CONTACT_TO : SMTP_USER;
            $port = (defined('SMTP_PORT') && SMTP_PORT !== '') ? SMTP_PORT : 465;

            require_once __DIR__ . '/smtp_mailer.php';
            $sent = send_smtp_mail(SMTP_HOST, $port, SMTP_USER, SMTP_PASS, SMTP_USER, 'Sidman Freight Consult Website', $to, $email, "Website enquiry: $subject", $body);

            if ($sent === true) {
                echo json_encode(["success" => true, "message" => "Message sent."]);
            } else {
                error_log("Contact form SMTP failure: $sent");
                http_response_code(502);
                // Non-sensitive failure category (no credentials/host) so failures
                // are diagnosable from the response.
                $code = (stripos($sent, 'connect') !== false) ? 'MAIL_UNREACHABLE'
                      : ((stripos($sent, '235') !== false || stripos($sent, 'auth') !== false) ? 'MAIL_AUTH_FAILED'
                      : 'MAIL_SEND_FAILED');
                echo json_encode(["error" => "Could not send your message right now. Please try again, or email us directly.", "code" => $code]);
            }
        }
        elseif ($action === 'log_event') {
            // Client-triggered events with no other natural server round-trip
            // (login, logout, export). The actor email always comes from the
            // verified token, never the request body.
            $actorEmail = require_authenticated_email();
            $eventType = trim($_POST['event_type'] ?? '');
            $description = trim($_POST['description'] ?? '');

            if (empty($eventType) || empty($description)) {
                echo json_encode(["error" => "event_type and description are required."]);
                exit();
            }

            log_audit_event($conn, $actorEmail, $eventType, null, $description);
            echo json_encode(["success" => true]);
        }
        elseif ($action === 'save_customer') {
            $email = require_authenticated_email();
            $id   = isset($_POST['id']) && $_POST['id'] !== '' ? (int)$_POST['id'] : 0;
            $name = trim($_POST['name'] ?? '');
            if ($name === '') {
                http_response_code(400);
                echo json_encode(["error" => "A customer name is required."]);
            } else {
                // Whitelist the constrained fields so a bad value returns a clean
                // message rather than a constraint violation.
                $sets = [
                    'gender'         => ['Male','Female'],
                    'marital_status' => ['Married','Single','Divorced','Widowed'],
                    'religion'       => ['Christianity','Islam','Traditional','Other'],
                    'nationality'    => ['Ghanaian','Non-Ghanaian'],
                ];
                $vals = [':name' => $name];
                $bad = null;
                foreach ($sets as $field => $allowed) {
                    $v = trim($_POST[$field] ?? '');
                    if ($v === '') { $vals[':' . $field] = null; continue; }
                    // Reject rather than silently null: a value that is not on
                    // the list means a frontend bug or tampering, and quietly
                    // dropping it would lose data without anyone noticing.
                    if (!in_array($v, $allowed, true)) { $bad = "$field: \"$v\""; break; }
                    $vals[':' . $field] = $v;
                }
                if ($bad !== null) {
                    http_response_code(400);
                    echo json_encode(["error" => "Unrecognised value for $bad."]);
                    return;
                }
                foreach (['phone','email','occupation','location','notes'] as $free) {
                    $v = trim($_POST[$free] ?? '');
                    $vals[':' . $free] = $v === '' ? null : $v;
                }

                if ($id > 0) {
                    $sql = 'UPDATE customers SET name=:name, phone=:phone, email=:email, gender=:gender,
                            marital_status=:marital_status, religion=:religion, nationality=:nationality,
                            occupation=:occupation, location=:location, notes=:notes,
                            updated_by=:by, updated_at=CURRENT_TIMESTAMP WHERE id=:id';
                    $conn->prepare($sql)->execute($vals + [':by' => $email, ':id' => $id]);
                } else {
                    $sql = 'INSERT INTO customers (name,phone,email,gender,marital_status,religion,
                            nationality,occupation,location,notes,created_by)
                            VALUES (:name,:phone,:email,:gender,:marital_status,:religion,
                            :nationality,:occupation,:location,:notes,:by) RETURNING id';
                    $st = $conn->prepare($sql);
                    $st->execute($vals + [':by' => $email]);
                    $id = (int)$st->fetchColumn();
                }
                log_audit_event($conn, $email, $id > 0 ? 'update' : 'create', 'customer', "Saved customer $name");
                echo json_encode(["success" => true, "id" => $id]);
            }
        }
        elseif ($action === 'delete_customer') {
            $email = require_manager_email();
            $id = (int)($_POST['id'] ?? 0);
            $conn->prepare('DELETE FROM customers WHERE id = :i')->execute([':i' => $id]);
            log_audit_event($conn, $email, 'delete', 'customer', "Deleted customer #$id");
            echo json_encode(["success" => true]);
        }
        elseif ($action === 'save_invoice') {
            // Create or update. Items are replaced wholesale inside a
            // transaction: an invoice with half its lines saved would be worse
            // than one that failed outright.
            $email = require_manager_email();

            $id        = isset($_POST['id']) && $_POST['id'] !== '' ? (int)$_POST['id'] : 0;
            $invoiceNo = trim($_POST['invoice_no'] ?? '');
            $client    = trim($_POST['client_name'] ?? '');
            $itemsJson = $_POST['items'] ?? '[]';
            $items     = json_decode($itemsJson, true);

            if ($invoiceNo === '' || $client === '') {
                http_response_code(400);
                echo json_encode(["error" => "An invoice number and a client name are required."]);
            } elseif (!is_array($items)) {
                http_response_code(400);
                echo json_encode(["error" => "Line items were malformed."]);
            } else {
                $fields = [
                    ':no'   => $invoiceNo,
                    ':date' => trim($_POST['invoice_date'] ?? '') ?: date('Y-m-d'),
                    ':name' => $client,
                    ':addr' => trim($_POST['client_address'] ?? ''),
                    ':ph'   => trim($_POST['client_phone'] ?? ''),
                    ':subj' => trim($_POST['subject'] ?? ''),
                    ':mode' => trim($_POST['mode'] ?? ''),
                    ':bl'   => trim($_POST['bl_no'] ?? ''),
                    ':cons' => trim($_POST['consolidation'] ?? ''),
                    ':vat'  => (float)($_POST['vat_rate'] ?? 20),
                    ':dep'  => (float)($_POST['deposit'] ?? 0),
                    ':st'   => trim($_POST['status'] ?? 'Draft'),
                    ':notes'=> trim($_POST['notes'] ?? ''),
                ];

                try {
                    $conn->beginTransaction();

                    if ($id > 0) {
                        $sql = 'UPDATE invoices SET invoice_no=:no, invoice_date=:date, client_name=:name,
                                client_address=:addr, client_phone=:ph, subject=:subj, mode=:mode, bl_no=:bl,
                                consolidation=:cons, vat_rate=:vat, deposit=:dep, status=:st, notes=:notes,
                                updated_by=:by, updated_at=CURRENT_TIMESTAMP WHERE id=:id';
                        $stmt = $conn->prepare($sql);
                        $stmt->execute($fields + [':by' => $email, ':id' => $id]);
                    } else {
                        $sql = 'INSERT INTO invoices (invoice_no, invoice_date, client_name, client_address,
                                client_phone, subject, mode, bl_no, consolidation, vat_rate, deposit, status,
                                notes, created_by)
                                VALUES (:no,:date,:name,:addr,:ph,:subj,:mode,:bl,:cons,:vat,:dep,:st,:notes,:by)
                                RETURNING id';
                        $stmt = $conn->prepare($sql);
                        $stmt->execute($fields + [':by' => $email]);
                        $id = (int)$stmt->fetchColumn();
                    }

                    $conn->prepare('DELETE FROM invoice_items WHERE invoice_id = :i')->execute([':i' => $id]);
                    $ins = $conn->prepare('INSERT INTO invoice_items (invoice_id, section, description, qty, rate, sort_order)
                                           VALUES (:i,:s,:d,:q,:r,:o)');
                    $order = 0;
                    foreach ($items as $it) {
                        $desc = trim((string)($it['description'] ?? ''));
                        if ($desc === '') { continue; }   // skip blank template rows
                        $ins->execute([
                            ':i' => $id,
                            ':s' => (int)($it['section'] ?? 1) === 2 ? 2 : 1,
                            ':d' => $desc,
                            ':q' => $it['qty'] === '' || $it['qty'] === null ? null : (float)$it['qty'],
                            ':r' => $it['rate'] === '' || $it['rate'] === null ? null : (float)$it['rate'],
                            ':o' => $order++,
                        ]);
                    }

                    $conn->commit();
                    log_audit_event($conn, $email, $id > 0 ? 'update' : 'create', 'invoice',
                        "Saved invoice $invoiceNo for $client");
                    echo json_encode(["success" => true, "id" => $id]);
                } catch (PDOException $e) {
                    if ($conn->inTransaction()) { $conn->rollBack(); }
                    http_response_code(400);
                    $msg = strpos($e->getMessage(), 'invoices_invoice_no_key') !== false
                        ? "Invoice number $invoiceNo already exists."
                        : $e->getMessage();
                    echo json_encode(["error" => $msg]);
                }
            }
        }
        elseif ($action === 'delete_invoice') {
            $email = require_manager_email();
            $id = (int)($_POST['id'] ?? 0);
            $stmt = $conn->prepare('DELETE FROM invoices WHERE id = :i');
            $stmt->execute([':i' => $id]);
            log_audit_event($conn, $email, 'delete', 'invoice', "Deleted invoice #$id");
            echo json_encode(["success" => true]);
        }
        elseif ($action === 'update_my_profile') {
            // Self-service: a staffer editing their OWN contact details. Name,
            // role, salary and status are deliberately not editable here — those
            // stay with the manager. The two fixed accounts have no employees
            // row, so there is nothing to update.
            $email = require_authenticated_email();
            if ($email === strtolower(MANAGER_EMAIL) || $email === strtolower(FINANCE_EMAIL)) {
                http_response_code(400);
                echo json_encode(["error" => "The manager and finance accounts are configured on the server and cannot be edited here."]);
            } else {
                $phone = trim($_POST['phone'] ?? '');
                $stmt = $conn->prepare('UPDATE employees SET phone = :p WHERE LOWER(email) = :e');
                $stmt->execute([':p' => $phone, ':e' => $email]);
                if ($stmt->rowCount() === 0) {
                    http_response_code(404);
                    echo json_encode(["error" => "No staff record found for this account."]);
                } else {
                    log_audit_event($conn, $email, 'update', 'employee', 'Updated their own contact details');
                    echo json_encode(["success" => true]);
                }
            }
        }
        elseif ($action === 'change_my_password') {
            // Self-service password change. Requires the CURRENT password, so a
            // borrowed session cannot silently lock the real owner out.
            $email = require_authenticated_email();
            if ($email === strtolower(MANAGER_EMAIL) || $email === strtolower(FINANCE_EMAIL)) {
                http_response_code(400);
                echo json_encode(["error" => "The manager and finance passwords are set on the server (auth_config.php) and cannot be changed here."]);
            } else {
                $current = (string)($_POST['current_password'] ?? '');
                $next    = (string)($_POST['new_password'] ?? '');

                $check = validate_portal_password($next);
                if ($check !== true) {
                    http_response_code(400);
                    echo json_encode(["error" => $check]);
                } else {
                    $stmt = $conn->prepare('SELECT password_hash FROM employees WHERE LOWER(email) = :e LIMIT 1');
                    $stmt->execute([':e' => $email]);
                    $row = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$row || empty($row['password_hash']) || !password_verify($current, $row['password_hash'])) {
                        http_response_code(403);
                        echo json_encode(["error" => "Your current password is not correct."]);
                    } else {
                        $hash = password_hash($next, PASSWORD_DEFAULT);
                        $upd = $conn->prepare('UPDATE employees SET password_hash = :h WHERE LOWER(email) = :e');
                        $upd->execute([':h' => $hash, ':e' => $email]);
                        log_audit_event($conn, $email, 'update', 'employee', 'Changed their own portal password');
                        echo json_encode(["success" => true]);
                    }
                }
            }
        }
        elseif ($action === 'add_employee') {
            $actorEmail = require_manager_email();
            $name = trim($_POST['name'] ?? '');
            $email = trim(strtolower($_POST['email'] ?? ''));
            $phone = trim($_POST['phone'] ?? '');
            $role = trim($_POST['role'] ?? 'Agent');
            $salary = (float)($_POST['base_salary'] ?? 0.00);
            $password = (string)($_POST['password'] ?? '');

            if (empty($name) || empty($email) || empty($password)) {
                echo json_encode(["error" => "Employee name, email, and login password are mandatory fields."]);
                exit();
            }

            // Enforce the password policy before creating anything, so we
            // never end up with a staff record whose login can't be used.
            $pwCheck = validate_portal_password($password);
            if ($pwCheck !== true) {
                echo json_encode(["error" => $pwCheck]);
                exit();
            }

            // The UNIQUE constraint on employees.email is what actually prevents
            // duplicates; catch it below to return a friendly message.
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);

            try {
                $stmt = $conn->prepare("INSERT INTO employees (name, email, phone, role, base_salary, password_hash) VALUES (:name, :email, :phone, :role, :salary, :password_hash)");
                $stmt->execute([
                    ':name' => $name,
                    ':email' => $email,
                    ':phone' => $phone,
                    ':role' => $role,
                    ':salary' => $salary,
                    ':password_hash' => $passwordHash
                ]);
            } catch (PDOException $e) {
                // 23505 = PostgreSQL unique_violation; 23000 = MySQL's generic
                // integrity-constraint code (kept for portability).
                if ($e->getCode() === '23505' || $e->getCode() === '23000') {
                    echo json_encode(["error" => "An account with this email already exists."]);
                    exit();
                }
                throw $e;
            }
            log_audit_event($conn, $actorEmail, 'create', 'employee', "Added employee $name ($email) as $role, with portal login credentials");
            echo json_encode(["success" => true, "message" => "New staff member added and login credentials created successfully."]);
        }
        elseif ($action === 'add_transaction') {
            $actorEmail = require_finance_email();
            $type = $_POST['type'] ?? 'Income';
            $amount = (float)($_POST['amount'] ?? 0);
            $category = trim($_POST['category'] ?? 'Miscellaneous');
            $reference_no = trim($_POST['reference_no'] ?? '');   // "Invoice/Receipt Number"
            $bill_of_lading = trim($_POST['bill_of_lading'] ?? '');
            $identification_no = trim($_POST['identification_no'] ?? '');
            $notes = trim($_POST['notes'] ?? '');
            if ($amount <= 0) {
                echo json_encode(["error" => "Transaction amount must be greater than zero."]);
                exit();
            }

            // Read any attached files into memory BEFORE we touch the DB, so a
            // bad upload fails the whole request cleanly instead of leaving a
            // half-saved entry. The bytes are stored in the DB (transaction_files),
            // NOT on disk: the production host (Vercel container) has a read-only,
            // ephemeral filesystem, so move_uploaded_file() silently loses every
            // attachment. Base64 keeps the payload safe through PDO's emulated
            // prepares.
            $pendingFiles = [];
            if (isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
                $totalFilesCount = count($_FILES['files']['name']);
                for ($i = 0; $i < $totalFilesCount; $i++) {
                    $err = $_FILES['files']['error'][$i];
                    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
                        echo json_encode(["error" => "One of the attached files is too large. Please attach files under 4 MB."]);
                        exit();
                    }
                    if ($err !== UPLOAD_ERR_OK) { continue; }  // skip empty slots

                    $bytes = @file_get_contents($_FILES['files']['tmp_name'][$i]);
                    if ($bytes === false) { continue; }

                    $originalName = basename($_FILES['files']['name'][$i]);
                    if ($originalName === '') { $originalName = 'attachment'; }
                    $pendingFiles[] = [
                        'name' => mb_substr($originalName, 0, 255),
                        'mime' => $_FILES['files']['type'][$i] ?: 'application/octet-stream',
                        'size' => strlen($bytes),
                        'data' => base64_encode($bytes),
                    ];
                }
            }

            // Insert the ledger row and its attachments atomically.
            $conn->beginTransaction();
            try {
                $stmt = $conn->prepare("INSERT INTO transactions (type, amount, category, reference_no, bill_of_lading, identification_no, notes, file_path) VALUES (:type, :amount, :category, :ref, :bol, :ident, :notes, NULL) RETURNING id");
                $stmt->execute([
                    ':type' => $type,
                    ':amount' => $amount,
                    ':category' => $category,
                    ':ref' => !empty($reference_no) ? $reference_no : null,
                    ':bol' => !empty($bill_of_lading) ? $bill_of_lading : null,
                    ':ident' => !empty($identification_no) ? $identification_no : null,
                    ':notes' => !empty($notes) ? $notes : null,
                ]);
                $txId = (int)$stmt->fetchColumn();

                if (!empty($pendingFiles)) {
                    $fstmt = $conn->prepare("INSERT INTO transaction_files (transaction_id, file_name, mime_type, file_size, file_data) VALUES (:tx, :name, :mime, :size, :data)");
                    foreach ($pendingFiles as $pf) {
                        $fstmt->execute([
                            ':tx' => $txId,
                            ':name' => $pf['name'],
                            ':mime' => $pf['mime'],
                            ':size' => $pf['size'],
                            ':data' => $pf['data'],
                        ]);
                    }
                }
                $conn->commit();
            } catch (Exception $e) {
                if ($conn->inTransaction()) { $conn->rollBack(); }
                throw $e;
            }

            $fileCount = count($pendingFiles);
            log_audit_event($conn, $actorEmail, 'create', 'transaction', "Logged $type transaction: $category (GH₵" . number_format($amount, 2) . ")");
            echo json_encode(["success" => true, "message" => $fileCount > 0 ? "Financial entry added with $fileCount attachment(s)." : "Financial entry added to ledger."]);
        }
        elseif ($action === 'update_employee') {
            $actorEmail = require_manager_email();
            $empId = (int)($_POST['employee_id'] ?? 0);
            $name = trim($_POST['name'] ?? '');
            $email = trim(strtolower($_POST['email'] ?? ''));
            $phone = trim($_POST['phone'] ?? ''); 
            $role = trim($_POST['role'] ?? 'Agent');
            $salary = (float)($_POST['base_salary'] ?? 0.00);

            if (empty($name) || empty($email)) {
                echo json_encode(["error" => "Name and email cannot be blank during modifications."]);
                exit();
            }

            // Optional password reset. With Firebase gone there's no
            // self-service "forgot password" email flow, so the manager resets a
            // staffer's password here by sending a non-empty `password` field.
            // Left blank, the existing password hash is untouched.
            $newPassword = (string)($_POST['password'] ?? '');
            $resetPassword = $newPassword !== '';
            if ($resetPassword) {
                $pwCheck = validate_portal_password($newPassword);
                if ($pwCheck !== true) {
                    echo json_encode(["error" => $pwCheck]);
                    exit();
                }
            }

            if ($resetPassword) {
                $stmt = $conn->prepare("UPDATE employees SET name = :name, email = :email, phone = :phone, role = :role, base_salary = :salary, password_hash = :password_hash WHERE id = :id");
                $stmt->execute([
                    ':name' => $name,
                    ':email' => $email,
                    ':phone' => $phone,
                    ':role' => $role,
                    ':salary' => $salary,
                    ':password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
                    ':id' => $empId
                ]);
            } else {
                $stmt = $conn->prepare("UPDATE employees SET name = :name, email = :email, phone = :phone, role = :role, base_salary = :salary WHERE id = :id");
                $stmt->execute([
                    ':name' => $name,
                    ':email' => $email,
                    ':phone' => $phone,
                    ':role' => $role,
                    ':salary' => $salary,
                    ':id' => $empId
                ]);
            }
            log_audit_event($conn, $actorEmail, 'update', 'employee', "Updated employee #$empId ($name)" . ($resetPassword ? " (password reset)" : ""));
            echo json_encode(["success" => true, "message" => "Employee profile changes successfully committed."]);
        }
        elseif ($action === 'delete_employee') {
            $actorEmail = require_manager_email();
            $empId = (int)($_POST['employee_id'] ?? 0);
            $empLookup = $conn->prepare("SELECT name FROM employees WHERE id = :id");
            $empLookup->execute([':id' => $empId]);
            $empName = $empLookup->fetchColumn() ?: "#$empId";
            $stmt = $conn->prepare("DELETE FROM employees WHERE id = :id");
            $stmt->execute([':id' => $empId]);
            log_audit_event($conn, $actorEmail, 'delete', 'employee', "Deleted employee $empName");
            echo json_encode(["success" => true, "message" => "Staff credentials dropped and revoked from database."]);
        }
        //NEW: UPDATE TRANSACTION ROUTE HANDLER (Fixes React Dashboard Error!)
        elseif ($action === 'update_transaction') {
            $actorEmail = require_finance_email();
            $txId = (int)($_POST['transaction_id'] ?? 0);
            $category = trim($_POST['category'] ?? '');
            $reference_no = trim($_POST['reference_no'] ?? '');   // "Invoice/Receipt Number"
            $bill_of_lading = trim($_POST['bill_of_lading'] ?? '');
            $identification_no = trim($_POST['identification_no'] ?? '');
            $type = trim($_POST['type'] ?? 'Income');
            $amount = (float)($_POST['amount'] ?? 0.00);

            if ($txId <= 0 || empty($category)) {
                echo json_encode(["error" => "Invalid entry lines or category field data structure missing."]);
                exit();
            }

            $stmt = $conn->prepare("UPDATE transactions SET category = :category, reference_no = :ref, bill_of_lading = :bol, identification_no = :ident, type = :type, amount = :amount WHERE id = :id");
            $stmt->execute([
                ':category' => $category,
                ':ref' => !empty($reference_no) ? $reference_no : null,
                ':bol' => !empty($bill_of_lading) ? $bill_of_lading : null,
                ':ident' => !empty($identification_no) ? $identification_no : null,
                ':type' => $type,
                ':amount' => $amount,
                ':id' => $txId
            ]);
            log_audit_event($conn, $actorEmail, 'update', 'transaction', "Updated transaction #$txId ($category)");
            echo json_encode(["success" => true, "message" => "Ledger transaction line updated successfully!"]);
        }
        // NEW: DELETE TRANSACTION ROUTE HANDLER
        elseif ($action === 'delete_transaction') {
            $actorEmail = require_finance_email();
            $txId = (int)($_POST['transaction_id'] ?? 0);
            $stmt = $conn->prepare("DELETE FROM transactions WHERE id = :id");
            $stmt->execute([':id' => $txId]);
            log_audit_event($conn, $actorEmail, 'delete', 'transaction', "Deleted transaction #$txId");
            echo json_encode(["success" => true, "message" => "Transaction registry entry completely dropped from system ledger."]);
        }
        elseif ($action === 'disburse_salary') {
            $actorEmail = require_manager_email();
            $empId = (int)($_POST['employee_id'] ?? 0);
            
            $stmt = $conn->prepare("SELECT name, base_salary FROM employees WHERE id = :id");
            $stmt->execute([':id' => $empId]);
            $emp = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$emp) {
                echo json_encode(["error" => "Employee record not found."]);
                exit();
            }

            $conn->beginTransaction();
            
            $updateStmt = $conn->prepare("UPDATE employees SET status = 'Paid (Current Month)' WHERE id = :id");
            $updateStmt->execute([':id' => $empId]);
            
            $txStmt = $conn->prepare("INSERT INTO transactions (type, amount, category, notes) VALUES ('Expense', :amount, 'Staff Payroll Distribution', :notes)");
            $txStmt->execute([
                ':amount' => $emp['base_salary'],
                ':notes' => "Automated salary disburse payout processed for " . $emp['name'] . " (GH₵ " . $emp['base_salary'] . ")"
            ]);
            
            $conn->commit();
            log_audit_event($conn, $actorEmail, 'disburse', 'employee', "Disbursed salary of GH₵" . number_format($emp['base_salary'], 2) . " to " . $emp['name']);
            echo json_encode(["success" => true, "message" => "Payroll issued and financial books auto-deducted for " . $emp['name']]);
        }
        elseif ($action === 'update_shipment') {
            $actorEmail = require_manager_email();
            $shipId = (int)($_POST['shipment_id'] ?? 0);
            $containerNo = strtoupper(trim($_POST['container_number'] ?? ''));
            $clientName = trim($_POST['client_name'] ?? '');
            $status = trim($_POST['status'] ?? 'Pending Customs Review');
            $origin = trim($_POST['origin'] ?? '');
            $destination = trim($_POST['destination'] ?? '');
            $notes = trim($_POST['notes'] ?? '');

            if ($shipId <= 0 || empty($containerNo) || empty($clientName)) {
                echo json_encode(["error" => "Mandatory identification fields missing."]);
                exit();
            }

            // Read any newly-attached documents BEFORE touching the DB so an
            // oversized file fails cleanly. New files are APPENDED to the
            // shipment's existing manifest (stored in shipment_files in the DB,
            // not on Vercel's read-only disk) — editing never drops old docs.
            try {
                $pendingFiles = read_uploaded_files('manifest_files');
            } catch (RuntimeException $e) {
                echo json_encode(["error" => $e->getMessage()]);
                exit();
            }

            $conn->beginTransaction();
            try {
                $stmt = $conn->prepare('UPDATE shipments SET "containerNo" = :containerNo, "clientName" = :clientName, status = :status, origin = :origin, destination = :destination, notes = :notes, edited_by = :editedBy, edited_at = NOW() WHERE id = :id');
                $stmt->execute([
                    ':containerNo' => $containerNo,
                    ':clientName' => $clientName,
                    ':status' => $status,
                    ':origin' => $origin,
                    ':destination' => $destination,
                    ':notes' => $notes,
                    ':editedBy' => $actorEmail,
                    ':id' => $shipId
                ]);
                insert_owned_files($conn, 'shipment_files', 'shipment_id', $shipId, $pendingFiles);
                $conn->commit();
            } catch (Exception $e) {
                if ($conn->inTransaction()) { $conn->rollBack(); }
                throw $e;
            }

            $addedCount = count($pendingFiles);
            log_audit_event($conn, $actorEmail, 'update', 'shipment', "Updated shipment #$shipId ($containerNo)" . ($addedCount > 0 ? " (+$addedCount document(s))" : ""));
            echo json_encode(["success" => true, "message" => "Shipment record updated successfully." . ($addedCount > 0 ? " $addedCount document(s) added." : "")]);
        }
        elseif ($action === 'approve_shipment') {
            $actorEmail = require_manager_email();
            $shipId = (int)($_POST['shipment_id'] ?? 0);
            // Approval is tracked separately from the clearance operations status
            // so approving a shipment no longer overwrites/loses its real status
            // (e.g. "Duty Paid", "Vessel Yet To Arrive") — finance and the manager
            // both need to see that actual status even after approval.
            $stmt = $conn->prepare("UPDATE shipments SET approved = 1, approved_at = NOW() WHERE id = :id");
            $stmt->execute([':id' => $shipId]);
            log_audit_event($conn, $actorEmail, 'approve', 'shipment', "Approved shipment #$shipId");
            echo json_encode(["success" => true, "message" => "Shipment layout cleared & marked approved."]);
        }
        elseif ($action === 'delete_shipment') {
            $actorEmail = require_manager_email();
            $shipId = (int)($_POST['shipment_id'] ?? 0);
            $stmt = $conn->prepare("DELETE FROM shipments WHERE id = :id");
            $stmt->execute([':id' => $shipId]);
            log_audit_event($conn, $actorEmail, 'delete', 'shipment', "Deleted shipment #$shipId");
            echo json_encode(["success" => true, "message" => "Shipment entry permanently erased from database."]);
        }
        // Handle agent shipment logging (submitted from React dashboard)
        elseif ($action === 'log_shipment') {
            // The authenticated email is the source of truth for who logged
            // this shipment — never trust the client-submitted agent_email,
            // or one agent could log shipments under another agent's name.
            $actorEmail = require_authenticated_email();
            $updatedBy = $actorEmail;
            $loggedOnBehalf = false;

            // Exception: the manager may submit on behalf of a specific agent
            // (via "Viewing as" on the field dashboard) so it correctly shows
            // up in that agent's own manifest. Only the manager gets this
            // override, and only for a real employee email — never an
            // arbitrary client-supplied value.
            if ($actorEmail === strtolower(MANAGER_EMAIL)) {
                $requestedAgentEmail = trim(strtolower($_POST['agent_email'] ?? ''));
                if (!empty($requestedAgentEmail) && $requestedAgentEmail !== $actorEmail) {
                    $empCheck = $conn->prepare("SELECT 1 FROM employees WHERE email = :email LIMIT 1");
                    $empCheck->execute([':email' => $requestedAgentEmail]);
                    if ($empCheck->fetch()) {
                        $updatedBy = $requestedAgentEmail;
                        $loggedOnBehalf = true;
                    }
                }
            }

            // Collect text fields matching the React form keys
            $containerNo = strtoupper(trim($_POST['container_number'] ?? ''));
            $clientName = trim($_POST['client_name'] ?? '');
            $status = trim($_POST['status'] ?? 'Pending Customs Review');
            $origin = trim($_POST['origin'] ?? '');
            $destination = trim($_POST['destination'] ?? '');
            $notes = trim($_POST['notes'] ?? '');

            if (empty($containerNo) || empty($clientName)) {
                echo json_encode(["error" => "Mandatory identification fields missing."]);
                exit();
            }

            // Manifest files are stored in the DB (shipment_files), NOT on disk —
            // the Vercel container FS is read-only/ephemeral. Read them BEFORE
            // touching the DB so an oversized file fails cleanly.
            try {
                $pendingFiles = read_uploaded_files('manifest_files');
            } catch (RuntimeException $e) {
                echo json_encode(["error" => $e->getMessage()]);
                exit();
            }

            // When the manager logs this on an agent's behalf, stamp edited_by/
            // edited_at immediately — reuses the same "Edited by..." tooltip
            // the UI already shows, so accountability for who physically
            // entered it is never lost even though updatedBy is the agent.
            // Row + attachments are committed atomically.
            $conn->beginTransaction();
            try {
                $stmt = $conn->prepare('INSERT INTO shipments ("containerNo", "clientName", status, origin, destination, notes, "updatedBy", "timestamp", edited_by, edited_at) VALUES (:containerNo, :clientName, :status, :origin, :destination, :notes, :updatedBy, NOW(), :editedBy, ' . ($loggedOnBehalf ? "NOW()" : "NULL") . ') RETURNING id');
                $stmt->execute([
                    ':containerNo' => $containerNo,
                    ':clientName' => $clientName,
                    ':status' => $status,
                    ':origin' => $origin,
                    ':destination' => $destination,
                    ':notes' => $notes,
                    ':updatedBy' => $updatedBy,
                    ':editedBy' => $loggedOnBehalf ? $actorEmail : null
                ]);
                $shipId = (int)$stmt->fetchColumn();
                insert_owned_files($conn, 'shipment_files', 'shipment_id', $shipId, $pendingFiles);
                $conn->commit();
            } catch (Exception $e) {
                if ($conn->inTransaction()) { $conn->rollBack(); }
                throw $e;
            }

            $auditDescription = $loggedOnBehalf
                ? "Logged shipment $containerNo for $clientName on behalf of $updatedBy"
                : "Logged shipment $containerNo for $clientName";
            log_audit_event($conn, $actorEmail, 'create', 'shipment', $auditDescription);
            echo json_encode(["success" => true, "message" => "Shipment logged successfully."]);
        }
        // Day-to-day clearance progress updates — available to any authenticated
        // staff member (not just the manager), but only once the manager has
        // approved the shipment. Comments and file attachments are appended,
        // never overwritten, so the full history stays intact.
        elseif ($action === 'update_shipment_progress') {
            $actorEmail = require_authenticated_email();
            $shipId = (int)($_POST['shipment_id'] ?? 0);

            $lookup = $conn->prepare('SELECT notes, approved FROM shipments WHERE id = :id');
            $lookup->execute([':id' => $shipId]);
            $existing = $lookup->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                echo json_encode(["error" => "Shipment not found."]);
                exit();
            }
            if ((int)$existing['approved'] !== 1) {
                echo json_encode(["error" => "This shipment must be approved by the manager before its status can be updated."]);
                exit();
            }

            $newStatus = trim($_POST['status'] ?? '');
            $comment = trim($_POST['comment'] ?? '');

            if (empty($newStatus)) {
                echo json_encode(["error" => "Status is required."]);
                exit();
            }

            // Append the comment as a timestamped, attributed entry rather
            // than overwriting whatever notes are already there.
            $notes = $existing['notes'] ?? '';
            if (!empty($comment)) {
                $entry = "[" . date('Y-m-d H:i') . "] $actorEmail: $comment";
                $notes = trim($notes) !== '' ? $notes . "\n\n" . $entry : $entry;
            }

            // New manifest files are appended as additional shipment_files rows
            // (stored in the DB, not on the ephemeral disk). Read before writing.
            try {
                $pendingFiles = read_uploaded_files('manifest_files');
            } catch (RuntimeException $e) {
                echo json_encode(["error" => $e->getMessage()]);
                exit();
            }

            $conn->beginTransaction();
            try {
                $stmt = $conn->prepare('UPDATE shipments SET status = :status, notes = :notes, edited_by = :editedBy, edited_at = NOW() WHERE id = :id');
                $stmt->execute([
                    ':status' => $newStatus,
                    ':notes' => $notes,
                    ':editedBy' => $actorEmail,
                    ':id' => $shipId
                ]);
                insert_owned_files($conn, 'shipment_files', 'shipment_id', $shipId, $pendingFiles);
                $conn->commit();
            } catch (Exception $e) {
                if ($conn->inTransaction()) { $conn->rollBack(); }
                throw $e;
            }

            $auditDescription = "Updated shipment #$shipId status to \"$newStatus\"" . (!empty($comment) ? " with a comment" : "") . (!empty($pendingFiles) ? " and new attachment(s)" : "");
            log_audit_event($conn, $actorEmail, 'update', 'shipment', $auditDescription);
            echo json_encode(["success" => true, "message" => "Shipment progress updated successfully."]);
        }
        else {
            echo json_encode(["error" => "Unknown POST action: " . $action]);
        }
    } catch(Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(["error" => "Action Failure: " . $e->getMessage()]);
    }
}
?>