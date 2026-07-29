-- ============================================================
-- Romper la recursión entre las policies de categorías y miembros
--
-- La policy de discount_categories pregunta por discount_category_members
-- (para que el cliente lea la categoría a la que pertenece), y la de miembros
-- preguntaba por discount_categories (para saber de qué local es). Postgres
-- detecta el ciclo y corta con "infinite recursion detected in policy".
--
-- Se corta por el lado de miembros: la fila lleva su propio venue_id, así que
-- su policy se resuelve sin salir de la tabla.
-- ============================================================

ALTER TABLE discount_category_members
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id) ON DELETE CASCADE;

UPDATE discount_category_members m
   SET venue_id = c.venue_id
  FROM discount_categories c
 WHERE c.id = m.category_id
   AND m.venue_id IS NULL;

ALTER TABLE discount_category_members ALTER COLUMN venue_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dcm_venue ON discount_category_members(venue_id);

DROP POLICY IF EXISTS "discount_members_staff_manage" ON discount_category_members;
CREATE POLICY "discount_members_staff_manage" ON discount_category_members
  FOR ALL
  USING (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin())
  WITH CHECK (venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid()) OR is_superadmin());
