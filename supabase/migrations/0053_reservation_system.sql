-- Reservation system for venues

-- Add reservation columns to venue_zones (existing tables become bookable types)
ALTER TABLE venue_zones
  ADD COLUMN IF NOT EXISTS is_reservable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_capacity int;

-- Settings per venue (one row per venue)
CREATE TABLE IF NOT EXISTS reservation_settings (
  venue_id uuid PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  slot_duration_minutes int NOT NULL DEFAULT 90,
  max_advance_days int NOT NULL DEFAULT 30,
  min_guests int NOT NULL DEFAULT 1,
  max_guests int NOT NULL DEFAULT 10,
  booking_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recurring weekly availability (day_of_week: 0=Sunday … 6=Saturday, matches JS Date.getDay())
CREATE TABLE IF NOT EXISTS reservation_weekly_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_covers int NOT NULL DEFAULT 30,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservation_weekly_slots_venue ON reservation_weekly_slots(venue_id);

-- Date-specific overrides (block a normally open day)
CREATE TABLE IF NOT EXISTS reservation_date_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_blocked boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (venue_id, date)
);
CREATE INDEX IF NOT EXISTS reservation_date_overrides_venue_date ON reservation_date_overrides(venue_id, date);

-- Actual reservation bookings
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date date NOT NULL,
  slot_time time NOT NULL,
  guests int NOT NULL,
  table_shape text,
  table_capacity int,
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  guest_email text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'no_show', 'completed')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservations_venue_date ON reservations(venue_id, date);
CREATE INDEX IF NOT EXISTS reservations_venue_date_slot ON reservations(venue_id, date, slot_time);

-- RLS
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_weekly_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_date_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for public booking page availability checks)
CREATE POLICY "public read reservation_settings"
  ON reservation_settings FOR SELECT USING (true);
CREATE POLICY "public read reservation_weekly_slots"
  ON reservation_weekly_slots FOR SELECT USING (true);
CREATE POLICY "public read reservation_date_overrides"
  ON reservation_date_overrides FOR SELECT USING (true);
CREATE POLICY "public read reservations"
  ON reservations FOR SELECT USING (true);

-- Customers can insert reservations (anon booking)
CREATE POLICY "public insert reservations"
  ON reservations FOR INSERT WITH CHECK (true);

-- Staff (propietario) can manage their venue's reservation config
CREATE POLICY "staff manage reservation_settings"
  ON reservation_settings FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff manage reservation_weekly_slots"
  ON reservation_weekly_slots FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff manage reservation_date_overrides"
  ON reservation_date_overrides FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "staff manage reservations"
  ON reservations FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()));
