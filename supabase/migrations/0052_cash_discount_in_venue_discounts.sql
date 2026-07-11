-- Store cash discount config in venue_discounts so Camaut staff linked to a venue
-- can read it via supabaseStaff (venue_discounts has no RLS restriction for staff,
-- unlike the venues table which blocks reads for linked venues).
ALTER TABLE venue_discounts
  ADD COLUMN IF NOT EXISTS is_cash_discount boolean NOT NULL DEFAULT false;

-- Seed existing cash discount config from venues table
INSERT INTO venue_discounts (venue_id, code, percent, is_active, is_cash_discount, label)
SELECT
  id,
  'EFECTIVO',
  cash_discount_percent,
  cash_discount_enabled,
  true,
  'Descuento efectivo'
FROM venues
WHERE cash_discount_percent > 0
  AND NOT EXISTS (
    SELECT 1 FROM venue_discounts
    WHERE venue_id = venues.id AND is_cash_discount = true
  );
