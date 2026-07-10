-- Fix: anon_read_active_discounts only covered anon role.
-- Customers use anonymous auth (authenticated role), so they were blocked.
-- Replace with a policy that covers all roles.
DROP POLICY IF EXISTS "anon_read_active_discounts" ON venue_discounts;

CREATE POLICY "public_read_active_discounts" ON venue_discounts
  FOR SELECT
  USING (is_active = true);
