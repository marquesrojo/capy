-- ============================================================
-- Grupos de clientes
--
-- Un local no le sirve lo mismo a todo el mundo. Los jugadores del club comen
-- de un menú que el resto de las mesas no tiene; los socios ven una carta que
-- no se publica. Eso no es un descuento con otro nombre: es otra carta.
--
-- Por eso el grupo vive aparte de discount_categories. Una categoría de
-- descuento existe para hacerle un precio a alguien; un grupo de clientes
-- existe para abrirle una puerta. Se pueden solapar —la misma persona puede
-- estar en los dos— pero son listas distintas y se administran distinto.
--
-- Un grupo abre cartas: venue_menus.audience_group_id. En null la carta es de
-- todos, como hasta ahora.
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_groups_venue ON customer_groups(venue_id);

CREATE TABLE IF NOT EXISTS customer_group_members (
  group_id uuid NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- El local va en la fila y no se busca en el grupo: es lo que mira su policy,
  -- y así no hay dos policies preguntándose entre sí (ver 0086, la recursión
  -- que rompió las categorías de descuento)
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_cgm_customer ON customer_group_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_cgm_venue ON customer_group_members(venue_id);

-- Null = la ve cualquiera
ALTER TABLE venue_menus
  ADD COLUMN IF NOT EXISTS audience_group_id uuid REFERENCES customer_groups(id) ON DELETE SET NULL;

ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_group_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Grupos
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "customer_groups_manage" ON customer_groups;
CREATE POLICY "customer_groups_manage" ON customer_groups
  FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin())
  WITH CHECK (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin());

-- El cliente lee el grupo al que pertenece: sin esto no puede saber que la
-- carta que está viendo es suya
DROP POLICY IF EXISTS "customer_groups_member_read" ON customer_groups;
CREATE POLICY "customer_groups_member_read" ON customer_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customer_group_members m
      WHERE m.group_id = customer_groups.id
        AND m.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customer_group_members_manage" ON customer_group_members;
CREATE POLICY "customer_group_members_manage" ON customer_group_members
  FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin())
  WITH CHECK (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin());

DROP POLICY IF EXISTS "customer_group_members_own_read" ON customer_group_members;
CREATE POLICY "customer_group_members_own_read" ON customer_group_members
  FOR SELECT USING (customer_id = auth.uid());

-- ------------------------------------------------------------
-- Quién ve cada carta
--
-- Acá está el punto del cambio. Si el recorte lo hiciera la pantalla, la carta
-- del club viajaría igual y se vería mirando la respuesta. Lo decide la base.
--
-- El staff las ve todas, también las de grupo: es el camarero el que sabe quién
-- está sentado en la mesa. Y un camarero vinculado no es dueño del local, así
-- que no alcanza con la rama de profiles.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "venue_menus_read" ON venue_menus;
CREATE POLICY "venue_menus_read" ON venue_menus
  FOR SELECT USING (
    (
      is_active
      AND (
        audience_group_id IS NULL
        OR EXISTS (
          SELECT 1 FROM customer_group_members m
          WHERE m.group_id = venue_menus.audience_group_id
            AND m.customer_id = auth.uid()
        )
      )
    )
    OR venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
    OR venue_id IN (
      SELECT venue_id FROM venue_staff
      WHERE staff_profile_id = auth.uid() AND status = 'active'
    )
    OR is_superadmin()
  );

-- ------------------------------------------------------------
-- Las tablas hijas cuelgan de que la carta sea legible
--
-- Estaban abiertas a todo el mundo, y no se notaba porque toda carta activa era
-- pública. Con una carta de grupo, dejar los pasos legibles sería esconder la
-- tapa del libro y dejar las páginas afuera.
--
-- No hay ciclo: venue_menus no mira a ninguna de estas tres.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "venue_menu_products_read" ON venue_menu_products;
CREATE POLICY "venue_menu_products_read" ON venue_menu_products
  FOR SELECT USING (menu_id IN (SELECT id FROM venue_menus));

DROP POLICY IF EXISTS "venue_menu_steps_read" ON venue_menu_steps;
CREATE POLICY "venue_menu_steps_read" ON venue_menu_steps
  FOR SELECT USING (menu_id IN (SELECT id FROM venue_menus));

DROP POLICY IF EXISTS "venue_menu_step_options_read" ON venue_menu_step_options;
CREATE POLICY "venue_menu_step_options_read" ON venue_menu_step_options
  FOR SELECT USING (step_id IN (SELECT id FROM venue_menu_steps));
