-- Global Capy platform settings (singleton row, id = 1)
CREATE TABLE IF NOT EXISTS capy_settings (
  id int PRIMARY KEY CHECK (id = 1),
  mp_access_token text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE capy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capy_settings_all" ON capy_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO capy_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
