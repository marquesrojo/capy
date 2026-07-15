-- Adds a 3-way display mode for client-side location/zone selection.
-- Replaces the binary client_floor_map_enabled flag with a richer option:
--   'lista'  → show list only (no map toggle)
--   'mapa'   → show floor map only (no list toggle)
--   'ambos'  → show both with a toggle (previous default when map was enabled)

ALTER TABLE venues ADD COLUMN IF NOT EXISTS location_display_mode TEXT DEFAULT 'lista';

-- Migrate existing data to preserve intent
UPDATE venues
SET location_display_mode = CASE
  WHEN client_floor_map_enabled THEN 'ambos'
  ELSE 'lista'
END;
