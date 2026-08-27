-- Invoicing, modelled on the client's existing spreadsheet invoice.
--
-- The one rule that matters and is easy to get wrong: VAT is charged on the
-- CONTRACT SERVICE CHARGES only (section 2, "W/HT applicable"), never on the
-- third-party pass-through payments (section 1). On the sample invoice that is
-- the difference between GH₵970.00 and GH₵2,370.00.

CREATE TABLE IF NOT EXISTS invoices (
    id             SERIAL PRIMARY KEY,
    invoice_no     VARCHAR(60)  NOT NULL UNIQUE,
    invoice_date   DATE         NOT NULL DEFAULT CURRENT_DATE,

    -- BILL TO
    client_name    VARCHAR(200) NOT NULL,
    client_address TEXT,
    client_phone   VARCHAR(60),
    -- free-text line under the client, e.g. "2019 HAVAL H6"
    subject        VARCHAR(200),

    -- shipment reference block
    mode           VARCHAR(60),   -- e.g. "INBOUND - SEA"
    bl_no          VARCHAR(100),
    consolidation  VARCHAR(30),   -- "SIMPLE" | "CONSO"

    -- money
    vat_rate       NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
    deposit        NUMERIC(12,2) NOT NULL DEFAULT 0,

    status         VARCHAR(30)   NOT NULL DEFAULT 'Draft',  -- Draft | Issued | Paid
    notes          TEXT,
    created_by     VARCHAR(150),
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by     VARCHAR(150),
    updated_at     TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id          SERIAL PRIMARY KEY,
    invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    -- 1 = third-party payments (no VAT, W/HT not applicable)
    -- 2 = contract service charges (VAT applies, W/HT applicable)
    section     SMALLINT NOT NULL CHECK (section IN (1, 2)),
    description VARCHAR(200) NOT NULL,
    qty         NUMERIC(10,2),
    rate        NUMERIC(12,2),
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items (invoice_id, section, sort_order);
CREATE INDEX IF NOT EXISTS idx_invoices_no       ON invoices (UPPER(invoice_no));
CREATE INDEX IF NOT EXISTS idx_invoices_created  ON invoices (created_at DESC);
