ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS client_floor_map_enabled boolean NOT NULL DEFAULT false;
