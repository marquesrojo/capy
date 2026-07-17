-- El staff (admin/camarero) también abre sesiones de mesa al tomar el primer
-- pedido, sin cliente asociado. Hasta ahora la policy de INSERT exigía
-- customer_id = auth.uid() y la columna era NOT NULL, así que esas
-- inserciones fallaban en silencio y el mapa quedaba desincronizado.

ALTER TABLE table_sessions ALTER COLUMN customer_id DROP NOT NULL;

DROP POLICY IF EXISTS "sessions_insert_own" ON table_sessions;
CREATE POLICY "sessions_insert_own" ON table_sessions
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
    OR (is_staff() AND customer_id IS NULL)
  );

-- Los clientes necesitan ver la sesión activa de su mesa aunque la haya
-- abierto el staff (customer_id NULL), para sumarse a ella al pedir.
DROP POLICY IF EXISTS "sessions_select_own_or_staff" ON table_sessions;
CREATE POLICY "sessions_select_own_or_staff" ON table_sessions
  FOR SELECT USING (
    customer_id = auth.uid()
    OR customer_id IS NULL
    OR is_staff()
  );
