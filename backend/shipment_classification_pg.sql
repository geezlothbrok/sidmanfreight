-- Classification the client asked to report on. Neither existed before, so the
-- report could not have grouped by them.
--
-- Kept as VARCHAR with a CHECK rather than a Postgres ENUM: adding a regime
-- later is then an ALTER of the constraint, not a type migration.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS regime VARCHAR(30);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS consignment_type VARCHAR(30);

ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_regime_chk;
ALTER TABLE shipments ADD CONSTRAINT shipments_regime_chk
  CHECK (regime IS NULL OR regime IN ('Import','Export','Warehousing','Transit','Freezones'));

ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_consignment_chk;
ALTER TABLE shipments ADD CONSTRAINT shipments_consignment_chk
  CHECK (consignment_type IS NULL OR consignment_type IN ('Vehicles','General Goods'));

CREATE INDEX IF NOT EXISTS idx_shipments_regime      ON shipments (regime);
CREATE INDEX IF NOT EXISTS idx_shipments_consignment ON shipments (consignment_type);
