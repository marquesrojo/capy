-- Marcar si un método de pago es efectivo (para cálculo de caja ciega)
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_cash boolean DEFAULT false;

-- Tabla de turnos / caja
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  opened_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_cash numeric(12,2) NOT NULL DEFAULT 0,
  declared_cash numeric(12,2),
  expected_cash numeric(12,2),
  discrepancy numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_all" ON shifts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shifts_venue_status ON shifts(venue_id, status);

-- Vincular órdenes al turno activo
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
