-- Public stats for the waiter profile page (/c/:alias).
-- Ratings are aggregate public data (like any review platform), so we allow
-- anyone to read order_feedback. Orders are NOT exposed publicly — we expose
-- only the count via a SECURITY DEFINER function that bypasses RLS safely.

-- Allow anyone to read order_feedback (used for public rating stats)
DROP POLICY IF EXISTS "order_feedback_select_public" ON order_feedback;
CREATE POLICY "order_feedback_select_public" ON order_feedback
  FOR SELECT USING (true);

-- Count orders assigned to a staff member without exposing order details
CREATE OR REPLACE FUNCTION count_orders_by_staff(p_staff_id uuid)
RETURNS bigint
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COUNT(*) FROM orders WHERE assigned_staff_id = p_staff_id;
$$;

GRANT EXECUTE ON FUNCTION count_orders_by_staff(uuid) TO anon, authenticated;
