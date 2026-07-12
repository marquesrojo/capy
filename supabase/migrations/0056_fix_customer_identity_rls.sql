-- The app migrated from device-token identity (x-device-token header +
-- current_customer_id() function) to Supabase anonymous auth sessions.
-- customers.id = auth.uid() for all anonymous sessions.
-- Update all RLS policies to use auth.uid() accordingly.

-- ========================
-- CUSTOMERS TABLE
-- ========================
DROP POLICY IF EXISTS "customers_insert_public" ON customers;
DROP POLICY IF EXISTS "customers_insert_own" ON customers;
DROP POLICY IF EXISTS "customers_select_own_or_staff" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;

CREATE POLICY "customers_insert_own" ON customers
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "customers_select_own_or_staff" ON customers
  FOR SELECT USING (id = auth.uid() OR is_staff());

CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE USING (id = auth.uid());

-- ========================
-- ORDERS TABLE
-- ========================
DROP POLICY IF EXISTS "orders_select_own_or_staff" ON orders;
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
DROP POLICY IF EXISTS "orders_update_own_pending_or_staff" ON orders;
DROP POLICY IF EXISTS "orders_update_own_or_staff" ON orders;

-- Any authenticated session (including anonymous) can read any order.
-- The UUID acts as the access token, enabling the /ver-pedido QR share page.
CREATE POLICY "orders_select_own_or_staff" ON orders
  FOR SELECT USING (
    auth.uid() = customer_id
    OR is_staff()
    OR auth.uid() IS NOT NULL
  );

-- Customer inserts their own order; staff inserts any (including staff-placed with null customer_id)
CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id OR is_staff());

-- Customer updates their own order; staff updates any.
-- Any authenticated session can also update for QR share page operations (call waiter, bill request).
CREATE POLICY "orders_update_own_or_staff" ON orders
  FOR UPDATE USING (
    auth.uid() = customer_id
    OR is_staff()
    OR auth.uid() IS NOT NULL
  );

-- ========================
-- ORDER_ITEMS TABLE
-- ========================
DROP POLICY IF EXISTS "items_select_via_order" ON order_items;
DROP POLICY IF EXISTS "items_insert_via_order" ON order_items;

CREATE POLICY "items_select_via_order" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (o.customer_id = auth.uid() OR is_staff() OR auth.uid() IS NOT NULL)
    )
  );

CREATE POLICY "items_insert_via_order" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (o.customer_id = auth.uid() OR is_staff())
    )
  );

-- ========================
-- ORDER_STATUS_HISTORY TABLE
-- ========================
DROP POLICY IF EXISTS "history_select_via_order" ON order_status_history;

CREATE POLICY "history_select_via_order" ON order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (o.customer_id = auth.uid() OR is_staff() OR auth.uid() IS NOT NULL)
    )
  );

-- ========================
-- TABLE_SESSIONS TABLE
-- ========================
DROP POLICY IF EXISTS "sessions_select_own_or_staff" ON table_sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON table_sessions;
DROP POLICY IF EXISTS "sessions_update_own_or_staff" ON table_sessions;

CREATE POLICY "sessions_select_own_or_staff" ON table_sessions
  FOR SELECT USING (customer_id = auth.uid() OR is_staff());

CREATE POLICY "sessions_insert_own" ON table_sessions
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "sessions_update_own_or_staff" ON table_sessions
  FOR UPDATE USING (customer_id = auth.uid() OR is_staff());

-- ========================
-- STORAGE: payment proofs
-- ========================
DROP POLICY IF EXISTS "payment_proofs_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_select_own_or_staff" ON storage.objects;

CREATE POLICY "payment_proofs_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "payment_proofs_select_own_or_staff"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_staff()
    )
  );
