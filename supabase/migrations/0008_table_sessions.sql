-- table_sessions: agrupa múltiples comandas de un mismo cliente en la misma mesa/visita
CREATE TABLE table_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES venue_zones(id) ON DELETE SET NULL,
  location_label text,
  location_type text,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own_or_staff" ON table_sessions
  FOR SELECT USING (customer_id = current_customer_id() OR is_staff());

CREATE POLICY "sessions_insert_own" ON table_sessions
  FOR INSERT WITH CHECK (customer_id = current_customer_id());

CREATE POLICY "sessions_update_own_or_staff" ON table_sessions
  FOR UPDATE USING (customer_id = current_customer_id() OR is_staff());

-- Cada comanda puede pertenecer a una sesión de mesa
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES table_sessions(id) ON DELETE SET NULL;

-- Distingue re-pedidos (adiciones) de la primera comanda
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_addition boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_customer ON table_sessions(customer_id);
