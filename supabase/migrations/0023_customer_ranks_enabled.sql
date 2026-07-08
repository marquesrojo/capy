ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS customer_ranks_enabled boolean DEFAULT true;
