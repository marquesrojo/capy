-- PIN de autorización para managers (comparación directa; suficiente para POS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_pin text;

-- Motivos de anulación configurables por venue
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0
);

ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cancellation_reasons_all" ON cancellation_reasons FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_venue ON cancellation_reasons(venue_id);

-- Motivos por defecto que se insertan para cada venue existente
INSERT INTO cancellation_reasons (venue_id, label, sort_order)
SELECT id, 'Error de carga', 0 FROM venues
UNION ALL
SELECT id, 'Cambio de decisión del cliente', 1 FROM venues
UNION ALL
SELECT id, 'Producto agotado', 2 FROM venues
UNION ALL
SELECT id, 'Demora excesiva', 3 FROM venues;

-- Log de anulaciones de ítems (auditoría)
CREATE TABLE IF NOT EXISTS order_item_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  cancelled_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  authorized_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason_id uuid REFERENCES cancellation_reasons(id) ON DELETE SET NULL,
  quantity_cancelled int NOT NULL DEFAULT 1,
  notes text,
  cancelled_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_item_cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_cancellations_all" ON order_item_cancellations FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_item_cancellations_order_item ON order_item_cancellations(order_item_id);
CREATE INDEX IF NOT EXISTS idx_item_cancellations_venue ON order_item_cancellations(cancelled_at DESC);
