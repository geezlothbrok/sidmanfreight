<?php
// Server-side gate for the staff API.
//
// The React app only *hides* dashboard UI based on login state — that's a
// client-side convenience, not security. Anyone who finds this endpoint's URL
// could otherwise call add_employee, disburse_salary, delete_shipment, etc.
// directly with curl/Postman.
//
// Auth model: email + password login issues a short-lived HS256 JWT (see
// jwt.php). The frontend sends that token in the Authorization header on every
// request; this file verifies it locally — no external identity provider, no
// per-request network call — then enforces the same role split the frontend
// uses. Passwords are stored hashed: the two fixed accounts (manager, finance)
// in auth_config.php, every other staffer in employees.password_hash.

require_once __DIR__ . '/config.php'; // JWT_SECRET, MANAGER/FINANCE creds, ALLOWED_ORIGIN, COOKIE_SAMESITE
require_once __DIR__ . '/jwt.php';

function auth_fail($httpCode, $message) {
    http_response_code($httpCode);
    echo json_encode(["error" => $message]);
    exit();
}

// Name of the HttpOnly session cookie the browser sends on every request.
define('AUTH_COOKIE', 'sidman_token');
// How long a session lasts (seconds). Used for both the JWT exp and the cookie.
define('AUTH_TTL', 43200); // 12 hours

// Returns the caller's JWT: the HttpOnly cookie for browsers, or an
// `Authorization: Bearer` header as a fallback for non-browser clients
// (curl, mobile, server-to-server). Returns null if neither is present.
function current_bearer_token() {
    if (!empty($_COOKIE[AUTH_COOKIE])) {
        return $_COOKIE[AUTH_COOKIE];
    }
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $m)) {
        return $m[1];
    }
    return null;
}

// True when the request came in over HTTPS (so the cookie's Secure flag is
// only set when it can actually be honored — local HTTP dev would drop a
// Secure cookie otherwise).
function request_is_https() {
    return (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? null) == 443)
        || (strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

// Resolves the cookie's SameSite policy from config. 'Lax' when the backend is
// a same-site subdomain of the frontend (api.sidmanfreightconsult.com) — first-party,
// most robust. 'None' when they're on different sites (*.onrender.com), which
// makes it a third-party cookie and REQUIRES Secure.
function cookie_samesite() {
    $v = (defined('COOKIE_SAMESITE') && COOKIE_SAMESITE !== '') ? COOKIE_SAMESITE : 'Lax';
    return (strcasecmp($v, 'None') === 0) ? 'None' : (strcasecmp($v, 'Strict') === 0 ? 'Strict' : 'Lax');
}

// Sets the HttpOnly session cookie holding the JWT. HttpOnly keeps it out of
// reach of JavaScript (XSS can't read it); SameSite limits cross-site sending
// (CSRF defense). SameSite=None is forced Secure (browsers require it).
function set_auth_cookie($token) {
    $samesite = cookie_samesite();
    setcookie(AUTH_COOKIE, $token, [
        'expires'  => time() + AUTH_TTL,
        'path'     => '/',
        'httponly' => true,
        'secure'   => request_is_https() || $samesite === 'None',
        'samesite' => $samesite,
    ]);
}

// Expires the session cookie (logout). Flags must match those used to set it.
function clear_auth_cookie() {
    $samesite = cookie_samesite();
    setcookie(AUTH_COOKIE, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'secure'   => request_is_https() || $samesite === 'None',
        'samesite' => $samesite,
    ]);
}

// Maps a verified email to its portal role. Manager and finance are fixed;
// everyone else is a general Agent (the frontend routes all non-manager/finance
// staff to the same standard dashboard).
function role_for_email($email) {
    $email = strtolower(trim($email));
    if ($email === strtolower(MANAGER_EMAIL))  return 'Manager';
    if ($email === strtolower(FINANCE_EMAIL))  return 'Finance';
    return 'Agent';
}

// Checks a login attempt. Returns the caller's role on success, or false if the
// email is unknown / password wrong / portal access revoked. Used only by the
// `login` action — every other endpoint trusts the issued JWT instead.
function verify_portal_login($conn, $email, $password) {
    $email = strtolower(trim($email));

    if ($email === strtolower(MANAGER_EMAIL)) {
        return password_verify($password, MANAGER_PASSWORD_HASH) ? 'Manager' : false;
    }
    if ($email === strtolower(FINANCE_EMAIL)) {
        return password_verify($password, FINANCE_PASSWORD_HASH) ? 'Finance' : false;
    }

    // Regular staffer: must be an employees row with portal_access still on
    // AND a stored password hash. portal_access (not just row existence) is
    // what the manager toggles to cut off a departed staffer's login while
    // keeping their historical record.
    $stmt = $conn->prepare("SELECT password_hash FROM employees WHERE email = :email AND portal_access = 1 LIMIT 1");
    $stmt->execute([':email' => $email]);
    $row = $stmt->fetch();
    if (!$row || empty($row['password_hash']) || !password_verify($password, $row['password_hash'])) {
        return false;
    }
    return 'Agent';
}

// Basic password policy for accounts the manager creates. Returns true, or a
// human-readable error string.
function validate_portal_password($password) {
    if (strlen((string)$password) < 6) {
        return "Password must be at least 6 characters.";
    }
    return true;
}

// Verifies the bearer JWT and returns the caller's verified, lowercased email.
// Re-checks portal_access on every request so a revoked staffer is locked out
// immediately, even if their (still-unexpired) token is replayed.
function require_authenticated_email() {
    $token = current_bearer_token();
    if ($token === null) {
        auth_fail(401, "Missing session token. Please log in again.");
    }

    $payload = jwt_verify($token);
    if (!$payload || empty($payload['email'])) {
        auth_fail(401, "Invalid or expired session. Please log in again.");
    }

    $email = strtolower(trim($payload['email']));

    if ($email !== strtolower(MANAGER_EMAIL) && $email !== strtolower(FINANCE_EMAIL)) {
        global $conn;
        $stmt = $conn->prepare("SELECT 1 FROM employees WHERE email = :email AND portal_access = 1 LIMIT 1");
        $stmt->execute([':email' => $email]);
        if (!$stmt->fetch()) {
            auth_fail(403, "This account is not authorized to use the staff portal.");
        }
    }

    return $email;
}

function require_manager_email() {
    $email = require_authenticated_email();
    if ($email !== strtolower(MANAGER_EMAIL)) {
        auth_fail(403, "This action requires manager privileges.");
    }
    return $email;
}

function require_finance_email() {
    $email = require_authenticated_email();
    if ($email !== strtolower(MANAGER_EMAIL) && $email !== strtolower(FINANCE_EMAIL)) {
        auth_fail(403, "This action requires finance or manager privileges.");
    }
    return $email;
}

// Records a row in audit_log. Never allowed to break the caller's real
// action — a logging failure is swallowed, not surfaced.
function log_audit_event($conn, $actorEmail, $eventType, $entity, $description) {
    try {
        $stmt = $conn->prepare("INSERT INTO audit_log (actor_email, event_type, entity, description) VALUES (:actor, :type, :entity, :desc)");
        $stmt->execute([':actor' => $actorEmail, ':type' => $eventType, ':entity' => $entity, ':desc' => $description]);
    } catch (Exception $e) {
        // Intentionally ignored.
    }
}
