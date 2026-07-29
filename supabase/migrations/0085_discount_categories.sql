-- ============================================================
-- Clientes del local y categorías de descuento
--
-- Hasta ahora "cliente de un local" no existía como dato: se deducía de haber
-- pedido ahí. venue_customers lo vuelve explícito — el cliente queda asociado
-- al local donde se identificó, sin necesidad de pedir. Es muchos a muchos: si
-- otro día inicia sesión en otro local, queda asociado también a ese.
--
-- Sobre esa lista, el local arma categorías de descuento. El descuento vive en
-- la categoría, así que lo tiene quien pertenece: no hay código que compartir
-- ni que rehacer cada vez que se suma alguien.
-- ============================================================

CREATE TABLE IF NOT EXISTS venue_customers (
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (venue_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_customers_customer ON venue_customers(customer_id);

CREATE TABLE IF NOT EXISTS discount_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_dcm_customer ON discount_category_members(customer_id);

ALTER TABLE venue_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_category_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- venue_customers
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "venue_customers_read" ON venue_customers;
CREATE POLICY "venue_customers_read" ON venue_customers
  FOR SELECT USING (
    customer_id = auth.uid()
    OR is_superadmin()
    OR venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
    OR venue_id IN (
      SELECT venue_id FROM venue_staff
      WHERE staff_profile_id = auth.uid() AND status = 'active'
    )
  );

-- El alta la hace link_customer_to_venue, no un INSERT suelto
DROP POLICY IF EXISTS "venue_customers_staff_delete" ON venue_customers;
CREATE POLICY "venue_customers_staff_delete" ON venue_customers
  FOR DELETE USING (
    venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin()
  );

-- ------------------------------------------------------------
-- Categorías
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "discount_categories_staff_manage" ON discount_categories;
CREATE POLICY "discount_categories_staff_manage" ON discount_categories
  FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin())
  WITH CHECK (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin());

-- El cliente lee la categoría a la que pertenece para ver su descuento
DROP POLICY IF EXISTS "discount_categories_member_read" ON discount_categories;
CREATE POLICY "discount_categories_member_read" ON discount_categories
  FOR SELECT USING (
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
-- Asociar al cliente con el local donde se identificó
--
-- Va por RPC para que la app no necesite permiso de escritura sobre la tabla:
-- solo puede asociarse a sí misma, y solo si ya completó nombre y WhatsApp.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION link_customer_to_venue(p_venue_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_venue_id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = auth.uid()) THEN RETURN; END IF;

  INSERT INTO venue_customers (venue_id, customer_id)
  VALUES (p_venue_id, auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION link_customer_to_venue(uuid) TO authenticated;

-- Los que ya pidieron en un local son clientes de ese local
INSERT INTO venue_customers (venue_id, customer_id)
SELECT DISTINCT o.venue_id, o.customer_id
FROM orders o
WHERE o.customer_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Privacidad: cada local ve solo a SUS clientes
--
-- La policy vigente deja que cualquier miembro del staff de cualquier local
-- lea la tabla entera de clientes de la plataforma. Sin una pantalla que los
-- liste no se nota; con la lista de clientes pasa a ser un padrón a la vista.
--
-- Las pantallas actuales leen customers embebido en orders, y todo pedido con
-- cliente quedó reflejado en venue_customers por el backfill de arriba, así
-- que siguen funcionando igual.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "customers_select_own_or_staff" ON customers;
CREATE POLICY "customers_select_own_or_staff" ON customers
  FOR SELECT USING (
    id = auth.uid()
    OR is_superadmin()
    OR EXISTS (
      SELECT 1 FROM venue_customers vc
      WHERE vc.customer_id = customers.id
        AND (
          vc.venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
          OR vc.venue_id IN (
            SELECT venue_id FROM venue_staff
            WHERE staff_profile_id = auth.uid() AND status = 'active'
          )
        )
    )
  );
