-- Link staff_names to the camaut auth user via profile_id
-- This allows reliable cross-reference between venue_staff (staff_profile_id)
-- and staff_names without relying on name matching.

ALTER TABLE staff_names ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_names_profile_id_key
  ON staff_names(profile_id) WHERE profile_id IS NOT NULL;

-- Fill for records created by register-camaut (staff_names.id = camaut auth UID)
UPDATE staff_names sn
SET profile_id = sn.id
FROM auth.users u
WHERE u.id = sn.id
  AND sn.profile_id IS NULL;

-- Fallback: match by full_name through venue_staff → profiles
UPDATE staff_names sn
SET profile_id = vs.staff_profile_id
FROM venue_staff vs
JOIN profiles p ON p.id = vs.staff_profile_id
WHERE LOWER(TRIM(p.full_name)) = LOWER(TRIM(sn.full_name))
  AND vs.status = 'active'
  AND sn.profile_id IS NULL;

-- Allow update via profile_id as well as id
DROP POLICY IF EXISTS "staff_names_update_own" ON staff_names;
CREATE POLICY "staff_names_update_own"
  ON staff_names FOR UPDATE
  USING (id = auth.uid() OR profile_id = auth.uid())
  WITH CHECK (id = auth.uid() OR profile_id = auth.uid());
