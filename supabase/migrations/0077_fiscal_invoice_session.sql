-- Factura consolidada de mesa: un solo comprobante para todos los pedidos de
-- una sesión. La factura se vincula a la sesión (session_id) en vez de a un
-- pedido puntual; order_id pasa a ser opcional.
ALTER TABLE fiscal_invoices ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES table_sessions(id) ON DELETE SET NULL;
ALTER TABLE fiscal_invoices ALTER COLUMN order_id DROP NOT NULL;

-- La unicidad por pedido pasa a ser parcial (solo cuando hay order_id)
ALTER TABLE fiscal_invoices DROP CONSTRAINT IF EXISTS fiscal_invoices_order_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_invoices_order_id_uniq
  ON fiscal_invoices(order_id) WHERE order_id IS NOT NULL;

-- Una sola factura aprobada por sesión (evita doble facturación de la mesa)
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_invoices_session_approved_uniq
  ON fiscal_invoices(session_id) WHERE session_id IS NOT NULL AND status = 'approved';

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_session ON fiscal_invoices(session_id);
