ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS delivery_address text;
