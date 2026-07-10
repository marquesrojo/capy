-- Cancellation flag on order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Staff can update order_items (needed for cancellation)
CREATE POLICY "items_update_staff" ON order_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND is_staff())
  );

-- Staff can update any profile in their venue (needed for manager PIN management)
-- is_staff() already checks role = 'admin' so cocina cannot reach UsersPage
CREATE POLICY "profiles_update_staff" ON profiles
  FOR UPDATE USING (is_staff());
