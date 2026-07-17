-- El mapa del cliente necesita saber qué mesas están ocupadas por CUALQUIER
-- sesión activa (de otro cliente o del staff), no solo las propias. También
-- lo necesita PaymentPage para sumarse a la sesión activa de la mesa.
-- Las sesiones cerradas siguen siendo privadas (solo dueño o staff).
DROP POLICY IF EXISTS "sessions_select_own_or_staff" ON table_sessions;
CREATE POLICY "sessions_select_own_or_staff" ON table_sessions
  FOR SELECT USING (
    is_active = true
    OR customer_id = auth.uid()
    OR is_staff()
  );
