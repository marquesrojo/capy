-- Factura consolidada por lista explícita de pedidos (no depende de la sesión).
-- covered_order_ids guarda todos los pedidos que cubre el comprobante; el
-- order_id ancla es el primero (para unicidad e idempotencia).
ALTER TABLE fiscal_invoices ADD COLUMN IF NOT EXISTS covered_order_ids jsonb;
