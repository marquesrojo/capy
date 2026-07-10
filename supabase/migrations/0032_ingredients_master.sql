-- Maestro de ingredientes por venue (normaliza product_ingredients.ingredient_name)
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'unidad',
  current_stock numeric(12,4) DEFAULT 0,
  min_stock_alert numeric(12,4) DEFAULT 0,
  track_stock boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venue_id, name, unit)
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients_select_all" ON ingredients FOR SELECT USING (true);
CREATE POLICY "ingredients_write_staff" ON ingredients FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ingredients_venue ON ingredients(venue_id);

-- FK en product_ingredients apuntando al maestro
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS ingredient_id uuid REFERENCES ingredients(id) ON DELETE SET NULL;

-- Migrar datos existentes: crear registros en el maestro desde los strings actuales
INSERT INTO ingredients (venue_id, name, unit)
SELECT DISTINCT p.venue_id, pi.ingredient_name, pi.unit
FROM product_ingredients pi
JOIN products p ON p.id = pi.product_id
ON CONFLICT (venue_id, name, unit) DO NOTHING;

-- Vincular product_ingredients.ingredient_id
UPDATE product_ingredients pi
SET ingredient_id = i.id
FROM products p
JOIN ingredients i
  ON i.venue_id = p.venue_id
  AND i.name = pi.ingredient_name
  AND i.unit = pi.unit
WHERE pi.product_id = p.id
  AND pi.ingredient_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);
