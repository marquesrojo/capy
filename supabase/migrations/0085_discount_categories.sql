-- ============================================================
-- Categorías de descuento: grupos de clientes de un local
--
-- Caso que lo motiva: un club quiere que sus ~60 veteranos tengan 15% en el
-- buffet. No es algo deducible de los pedidos —es una condición que el local
-- asigna—, y asignarla de a uno no escala ni se sostiene cuando entra gente
-- nueva. Por eso el descuento vive en la categoría: quien entra después lo
-- tiene sin que nadie haga nada.
--
-- El alta masiva va por un link con código, que el local reparte y puede
-- cerrar. Quien ya se había registrado sin ese link se categoriza a mano.
-- ============================================================

CREATE TABLE IF NOT EXISTS discount_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- Código del link de adhesión. Se puede rotar o cerrar sin perder miembros.
  join_code text UNIQUE,
  join_open boolean NOT NULL DEFAULT true,
  -- null = categoría sin descuento, solo para segmentar
  discount_percent numeric(5,2) CHECK (discount_percent > 0 AND discount_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_categories_venue ON discount_categories(venue_id);

CREATE TABLE IF NOT EXISTS discount_category_members (
  category_id uuid NOT NULL REFERENCES discount_categories(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_ccm_customer ON discount_category_members(customer_id);

ALTER TABLE discount_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_category_members ENABLE ROW LEVEL SECURITY;

-- El local administra sus categorías
DROP POLICY IF EXISTS "discount_categories_staff_manage" ON discount_categories;
CREATE POLICY "discount_categories_staff_manage" ON discount_categories
  FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin())
  WITH CHECK (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin());

-- El cliente necesita leer la categoría a la que pertenece para ver su
-- descuento en el checkout
DROP POLICY IF EXISTS "discount_categories_member_read" ON discount_categories;
CREATE POLICY "discount_categories_member_read" ON discount_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM discount_category_members m
      WHERE m.category_id = discount_categories.id
        AND m.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "discount_members_staff_manage" ON discount_category_members;
CREATE POLICY "discount_members_staff_manage" ON discount_category_members
  FOR ALL
  USING (
    category_id IN (
      SELECT id FROM discount_categories
      WHERE venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
    ) OR is_superadmin()
  )
  WITH CHECK (
    category_id IN (
      SELECT id FROM discount_categories
      WHERE venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
    ) OR is_superadmin()
  );

DROP POLICY IF EXISTS "discount_members_own_read" ON discount_category_members;
CREATE POLICY "discount_members_own_read" ON discount_category_members
  FOR SELECT USING (customer_id = auth.uid());

-- ------------------------------------------------------------
-- Adhesión por link
--
-- Va por RPC y no por INSERT directo porque el cliente no puede —ni debe—
-- leer la tabla de categorías de un local al que todavía no pertenece: sin
-- esto necesitaría permiso de lectura sobre todas las categorías para
-- encontrar la suya por código.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_discount_category(p_code text)
RETURNS TABLE (category_id uuid, category_name text, venue_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat discount_categories%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_code IS NULL THEN RETURN; END IF;

  SELECT * INTO cat FROM discount_categories
   WHERE join_code = upper(trim(p_code)) AND join_open;
  IF NOT FOUND THEN RETURN; END IF;

  -- Necesita ficha de cliente: sin nombre no hay a quién reconocer en el local
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO discount_category_members (category_id, customer_id)
  VALUES (cat.id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT cat.id, cat.name, v.name FROM venues v WHERE v.id = cat.venue_id;
END;
$$;

-- Datos mínimos para la pantalla de adhesión, antes de pertenecer a nada
CREATE OR REPLACE FUNCTION peek_discount_category(p_code text)
RETURNS TABLE (category_name text, venue_name text, venue_slug text, is_open boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name, v.name, v.slug, c.join_open
  FROM discount_categories c
  JOIN venues v ON v.id = c.venue_id
  WHERE c.join_code = upper(trim(p_code));
$$;

GRANT EXECUTE ON FUNCTION join_discount_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION peek_discount_category(text) TO authenticated, anon;

-- ------------------------------------------------------------
-- Privacidad: cada local ve solo a SUS clientes
--
-- La policy vigente deja que cualquier miembro del staff de cualquier local
-- lea la tabla entera de clientes de la plataforma. Sin una pantalla que los
-- liste no se notaba; con la sección Clientes pasa a ser un padrón a la vista.
--
-- Un cliente es "del local" si le pidió alguna vez o si está en una de sus
-- categorías. Las pantallas actuales leen customers siempre embebido en
-- orders, así que siguen funcionando igual.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "customers_select_own_or_staff" ON customers;
CREATE POLICY "customers_select_own_or_staff" ON customers
  FOR SELECT USING (
    id = auth.uid()
    OR is_superadmin()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = customers.id
        AND (
          o.venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
          OR o.venue_id IN (
            SELECT venue_id FROM venue_staff
            WHERE staff_profile_id = auth.uid() AND status = 'active'
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM discount_category_members m
      JOIN discount_categories c ON c.id = m.category_id
      WHERE m.customer_id = customers.id
        AND c.venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
    )
  );
