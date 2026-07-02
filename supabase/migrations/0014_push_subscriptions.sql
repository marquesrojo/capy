CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff_names(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (staff_id = auth.uid());

CREATE POLICY "push_subs_delete_own" ON push_subscriptions
  FOR DELETE USING (staff_id = auth.uid());
