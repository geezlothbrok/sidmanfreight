<?php
// Central config loader with two sources, in priority order:
//   1) Local dev  — the gitignored auth_config.php (literal define()s).
//   2) Deploy      — environment variables (Render, etc.), since auth_config.php
//                    is never committed/deployed.
// Whatever auth_config.php already defined wins; anything still undefined falls
// back to the matching environment variable.

$__local = __DIR__ . '/auth_config.php';
if (is_file($__local)) {
    require_once $__local;
}

// Every secret/config the backend needs. On Render, set each as an env var.
$__keys = [
    'DATABASE_URL',           // Neon PostgreSQL connection URL
    'JWT_SECRET',             // HS256 signing key
    'MANAGER_EMAIL',
    'MANAGER_PASSWORD_HASH',
    'FINANCE_EMAIL',
    'FINANCE_PASSWORD_HASH',
    'ALLOWED_ORIGIN',         // comma-separated frontend origins allowed via CORS
                              //   e.g. https://sidmanfreightconsult.com,https://www.sidmanfreightconsult.com
    'COOKIE_SAMESITE',        // 'Lax' if backend is a same-site subdomain of the
                              // frontend (api.sidmanfreightconsult.com); 'None' if the
                              // backend is on a different site (*.onrender.com).
    // Contact-form email (SMTP) — the site sends enquiries through its own mailbox.
    'SMTP_HOST',              // e.g. mail.privateemail.com (Namecheap Private Email)
    'SMTP_PORT',              // 465 (SSL) or 587
    'SMTP_USER',              // the mailbox, e.g. info@sidmanfreightconsult.com
    'SMTP_PASS',              // the mailbox password (SECRET)
    'CONTACT_TO',             // where enquiries are delivered (defaults to SMTP_USER)
];

foreach ($__keys as $__k) {
    if (!defined($__k)) {
        $__v = getenv($__k);
        if ($__v === false || $__v === '') {
            $__v = ($__k === 'COOKIE_SAMESITE') ? 'Lax' : '';
        }
        define($__k, $__v);
    }
}
