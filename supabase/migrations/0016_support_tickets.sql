CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES staff_names(id) ON DELETE SET NULL,
  staff_name text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_insert_any" ON support_tickets
  FOR INSERT WITH CHECK (true);
CREATE POLICY "support_select_service" ON support_tickets
  FOR SELECT USING (true);
