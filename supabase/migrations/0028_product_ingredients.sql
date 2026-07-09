CREATE TABLE IF NOT EXISTS product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  quantity numeric(10,4) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'unidad',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredients_select_all" ON product_ingredients FOR SELECT USING (true);
CREATE POLICY "ingredients_write_staff" ON product_ingredients FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
