ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS response text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS staff_email text;

CREATE POLICY "superadmin_support_tickets_update" ON support_tickets
  FOR UPDATE USING (is_superadmin());
