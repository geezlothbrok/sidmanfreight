# Sidman Freight — backend & staff portal API

PHP API over PostgreSQL (Neon). Mirrors the architecture used on the Hota
Logistics project.

## Files

| File | Purpose |
| --- | --- |
| `config.php` | Loads secrets from `auth_config.php` locally, env vars in deploy |
| `auth_config.example.php` | Template — copy to `auth_config.php` and fill in |
| `db.php` | PDO connection to Neon |
| `jwt.php` | HS256 sign/verify for session tokens |
| `auth_guard.php` | Session cookie, `require_authenticated_email()`, role checks |
| `cors.php` | Origin allow-list, credentialed CORS |
| `api.php` | Shipment read/write used by the agent dashboard |
| `manager_api.php` | Everything else — see actions below |
| `smtp_mailer.php` | Contact-form delivery through the site's own mailbox |
| `sidman_freight_pg.sql` | Schema: 6 tables, 6 indexes |

## Setup

```bash
cp auth_config.example.php auth_config.php   # then fill in real values
```

Generate the values:

```bash
php -r "echo bin2hex(random_bytes(32));"                    # JWT_SECRET
php -r "echo password_hash('the-password', PASSWORD_DEFAULT);"  # a password hash
```

Create the schema:

```bash
psql "$DATABASE_URL" -f sidman_freight_pg.sql
```

Run locally:

```bash
php -S 127.0.0.1:8000 -t .
```

## Accounts

`manager` and `finance` are fixed accounts defined in `auth_config.php` — they
are not rows in `employees`. Every other staff login is an `employees` row whose
`password_hash` the manager sets when adding them.

## manager_api.php actions

`login` · `logout` · `whoami` · `get_overview` · `get_all_shipments` ·
`get_my_shipments` · `log_shipment` · `update_shipment` ·
`update_shipment_progress` · `approve_shipment` · `delete_shipment` ·
`download_shipment_file` · `get_employees` · `add_employee` ·
`update_employee` · `delete_employee` · `disburse_salary` · `get_transactions` ·
`add_transaction` · `update_transaction` · `delete_transaction` ·
`download_transaction_file` · `get_audit_log` · `log_event` · `track` · `contact`

## Deploying

Do not deploy `auth_config.php`. Set each key from it as an environment variable
instead — `config.php` reads them automatically. `Dockerfile` and
`Dockerfile.vercel` are included from the reference project.
