-- Descuento por pago en efectivo, configurable por venue
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS cash_discount_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cash_discount_percent numeric(5,2) NOT NULL DEFAULT 0;
