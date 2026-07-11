-- ingredient_name is superseded by supply_product_id -> products.name
-- Make it nullable so inserts via the new recipe editor don't fail
ALTER TABLE product_ingredients
  ALTER COLUMN ingredient_name DROP NOT NULL;
