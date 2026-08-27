<?php
// Cross-origin CORS for the split deployment (frontend on Namecheap, backend on
// Render). Because the session lives in a cookie, requests are credentialed —
// which means we MUST echo the exact requesting origin (never "*" with
// credentials) and send Access-Control-Allow-Credentials: true. Allowed origins
// come from the ALLOWED_ORIGIN config (comma-separated). Requires config.php.

$__allowed = array_filter(array_map('trim', explode(',', ALLOWED_ORIGIN)));
$__origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($__origin !== '' && in_array($__origin, $__allowed, true)) {
    header("Access-Control-Allow-Origin: $__origin");
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
} elseif (in_array('*', $__allowed, true)) {
    // Wildcard is only meaningful for non-credentialed callers (e.g. anyone
    // hitting the public ?action=track endpoint from elsewhere).
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 86400");

// Answer the browser's preflight immediately, with the headers above attached.
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}
