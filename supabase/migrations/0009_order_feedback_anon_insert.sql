-- Allow anonymous/unregistered customers to submit order feedback.
-- Previously customer_id was required to match a row in customers, but
-- visitors on the public order page may not have a customers row.
-- We allow customer_id = NULL for those cases.

-- Ensure customer_id is nullable
ALTER TABLE order_feedback ALTER COLUMN customer_id DROP NOT NULL;

-- Replace INSERT policy: allow null OR the authenticated user's own id
DROP POLICY IF EXISTS "feedback_insert_own" ON order_feedback;
DROP POLICY IF EXISTS "order_feedback_insert_own" ON order_feedback;
DROP POLICY IF EXISTS "feedback_insert_authenticated" ON order_feedback;
DROP POLICY IF EXISTS "feedback_insert_public" ON order_feedback;

CREATE POLICY "feedback_insert_public" ON order_feedback
  FOR INSERT WITH CHECK (
    customer_id IS NULL OR customer_id = auth.uid()
  );
