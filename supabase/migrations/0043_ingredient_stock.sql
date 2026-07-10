-- stock_mode: null = sin seguimiento, 'unit' = por unidad, 'ingredient' = por receta
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_mode text
  CHECK (stock_mode IN ('unit', 'ingredient'));

-- Productos que son solo insumos (no aparecen en el menú del cliente)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_ingredient_only boolean DEFAULT false;

-- Receta: qué ingredientes (productos) componen un plato y en qué cantidad
CREATE TABLE IF NOT EXISTS product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'u',
  UNIQUE (product_id, ingredient_id)
);

ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_ingredients_all" ON product_ingredients FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);

-- Migrar productos que ya tienen unit_stock activo al nuevo stock_mode
UPDATE products SET stock_mode = 'unit' WHERE unit_stock IS NOT NULL;

-- Trigger actualizado: maneja 'unit' y 'ingredient'
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

    -- Modo 'ingredient': descuenta de los ingredientes según receta
    UPDATE products p
    SET unit_stock = GREATEST(0, p.unit_stock - recipe_totals.total_qty)
    FROM (
      SELECT pi.ingredient_id, SUM(oi.quantity * pi.quantity) AS total_qty
      FROM order_items oi
      JOIN products pr ON pr.id = oi.product_id
      JOIN product_ingredients pi ON pi.product_id = oi.product_id
      WHERE oi.order_id = NEW.id
        AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
        AND pr.stock_mode = 'ingredient'
      GROUP BY pi.ingredient_id
    ) recipe_totals
    WHERE p.id = recipe_totals.ingredient_id
      AND p.unit_stock IS NOT NULL;

    -- Marcar is_available = false para cualquier producto/ingrediente que llegó a 0
    UPDATE products p
    SET is_available = false
    WHERE p.unit_stock IS NOT NULL
      AND p.unit_stock = 0
      AND p.id IN (
        -- productos directos en modo 'unit'
        SELECT oi.product_id FROM order_items oi
        JOIN products pr ON pr.id = oi.product_id
        WHERE oi.order_id = NEW.id
          AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
          AND pr.stock_mode = 'unit'
        UNION
        -- ingredientes usados por productos en modo 'ingredient'
        SELECT pi.ingredient_id FROM order_items oi
        JOIN products pr ON pr.id = oi.product_id
        JOIN product_ingredients pi ON pi.product_id = oi.product_id
        WHERE oi.order_id = NEW.id
          AND (oi.is_cancelled IS NULL OR oi.is_cancelled = false)
          AND pr.stock_mode = 'ingredient'
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
