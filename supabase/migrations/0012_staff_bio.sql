ALTER TABLE staff_names ADD COLUMN IF NOT EXISTS bio text;

CREATE POLICY "staff_names_update_own"
  ON staff_names FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
