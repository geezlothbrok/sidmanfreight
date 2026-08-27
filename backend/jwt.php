<?php
// Minimal HS256 JWT implementation — no Composer / external library, so it
// works on the same shared hosting the rest of this backend targets. Only the
// small subset we actually need: sign a payload, and verify + decode one.
//
// The signing secret lives in auth_config.php (kept out of git). Tokens are
// short-lived (see jwt_issue's default TTL); there is no server-side session
// store, so "logging out" is purely a client-side token discard — which is
// why the TTL is kept modest.

if (!defined('JWT_SECRET')) {
    // auth_config.php is what defines JWT_SECRET. If it wasn't included first,
    // fail loudly rather than signing tokens with an empty/guessable key.
    http_response_code(500);
    echo json_encode(["error" => "Server auth is not configured (missing JWT secret)."]);
    exit();
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

// Signs $claims (e.g. ['email' => ..., 'role' => ...]) into a compact JWT.
// iat/exp are added automatically; default lifetime is 12 hours.
function jwt_issue(array $claims, $ttlSeconds = 43200) {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $now = time();
    $payload = array_merge($claims, ['iat' => $now, 'exp' => $now + $ttlSeconds]);

    $h = base64url_encode(json_encode($header));
    $p = base64url_encode(json_encode($payload));
    $sig = base64url_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));

    return "$h.$p.$sig";
}

// Verifies a token's signature and expiry. Returns the decoded payload array
// on success, or null on any failure (malformed, bad signature, expired).
// Callers must treat null as "not authenticated".
function jwt_verify($token) {
    $parts = explode('.', (string)$token);
    if (count($parts) !== 3) {
        return null;
    }
    list($h, $p, $sig) = $parts;

    $expected = base64url_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    // hash_equals: constant-time compare, so a wrong signature can't be
    // teased out one byte at a time via timing.
    if (!hash_equals($expected, $sig)) {
        return null;
    }

    $payload = json_decode(base64url_decode($p), true);
    if (!is_array($payload)) {
        return null;
    }
    if (isset($payload['exp']) && time() >= (int)$payload['exp']) {
        return null;
    }

    return $payload;
}
