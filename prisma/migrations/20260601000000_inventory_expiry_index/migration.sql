-- Add index on inventory_batches(expiry_date) to speed up near-expiry queries.
CREATE INDEX IF NOT EXISTS "inventory_batches_expiry_date_idx"
  ON "inventory_batches"("expiry_date");
