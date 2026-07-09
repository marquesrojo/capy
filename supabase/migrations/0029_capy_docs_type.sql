ALTER TABLE capy_docs
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'instruction'));
