-- quick_notes: chips rápidos al tomar pedidos
CREATE TABLE IF NOT EXISTS quick_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_notes_select_staff" ON quick_notes;
DROP POLICY IF EXISTS "quick_notes_write_staff" ON quick_notes;

CREATE POLICY "quick_notes_select_staff" ON quick_notes
  FOR SELECT USING (is_staff());
CREATE POLICY "quick_notes_write_staff" ON quick_notes
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- payment_methods: métodos de pago habilitados por venue
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_methods_select_all" ON payment_methods;
DROP POLICY IF EXISTS "payment_methods_write_staff" ON payment_methods;

CREATE POLICY "payment_methods_select_all" ON payment_methods
  FOR SELECT USING (true);
CREATE POLICY "payment_methods_write_staff" ON payment_methods
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());
