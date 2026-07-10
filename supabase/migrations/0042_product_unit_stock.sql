-- Stock por unidad para productos terminados.
-- unit_stock NULL = sin seguimiento. 0 = agotado. N = unidades disponibles.
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_stock integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert integer;

-- Cuando un pedido pasa a 'recibido' (pago confirmado), descuenta unidades
-- de los productos que tienen unit_stock activo.
CREATE OR REPLACE FUNCTION consume_unit_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'recibido' AND OLD.status IS DISTINCT FROM 'recibido' THEN
    -- Descontar stock
    UPDATE products p
    SET unit_stock = GREATEST(0, p.unit_stock - totals.qty)
    FROM (
      SELECT product_id, SUM(quantity) AS qty
      FROM order_items
      WHERE order_id = NEW.id
        AND (is_cancelled IS NULL OR is_cancelled = false)
      GROUP BY product_id
    ) totals
    WHERE p.id = totals.product_id
      AND p.unit_stock IS NOT NULL;

    -- Marcar como no disponible al llegar a 0
    UPDATE products p
    SET is_available = false
    FROM (
      SELECT DISTINCT oi.product_id
      FROM order_items oi
      WHERE oi.order_id = NEW.id
        AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
    ) ordered
    WHERE p.id = ordered.product_id
      AND p.unit_stock IS NOT NULL
      AND p.unit_stock = 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_consume_unit_stock ON orders;
CREATE TRIGGER trigger_consume_unit_stock
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION consume_unit_stock_on_order();
