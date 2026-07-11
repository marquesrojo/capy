-- Track cash discount applied at order or bill-request time
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cash_discount_amount integer;
