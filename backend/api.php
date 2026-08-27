<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cors.php';
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/auth_guard.php';
require_once __DIR__ . '/db.php';
$conn = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

//READ PIPELINE: Return logged cargo
if ($method === 'GET') {
    try {
        $authedEmail = require_authenticated_email();

        //ACCOUNT ISOLATION CHECK: If agent_email is passed, only return their logs
        $agentEmail = isset($_GET['agent_email']) ? strtolower(trim($_GET['agent_email'])) : '';

        if (!empty($agentEmail)) {
            if ($authedEmail !== strtolower(MANAGER_EMAIL) && $agentEmail !== $authedEmail) {
                auth_fail(403, "You may only view your own shipment log.");
            }
            $stmt = $conn->prepare('SELECT * FROM shipments WHERE "updatedBy" = :agentEmail ORDER BY "timestamp" DESC');
            $stmt->execute([':agentEmail' => $agentEmail]);
        } else {
            // Otherwise, get everything (for manager panels)
            require_manager_email();
            $stmt = $conn->prepare('SELECT * FROM shipments ORDER BY "timestamp" DESC');
            $stmt->execute();
        }

        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
    } catch(PDOException $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
}

// WRITE PIPELINE: Process incoming cargo forms
if ($method === 'POST') {
    // The authenticated email is the source of truth for who logged this
    // shipment — never trust the client-submitted agent_email.
    $updatedBy = require_authenticated_email();

    // Collect regular text fields from standard data payload
    $containerNo = strtoupper(trim($_POST['container_number'] ?? '')); // Matches React state keys
    $clientName = trim($_POST['client_name'] ?? '');
    $status = trim($_POST['status'] ?? 'Pending Customs Review');
    $origin = trim($_POST['origin'] ?? '');             //Added Origin Field
    $destination = trim($_POST['destination'] ?? '');     //Added Destination Field
    $notes = trim($_POST['notes'] ?? 'No supplementary manifest text added.');
    // Classification the quarterly report groups by. Whitelisted rather than
    // trusted, so a crafted POST cannot slip an unknown regime past the CHECK
    // constraint and fail the insert.
    $allowedRegimes = ['Import','Export','Warehousing','Transit','Freezones'];
    $allowedConsign = ['Vehicles','General Goods'];
    $regime = trim($_POST['regime'] ?? '');
    $consignment = trim($_POST['consignment_type'] ?? '');
    $customerId = isset($_POST['customer_id']) && $_POST['customer_id'] !== '' ? (int)$_POST['customer_id'] : null;
    $regime = in_array($regime, $allowedRegimes, true) ? $regime : null;
    $consignment = in_array($consignment, $allowedConsign, true) ? $consignment : null;

    if (empty($containerNo) || empty($clientName)) {
        echo json_encode(["error" => "Mandatory identification fields missing."]);
        exit();
    }

    $fileNamesArray = [];
    $fileUrlsArray = [];

    // UPGRADED: Handle multiple files loop seamlessly
    if (isset($_FILES['manifest_files']) && is_array($_FILES['manifest_files']['name'])) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true); 
        }

        $totalFiles = count($_FILES['manifest_files']['name']);
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $baseUrl = $protocol . $_SERVER['HTTP_HOST'] . '/backend/';

        for ($i = 0; $i < $totalFiles; $i++) {
            if ($_FILES['manifest_files']['error'][$i] === UPLOAD_ERR_OK) {
                $originalName = basename($_FILES['manifest_files']['name'][$i]);
                $cleanName = time() . '_' . $i . '_' . preg_replace("/[^a-zA-Z0-9\._-]/", "_", $originalName);
                $targetFilePath = $uploadDir . $cleanName;

                if (move_uploaded_file($_FILES['manifest_files']['tmp_name'][$i], $targetFilePath)) {
                    $fileNamesArray[] = $originalName;
                    $fileUrlsArray[] = $targetFilePath; // Store text paths to stay compatible with React mapping rows
                }
            }
        }
    }

    // Flatten lists back into strings using simple comma separators to preserve your column schemas
    $finalFileNames = !empty($fileNamesArray) ? implode(',', $fileNamesArray) : null;
    $finalFileUrls  = !empty($fileUrlsArray) ? implode(',', $fileUrlsArray) : null;

    try {
        // Included structural additions inside the insert map execution
        $sql = 'INSERT INTO shipments ("containerNo", "clientName", status, origin, destination, notes, "fileName", "fileUrl", "updatedBy", regime, consignment_type, customer_id, "timestamp")
                VALUES (:containerNo, :clientName, :status, :origin, :destination, :notes, :fileName, :fileUrl, :updatedBy, :regime, :consignment, :customerId, NOW())';
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':customerId'   => $customerId,
            ':regime'       => $regime,
            ':consignment'  => $consignment,
            ':containerNo'  => $containerNo,
            ':clientName'   => $clientName,
            ':status'       => $status,
            ':origin'       => $origin,
            ':destination'  => $destination,
            ':notes'        => $notes,
            ':fileName'     => $finalFileNames,
            ':fileUrl'      => $finalFileUrls,
            ':updatedBy'    => $updatedBy
        ]);

        echo json_encode(["success" => true, "message" => "Cargo logged down cleanly to your account profile."]);
    } catch(PDOException $e) {
        echo json_encode(["error" => "SQL Write failure: " . $e->getMessage()]);
    }
}
?>