# Deployment

Two Vercel projects from this one repository, distinguished by **Root Directory**:

| Project | Root Directory | Serves | Domain |
| --- | --- | --- | --- |
| `sidmanfreight` | `client` | Vite SPA | `sidmanfreightconsult.com` |
| `sidmanfreight-api` | `backend` | PHP container | `api.sidmanfreightconsult.com` |

Same arrangement as `hotalogistics` / `api.hotalogistics.com`.

---

## 1. Database (done)

Neon holds all 9 tables. To rebuild from scratch:

```bash
psql "$DATABASE_URL" -f backend/schema.sql
```

`schema.sql` was generated from the working database, so it already includes
every migration — invoices, customers, and the shipment regime / consignment
classification. It is idempotent (`CREATE TABLE IF NOT EXISTS`).

---

## 2. Backend project

**New Project → import this repo → Root Directory: `backend`.**

Vercel detects `Dockerfile.vercel` and builds the container. No other build
configuration is needed — the image already installs `pdo_pgsql` (required for
Neon) and binds to `$PORT`.

### Environment variables

Set all 13 in **Settings → Environment Variables**. `config.php` reads the
environment first and only falls back to `auth_config.php`, which is never
deployed. Copy the shape from `backend/.env.production.example`.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | The Neon pooled string. Keep `sslmode=require`. |
| `JWT_SECRET` | `php -r "echo bin2hex(random_bytes(32));"` — rotating it signs everyone out. |
| `MANAGER_EMAIL` | `ausuel2004@gmail.com` |
| `MANAGER_PASSWORD_HASH` | `php -r "echo password_hash('…', PASSWORD_DEFAULT);"` |
| `FINANCE_EMAIL` | `ausuel2004+finance@gmail.com` — **must differ from the manager**, see below |
| `FINANCE_PASSWORD_HASH` | as above, a different password |
| `ALLOWED_ORIGIN` | `https://sidmanfreightconsult.com` — must match exactly |
| `COOKIE_SAMESITE` | `None`, because the API is on a different subdomain |
| `SMTP_HOST` | `mail.privateemail.com` |
| `SMTP_PORT` | `465` — implicit SSL. On 587 the mailer connects in plaintext and never issues STARTTLS, so the password would cross the wire in the clear. |
| `SMTP_USER` | `info@sidmanfreightconsult.com` |
| `SMTP_PASS` | the mailbox password — **no leading or trailing whitespace**, which fails auth silently |
| `CONTACT_TO` | `info@sidmanfreightconsult.com` |

### What ships inside the image

`.dockerignore` is the only thing keeping non-runtime files out of the
container, and that matters more than it looks: the image runs PHP's built-in
server (`php -S`), so **there is no Apache and `backend/.htaccess` is inert**.
Any non-PHP file left in `/app` is served as plaintext to anyone who asks.

`.htaccess` is kept in the repo for a possible Apache/cPanel host, but it
protects nothing on Vercel. The image therefore excludes `auth_config.php`,
`.env*`, `*.sql`, `.htaccess`, the `Dockerfile`s, and both example files.
`.env.production.example` in particular was being served at
`/.env.production.example`, disclosing the manager and finance login addresses
and the mailbox — no passwords, but the exact identities needed to target the
staff portal.

Confirm after any change to the build:

```bash
docker build -f Dockerfile.vercel -t sidman-api .
docker run --rm --entrypoint sh sidman-api -c 'ls -a /app'
```

Only the PHP the API actually requires, `uploads/`, and `uploads.ini` should
appear. PHP includes (`db.php`, `config.php`, …) are safe to leave in place —
`php -S` executes them, so a direct request returns an empty body, not source.

### Why the two logins must differ

`role_for_email()` checks the manager address first and returns on match. If
both constants hold the same address the finance branch is unreachable and
nobody can ever sign into the finance portal. Gmail's `+` tag gives a distinct
login identity that still delivers to the same inbox.

The manager already reaches every finance endpoint (`require_finance_email()`
accepts either role), so the separate portal is a convenience, not a gate.

---

## 3. Frontend project

**New Project → import this repo → Root Directory: `client`.**

`client/vercel.json` sets the build, the SPA rewrite, and cache headers. The
rewrite is what allows a refresh on `/manager-dashboard` to work — without it
Vercel returns 404, because `index.html` is the only file that exists on disk.

`VITE_API_URL` is optional: the app already falls back to
`https://api.sidmanfreightconsult.com/manager_api.php` off localhost. Set it
only if the API moves.

---

## 4. Domains

- `sidmanfreightconsult.com` → frontend project
- `api.sidmanfreightconsult.com` → backend project

`ALLOWED_ORIGIN` must equal the frontend domain exactly, scheme included. The
CORS check and the session cookie both depend on it, so a mismatch shows up as
a login that appears to succeed and then immediately fails.

---

## Verified locally

The exact production path was exercised before deploying:

- `docker build -f Dockerfile.vercel` succeeds
- the container honours `$PORT` (Vercel routes to 80 by default)
- no secrets, examples, or docs are present inside the image
- the container, given only environment variables, reaches Neon over TLS
- login returns `{"success":true,"role":"Manager"}` and a manager-only endpoint
  returns data
- CORS echoes `https://sidmanfreightconsult.com` and refuses other origins
- neither `auth_config.php` nor `.env.production` is present inside the image

```bash
docker build -f Dockerfile.vercel -t sidman-api .
docker run --rm -p 8099:80 --env-file .env.production sidman-api
```

---

## Email — confirmed working

`235 Authentication successful` against `mail.privateemail.com:465`, with TLS
certificate verification on. Both public forms were sent end to end and
returned success: the contact form and the vehicle duty enquiry.

## Still outstanding

- **Rotate the Neon password.** It was shared in chat during setup.
- **Change the portal passwords** from the ones used during development.
- **File uploads are capped at ~4 MB** by Vercel's request body limit. Receipts
  and manifests are stored base64 in the database (`transaction_files`,
  `shipment_files`) because the container filesystem is ephemeral.
- **The `services` copy and the FAQs** on the public site are still placeholder
  text written to fill the layout, not supplied business content.
