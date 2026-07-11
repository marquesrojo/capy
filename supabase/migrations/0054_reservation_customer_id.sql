-- Link reservations to authenticated customers
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reservations_customer_id ON reservations(customer_id);
