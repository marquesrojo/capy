-- Allow any authenticated user (including anonymous sessions created via
-- signInAnonymously) to read staff profiles. This is needed for:
--   - /ver-pedido/:id  → shows assigned waiter photo, name, bio to customers
--   - /c/:alias        → public waiter CV page
-- avatar_url (base64), bio, and alias_bancario are intentionally public.

ALTER TABLE staff_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_names_select_public" ON staff_names;
CREATE POLICY "staff_names_select_public" ON staff_names
  FOR SELECT TO authenticated
  USING (true);
