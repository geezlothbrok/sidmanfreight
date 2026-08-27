<?php
// TEMPLATE — copy this file to `auth_config.php` (which is gitignored) and
// fill in real values. auth_config.php holds every secret the staff portal
// needs: the JWT signing key and the two fixed portal accounts.
//
// Generate the values with PHP on any machine:
//
//   JWT secret:      php -r "echo bin2hex(random_bytes(32));"
//   A password hash: php -r "echo password_hash('the-password', PASSWORD_DEFAULT);"
//
// The manager and finance logins are fixed, single-purpose accounts (they are
// NOT rows in the employees table). Every other staff login is an employees
// row whose password_hash is set when the manager adds them.

// Neon PostgreSQL connection URL (Neon dashboard → Connection Details).
//   postgresql://user:pass@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require
define('DATABASE_URL', 'REPLACE_WITH_NEON_CONNECTION_URL');

// Secret used to sign/verify JWT session tokens. Must be long and random.
// Rotating it invalidates every currently-issued token (forces re-login).
define('JWT_SECRET', 'REPLACE_WITH_A_LONG_RANDOM_STRING');

// Fixed manager account.
define('MANAGER_EMAIL', 'manager@sidmanfreightconsult.com');
define('MANAGER_PASSWORD_HASH', 'REPLACE_WITH_password_hash_OUTPUT');

// Fixed finance account.
define('FINANCE_EMAIL', 'finance@sidmanfreightconsult.com');
define('FINANCE_PASSWORD_HASH', 'REPLACE_WITH_password_hash_OUTPUT');

// Frontend origin(s) allowed to call this API with credentials (comma-separated).
//   e.g. https://sidmanfreightconsult.com,https://www.sidmanfreightconsult.com
define('ALLOWED_ORIGIN', 'https://sidmanfreightconsult.com');

// 'Lax'  if the backend is a same-site subdomain of the frontend
//        (e.g. api.sidmanfreightconsult.com) — recommended, first-party cookie.
// 'None' if the backend is on a different site (e.g. *.onrender.com) — makes the
//        session a third-party cookie (works, but browsers increasingly block
//        those; prefer the subdomain).
define('COOKIE_SAMESITE', 'Lax');

// Contact-form email (SMTP) — the website sends enquiries through its own
// mailbox, so there's no third-party email service. For Namecheap Private Email:
define('SMTP_HOST', 'mail.privateemail.com');
define('SMTP_PORT', '465');                 // 465 (SSL) or 587
define('SMTP_USER', 'info@sidmanfreightconsult.com');  // the mailbox
define('SMTP_PASS', 'REPLACE_WITH_MAILBOX_PASSWORD');
define('CONTACT_TO', 'info@sidmanfreightconsult.com'); // where enquiries land (defaults to SMTP_USER)

// NOTE: On the host (Vercel/Render), do NOT deploy this file. Set each value
// above (DATABASE_URL, JWT_SECRET, MANAGER_EMAIL, MANAGER_PASSWORD_HASH,
// FINANCE_EMAIL, FINANCE_PASSWORD_HASH, ALLOWED_ORIGIN, COOKIE_SAMESITE,
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO) as an environment
// variable in the dashboard — config.php reads them automatically.
