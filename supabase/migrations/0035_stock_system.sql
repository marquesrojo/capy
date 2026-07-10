-- Movimientos de stock: consumo automático por orden + reposición/ajuste manual
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  delta numeric(12,4) NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('consumo', 'reposicion', 'ajuste', 'merma')),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_all" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stock_movements_venue ON stock_movements(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_order ON stock_movements(order_id);

-- Cierre de stock diario / por turno
CREATE TABLE IF NOT EXISTS stock_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE stock_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_closings_all" ON stock_closings FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS stock_closing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_closing_id uuid NOT NULL REFERENCES stock_closings(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  calculated_stock numeric(12,4),
  declared_stock numeric(12,4),
  discrepancy numeric(12,4) GENERATED ALWAYS AS (
    CASE WHEN declared_stock IS NOT NULL AND calculated_stock IS NOT NULL
      THEN declared_stock - calculated_stock
      ELSE NULL
    END
  ) STORED
);

ALTER TABLE stock_closing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_closing_items_all" ON stock_closing_items FOR ALL USING (true) WITH CHECK (true);

-- Trigger: al pasar orden a 'en_preparacion', descontar stock de ingredientes tracked
CREATE OR REPLACE FUNCTION consume_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'en_preparacion' AND OLD.status != 'en_preparacion' THEN
    -- Insertar movimientos de consumo
    INSERT INTO stock_movements (venue_id, ingredient_id, delta, movement_type, order_id)
    SELECT
      NEW.venue_id,
      pi.ingredient_id,
      -(pi.quantity * oi.quantity),
      'consumo',
      NEW.id
    FROM order_items oi
    JOIN product_ingredients pi ON pi.product_id = oi.product_id
    JOIN ingredients i ON i.id = pi.ingredient_id
    WHERE oi.order_id = NEW.id
      AND pi.ingredient_id IS NOT NULL
      AND i.track_stock = true;

    -- Actualizar current_stock en ingredientes
    UPDATE ingredients i
    SET
      current_stock = i.current_stock + totals.total_delta,
      updated_at = now()
    FROM (
      SELECT ingredient_id, SUM(delta) AS total_delta
      FROM stock_movements
      WHERE order_id = NEW.id AND movement_type = 'consumo'
      GROUP BY ingredient_id
    ) totals
    WHERE i.id = totals.ingredient_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_consume_stock ON orders;
CREATE TRIGGER trigger_consume_stock
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION consume_stock_on_order();
