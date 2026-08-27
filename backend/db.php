<?php
// Single source of the database connection for both api.php and manager_api.php.
//
// Reads a PostgreSQL (Neon) connection URL from auth_config.php's DATABASE_URL
// and turns it into a PDO pgsql handle. Keeping the credential in the gitignored
// auth_config.php (not inline in the API files) means it never lands in git.
require_once __DIR__ . '/config.php';

function db_connect() {
    if (!defined('DATABASE_URL') || DATABASE_URL === '' || strpos(DATABASE_URL, 'REPLACE') !== false) {
        http_response_code(500);
        echo json_encode(["error" => "Database is not configured (missing DATABASE_URL in auth_config.php)."]);
        exit();
    }

    // Neon gives a URL like:
    //   postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
    $p = parse_url(DATABASE_URL);
    if ($p === false || empty($p['host']) || empty($p['path'])) {
        http_response_code(500);
        echo json_encode(["error" => "DATABASE_URL is malformed."]);
        exit();
    }

    $host = $p['host'];
    $port = $p['port'] ?? 5432;
    $dbname = ltrim($p['path'], '/');
    $user = isset($p['user']) ? urldecode($p['user']) : '';
    $pass = isset($p['pass']) ? urldecode($p['pass']) : '';

    // Neon requires TLS; honor sslmode from the URL, defaulting to require.
    parse_str($p['query'] ?? '', $q);
    $sslmode = $q['sslmode'] ?? 'require';

    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode";

    try {
        $conn = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Neon's pooled endpoint uses transaction pooling, where server-side
            // prepared statements don't persist reliably across pooled backends
            // (and stale cached plans survive DDL, causing "cached plan must not
            // change result type"). Emulated prepares send fully-escaped SQL each
            // time — safe against injection, and avoids the plan cache entirely.
            PDO::ATTR_EMULATE_PREPARES => true,
        ]);
        return $conn;
    } catch (PDOException $e) {
        http_response_code(502);
        echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
        exit();
    }
}
