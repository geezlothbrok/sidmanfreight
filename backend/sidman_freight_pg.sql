-- Sidman Freight Consult Ltd — PostgreSQL schema (Neon)
--
-- Run against your Neon database, e.g.:
--   psql "postgresql://user:pass@host/db?sslmode=require" -f sidman_freight_pg.sql
--
-- Two deliberate choices worth knowing:
--
-- 1) The camelCase columns ("containerNo", "clientName", "fileName", "fileUrl",
--    "updatedBy") are QUOTED. PostgreSQL folds unquoted identifiers to
--    lowercase, which would make `SELECT *` return "containerno" and break the
--    React app (it reads containerNo). Quoting preserves the exact same API
--    shape the MySQL version returned, so no frontend change is needed.
--    Everything that references them in SQL must quote them too.
--
-- 2) The boolean-ish flags (approved, portal_access) are SMALLINT, not BOOLEAN.
--    The PHP compares them as integers (`approved = 1`, `(int)$row['approved']
--    !== 1`); BOOLEAN would come back as 't'/'f' and silently break those checks.

CREATE TABLE IF NOT EXISTS shipments (
    id            SERIAL PRIMARY KEY,
    "containerNo" VARCHAR(100) NOT NULL,
    "clientName"  VARCHAR(150) NOT NULL,
    status        VARCHAR(50)  NOT NULL DEFAULT 'Pending Customs Review',
    origin        VARCHAR(150),
    destination   VARCHAR(150),
    notes         TEXT,
    "fileName"    TEXT,
    "fileUrl"     TEXT,
    "updatedBy"   VARCHAR(150),
    -- "timestamp" is quoted throughout: it's a type keyword, so leaving it bare
    -- makes expressions like "timestamp"::date ambiguous.
    "timestamp"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_by     VARCHAR(150),
    edited_at     TIMESTAMP,
    approved      SMALLINT NOT NULL DEFAULT 0,
    approved_at   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(50),
    role          VARCHAR(50)  NOT NULL DEFAULT 'Agent',
    base_salary   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status        VARCHAR(50)  NOT NULL DEFAULT 'Active',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    portal_access SMALLINT NOT NULL DEFAULT 1,
    -- bcrypt hash of the staffer's portal password (password_hash(...,
    -- PASSWORD_DEFAULT)). Set when the manager adds/edits the employee; the
    -- login endpoint verifies against it. NULL means "no portal login yet".
    -- The two fixed accounts (manager, finance) are NOT stored here — their
    -- hashes live in auth_config.php.
    password_hash VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS transactions (
    id                SERIAL PRIMARY KEY,
    type              VARCHAR(20)  NOT NULL,
    amount            NUMERIC(12,2) NOT NULL,
    category          VARCHAR(150) NOT NULL,
    reference_no      VARCHAR(150),   -- shown as "Invoice/Receipt Number"
    bill_of_lading    VARCHAR(150),
    identification_no VARCHAR(150),
    notes             TEXT,
    file_path         TEXT,
    date_logged       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Upgrading an existing DB? Run once:
--   ALTER TABLE transactions ADD COLUMN bill_of_lading VARCHAR(150),
--                            ADD COLUMN identification_no VARCHAR(150);

-- Receipt/supporting-document attachments for a transaction. The bytes live in
-- the DB (base64 in file_data) rather than on disk, because the production host
-- (Vercel container) has a read-only, ephemeral filesystem that cannot persist
-- uploads. Served back through the manager_api.php `download_transaction_file`
-- action. ON DELETE CASCADE cleans these up when the parent transaction is
-- deleted.
CREATE TABLE IF NOT EXISTS transaction_files (
    id             SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_name      VARCHAR(255) NOT NULL,
    mime_type      VARCHAR(150),
    file_size      INTEGER,               -- original byte size (pre-base64)
    file_data      TEXT NOT NULL,         -- base64-encoded file bytes
    uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transaction_files_tx ON transaction_files (transaction_id);

-- Manifest / bill-of-entry attachments for a shipment. Same rationale and
-- storage shape as transaction_files (bytes in the DB, not on the read-only
-- ephemeral Vercel disk). Served via manager_api.php `download_shipment_file`.
CREATE TABLE IF NOT EXISTS shipment_files (
    id          SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    file_name   VARCHAR(255) NOT NULL,
    mime_type   VARCHAR(150),
    file_size   INTEGER,               -- original byte size (pre-base64)
    file_data   TEXT NOT NULL,         -- base64-encoded file bytes
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shipment_files_ship ON shipment_files (shipment_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    actor_email VARCHAR(150) NOT NULL,
    event_type  VARCHAR(30)  NOT NULL,
    entity      VARCHAR(50),
    description TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes for the queries this app actually runs.
CREATE INDEX IF NOT EXISTS idx_shipments_container ON shipments (UPPER("containerNo"));
CREATE INDEX IF NOT EXISTS idx_shipments_updatedby ON shipments ("updatedBy");
CREATE INDEX IF NOT EXISTS idx_transactions_type   ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_audit_created       ON audit_log (created_at DESC);
