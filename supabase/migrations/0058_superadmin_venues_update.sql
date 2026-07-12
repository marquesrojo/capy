CREATE POLICY "superadmin_venues_update" ON venues
  FOR UPDATE USING (is_superadmin()) WITH CHECK (is_superadmin());
