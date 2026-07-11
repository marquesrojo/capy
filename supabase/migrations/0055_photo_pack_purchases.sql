CREATE TABLE IF NOT EXISTS photo_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  mp_payment_id text UNIQUE NOT NULL,
  amount_ars numeric NOT NULL,
  credits integer NOT NULL DEFAULT 25,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz
);

-- Only superadmins can read/write; webhook uses service role
ALTER TABLE photo_pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin all" ON photo_pack_purchases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );
