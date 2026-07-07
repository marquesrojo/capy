-- Add shape column to venue_zones for visual floor-plan rendering.
-- cuadrada = square table, redonda = round table, rectangular = rectangular table, barra = bar counter

ALTER TABLE venue_zones
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'cuadrada'
  CHECK (shape IN ('cuadrada', 'redonda', 'rectangular', 'barra'));
