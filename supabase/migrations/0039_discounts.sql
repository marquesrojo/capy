CREATE TABLE venue_discounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  label text,
  percent numeric NOT NULL CHECK (percent > 0 AND percent <= 100),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venue_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_discounts" ON venue_discounts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND venue_id = venue_discounts.venue_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND venue_id = venue_discounts.venue_id)
  );

CREATE POLICY "anon_read_active_discounts" ON venue_discounts
  FOR SELECT TO anon
  USING (is_active = true);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code text;
