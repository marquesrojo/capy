-- Liga receta de stock: product_ingredients.supply_product_id → products(id)
-- Diferente del ingredient_id previo (→ ingredients.id, para info nutricional).
ALTER TABLE product_ingredients
  ADD COLUMN IF NOT EXISTS supply_product_id uuid REFERENCES products(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_ingredients_supply ON product_ingredients(supply_product_id);

-- Corrige el trigger para usar supply_product_id en el modo 'ingredient'
CREATE OR REPLACE FUNCTION consume_unit_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'recibido' AND OLD.status IS DISTINCT FROM 'recibido' THEN

    -- Modo 'unit': descuenta directamente del producto
    UPDATE products p
    SET unit_stock = GREATEST(0, p.unit_stock - totals.qty)
    FROM (
      SELECT oi.product_id, SUM(oi.quantity) AS qty
      FROM order_items oi
      JOIN products pr ON pr.id = oi.product_id
      WHERE oi.order_id = NEW.id
        AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
        AND pr.stock_mode = 'unit'
      GROUP BY oi.product_id
    ) totals
    WHERE p.id = totals.product_id;

    -- Modo 'ingredient': descuenta de los insumos según receta (supply_product_id)
    UPDATE products p
    SET unit_stock = GREATEST(0, p.unit_stock - recipe_totals.total_qty)
    FROM (
      SELECT pi.supply_product_id, SUM(oi.quantity * pi.quantity) AS total_qty
      FROM order_items oi
      JOIN products pr ON pr.id = oi.product_id
      JOIN product_ingredients pi ON pi.product_id = oi.product_id
      WHERE oi.order_id = NEW.id
        AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
        AND pr.stock_mode = 'ingredient'
        AND pi.supply_product_id IS NOT NULL
      GROUP BY pi.supply_product_id
    ) recipe_totals
    WHERE p.id = recipe_totals.supply_product_id
      AND p.unit_stock IS NOT NULL;

    -- Marcar is_available = false para cualquier producto/insumo que llegó a 0
    UPDATE products p
    SET is_available = false
    WHERE p.unit_stock IS NOT NULL
      AND p.unit_stock = 0
      AND p.id IN (
        SELECT oi.product_id FROM order_items oi
        JOIN products pr ON pr.id = oi.product_id
        WHERE oi.order_id = NEW.id
          AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
          AND pr.stock_mode = 'unit'
        UNION
        SELECT pi.supply_product_id FROM order_items oi
        JOIN products pr ON pr.id = oi.product_id
        JOIN product_ingredients pi ON pi.product_id = oi.product_id
        WHERE oi.order_id = NEW.id
          AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
          AND pr.stock_mode = 'ingredient'
          AND pi.supply_product_id IS NOT NULL
      );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_consume_unit_stock ON orders;
CREATE TRIGGER trigger_consume_unit_stock
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION consume_unit_stock_on_order();
