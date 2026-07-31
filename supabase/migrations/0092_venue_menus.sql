-- ============================================================
-- Cartas del local
--
-- Hasta acá un local tenía una sola carta: todos sus productos, agrupados por
-- categoría. Pero un mismo local sirve cosas distintas según el momento y
-- según quién esté sentado — el menú ejecutivo del mediodía, el menú de los
-- jugadores del club — y esas cartas no son una lista aparte de platos: son
-- otra forma de presentar y de cobrar los mismos platos.
--
-- Dos tipos:
--
--   libre  — cada producto a su precio, como la carta de siempre.
--   fijo   — un precio único para todo el menú, que se arma eligiendo: una
--            entrada, un principal, un postre, un café. Elija lo que elija,
--            paga lo mismo.
--
-- Un producto puede estar en varias cartas a la vez: el Bife de Chorizo se
-- vende a su precio en la carta general y entra sin costo extra en el menú
-- ejecutivo. Por eso las dos relaciones son muchos a muchos, y por eso las
-- opciones de cada paso apuntan a productos reales y no a nombres sueltos: si
-- la cocina marca el bife agotado, desaparece de los dos lados y el ticket
-- sale igual que siempre.
--
-- No se toca staff_menus: esas son las cartas propias del camarero autónomo,
-- otro eje, y comparten nombre pero no problema.
-- ============================================================

CREATE TABLE IF NOT EXISTS venue_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'libre' CHECK (kind IN ('libre', 'fijo')),
  -- Solo para las de precio fijo
  price numeric(10,2) CHECK (price IS NULL OR price >= 0),
  -- El interruptor del admin: apagada no la ve nadie
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_menus_venue ON venue_menus(venue_id);

-- Qué productos entran en una carta libre
CREATE TABLE IF NOT EXISTS venue_menu_products (
  menu_id uuid NOT NULL REFERENCES venue_menus(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (menu_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_menu_products_product ON venue_menu_products(product_id);

-- Los pasos de una carta de precio fijo, en orden
CREATE TABLE IF NOT EXISTS venue_menu_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES venue_menus(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- min 0 deja saltear el paso: el café no siempre se toma
  min_choices int NOT NULL DEFAULT 1 CHECK (min_choices >= 0),
  max_choices int NOT NULL DEFAULT 1 CHECK (max_choices >= 1),
  sort_order int NOT NULL DEFAULT 0,
  CHECK (max_choices >= min_choices)
);

CREATE INDEX IF NOT EXISTS idx_venue_menu_steps_menu ON venue_menu_steps(menu_id);

-- Las opciones de cada paso son productos de la carta
CREATE TABLE IF NOT EXISTS venue_menu_step_options (
  step_id uuid NOT NULL REFERENCES venue_menu_steps(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- Queda listo para el día que el salmón salga más caro que la merluza. Hoy
  -- todas las opciones valen lo mismo y el admin no lo muestra.
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (step_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_menu_step_options_product ON venue_menu_step_options(product_id);

-- Qué eligió el cliente en cada paso. Como dato y no como nota suelta: la
-- cocina tiene que poder leer "Principal: Bife" sin interpretar texto libre.
-- Forma: [{"step":"Plato principal","product_id":"...","name":"Bife de Chorizo"}]
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_options jsonb;

-- La carta con la que se armó el pedido, para que el local sepa después
-- cuánto se vendió del menú ejecutivo
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS venue_menu_id uuid REFERENCES venue_menus(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- RLS: el local administra las suyas, cualquiera lee las activas
--
-- Leer una carta activa no expone nada que el QR no muestre ya. Lo que no
-- puede pasar es que se administren desde afuera.
-- ------------------------------------------------------------
ALTER TABLE venue_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_menu_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_menu_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_menu_step_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venue_menus_read" ON venue_menus;
CREATE POLICY "venue_menus_read" ON venue_menus
  FOR SELECT USING (
    is_active
    OR venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
    OR is_superadmin()
  );

DROP POLICY IF EXISTS "venue_menus_manage" ON venue_menus;
CREATE POLICY "venue_menus_manage" ON venue_menus
  FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin())
  WITH CHECK (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin());

-- Las tres tablas hijas cuelgan de la carta: misma regla, resuelta por menu_id
DROP POLICY IF EXISTS "venue_menu_products_read" ON venue_menu_products;
CREATE POLICY "venue_menu_products_read" ON venue_menu_products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "venue_menu_products_manage" ON venue_menu_products;
CREATE POLICY "venue_menu_products_manage" ON venue_menu_products
  FOR ALL
  USING (menu_id IN (
    SELECT id FROM venue_menus
    WHERE venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
  ) OR is_superadmin())
  WITH CHECK (menu_id IN (
    SELECT id FROM venue_menus
    WHERE venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
  ) OR is_superadmin());

DROP POLICY IF EXISTS "venue_menu_steps_read" ON venue_menu_steps;
CREATE POLICY "venue_menu_steps_read" ON venue_menu_steps
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "venue_menu_steps_manage" ON venue_menu_steps;
CREATE POLICY "venue_menu_steps_manage" ON venue_menu_steps
  FOR ALL
  USING (menu_id IN (
    SELECT id FROM venue_menus
    WHERE venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
  ) OR is_superadmin())
  WITH CHECK (menu_id IN (
    SELECT id FROM venue_menus
    WHERE venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
  ) OR is_superadmin());

DROP POLICY IF EXISTS "venue_menu_step_options_read" ON venue_menu_step_options;
CREATE POLICY "venue_menu_step_options_read" ON venue_menu_step_options
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "venue_menu_step_options_manage" ON venue_menu_step_options;
CREATE POLICY "venue_menu_step_options_manage" ON venue_menu_step_options
  FOR ALL
  USING (step_id IN (
    SELECT s.id FROM venue_menu_steps s
    JOIN venue_menus m ON m.id = s.menu_id
    WHERE m.venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
  ) OR is_superadmin())
  WITH CHECK (step_id IN (
    SELECT s.id FROM venue_menu_steps s
    JOIN venue_menus m ON m.id = s.menu_id
    WHERE m.venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
  ) OR is_superadmin());
