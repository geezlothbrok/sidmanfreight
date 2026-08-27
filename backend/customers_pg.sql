-- Customer records, so the demographic report counts PEOPLE rather than
-- shipments. A client with three shipments is one customer in the breakdown —
-- which is what "N=169" on the client's deck means.
--
-- Note on sensitive data: religion and marital status are "special personal
-- data" under Ghana's Data Protection Act 2012 (s.96). They are optional here,
-- and should only be collected where the customer has been told why.

CREATE TABLE IF NOT EXISTS customers (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(200) NOT NULL,
    phone          VARCHAR(60),
    email          VARCHAR(150),

    gender         VARCHAR(20),
    marital_status VARCHAR(20),
    religion       VARCHAR(40),
    nationality    VARCHAR(40),
    occupation     VARCHAR(120),
    location       VARCHAR(120),

    notes          TEXT,
    created_by     VARCHAR(150),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by     VARCHAR(150),
    updated_at     TIMESTAMP
);

-- Constrained where the deck uses a fixed set; free text where it shows a long
-- tail (occupation, location).
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_gender_chk;
ALTER TABLE customers ADD CONSTRAINT customers_gender_chk
  CHECK (gender IS NULL OR gender IN ('Male','Female'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_marital_chk;
ALTER TABLE customers ADD CONSTRAINT customers_marital_chk
  CHECK (marital_status IS NULL OR marital_status IN ('Married','Single','Divorced','Widowed'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_religion_chk;
ALTER TABLE customers ADD CONSTRAINT customers_religion_chk
  CHECK (religion IS NULL OR religion IN ('Christianity','Islam','Traditional','Other'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_nationality_chk;
ALTER TABLE customers ADD CONSTRAINT customers_nationality_chk
  CHECK (nationality IS NULL OR nationality IN ('Ghanaian','Non-Ghanaian'));

-- Nullable so every existing shipment stays valid; clientName is kept as the
-- display label either way.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_customer_fk;
ALTER TABLE shipments ADD CONSTRAINT shipments_customer_fk
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_name     ON customers (UPPER(name));
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments (customer_id);
