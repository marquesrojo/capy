-- Allow anyone to read staff_experience for the public CV page (/cv/:alias).
-- Entries are manually curated by the staff member (work history, education,
-- honors) and are intended for public display, like a LinkedIn profile.
ALTER TABLE staff_experience ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_experience_select_public" ON staff_experience;
CREATE POLICY "staff_experience_select_public" ON staff_experience
  FOR SELECT USING (true);

-- Staff can only manage their own entries
DROP POLICY IF EXISTS "staff_experience_insert_own" ON staff_experience;
DROP POLICY IF EXISTS "staff_experience_delete_own" ON staff_experience;

CREATE POLICY "staff_experience_insert_own" ON staff_experience
  FOR INSERT WITH CHECK (staff_id = auth.uid());

CREATE POLICY "staff_experience_delete_own" ON staff_experience
  FOR DELETE USING (staff_id = auth.uid());
