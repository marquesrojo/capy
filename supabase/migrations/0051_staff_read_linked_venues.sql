-- Allow staff to read venue config (e.g. cash_discount) for venues they are linked to via venue_staff.
-- Without this, supabaseStaff can't read the venues row for linked venues due to RLS,
-- even though it can read payment_methods, venue_discounts, etc. for those same venues.
CREATE POLICY "staff read linked venues"
ON venues FOR SELECT
USING (
  id IN (
    SELECT venue_id FROM venue_staff
    WHERE staff_profile_id = auth.uid()
    AND status = 'active'
  )
);
