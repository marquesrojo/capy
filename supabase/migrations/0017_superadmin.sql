CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'
  )
$$;

UPDATE profiles SET role = 'superadmin' WHERE id = '3f126926-f240-4e24-a112-d041c59e0af8';

CREATE POLICY "superadmin_venues_select" ON venues
  FOR SELECT USING (is_superadmin());

CREATE POLICY "superadmin_orders_select" ON orders
  FOR SELECT USING (is_superadmin());

CREATE POLICY "superadmin_staff_names_select" ON staff_names
  FOR SELECT USING (is_superadmin());

CREATE POLICY "superadmin_support_tickets_select" ON support_tickets
  FOR SELECT USING (is_superadmin());

CREATE POLICY "superadmin_profiles_select" ON profiles
  FOR SELECT USING (is_superadmin());
