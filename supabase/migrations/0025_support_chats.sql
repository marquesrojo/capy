CREATE TABLE IF NOT EXISTS support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff_names(id) ON DELETE SET NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  source text NOT NULL DEFAULT 'venue_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_all" ON support_chats FOR ALL USING (true) WITH CHECK (true);

-- Extend support_tickets with venue context and chat history
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chat_context jsonb,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'camaut';
