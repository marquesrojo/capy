-- Módulo fiscal: facturas electrónicas emitidas via TusFacturasAPP (ARCA/AFIP).
-- Una factura por pedido. La escribe solo la edge function emit-invoice
-- (service role); el staff la lee para mostrar CAE y mandar el ticket.
CREATE TABLE IF NOT EXISTS fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'error')),
  invoice_type text NOT NULL DEFAULT '6',      -- 6 = Factura B
  punto_venta text NOT NULL DEFAULT '00001',
  invoice_number text,
  cae text,
  cae_expiry text,
  pdf_url text,                                -- ticket digital 80mm
  total numeric,
  error_message text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_invoices_select_staff" ON fiscal_invoices
  FOR SELECT USING (is_staff());
-- Sin policies de INSERT/UPDATE: solo la edge function con service role escribe.

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_venue ON fiscal_invoices(venue_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_order ON fiscal_invoices(order_id);
