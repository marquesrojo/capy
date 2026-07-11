-- Per-venue Mercado Pago access token
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS mp_access_token text;
