CREATE TABLE IF NOT EXISTS capy_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE capy_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capy_docs_read" ON capy_docs FOR SELECT USING (true);
CREATE POLICY "capy_docs_write" ON capy_docs FOR ALL USING (true) WITH CHECK (true);

-- Full-text search index
CREATE INDEX IF NOT EXISTS capy_docs_fts ON capy_docs
  USING gin(to_tsvector('spanish', title || ' ' || content));
