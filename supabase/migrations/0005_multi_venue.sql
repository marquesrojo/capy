-- ============================================================
-- MULTI-VENUE: slug por venue, venue_id en profiles,
-- tabla camarero_venues (many-to-many)
-- ============================================================

-- Slug único por venue (e.g. "pucara" → capyapp.co/r/pucara)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Asignar slug al venue existente de Pucará
UPDATE venues SET slug = 'pucara' WHERE id = '00000000-0000-0000-0000-000000000001';

-- Enlazar venue al profile del admin de Pucará
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id) ON DELETE SET NULL;
UPDATE profiles SET venue_id = '00000000-0000-0000-0000-000000000001' WHERE role = 'admin';

-- Ampliar roles permitidos
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('cliente', 'admin', 'cocina', 'camarero', 'propietario'));

-- ============================================================
-- camarero_venues: un camarero puede estar en varios venues
-- ============================================================
CREATE TABLE IF NOT EXISTS camarero_venues (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  camarero_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('pendiente', 'activo', 'desvinculado')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(camarero_id, venue_id)
);

ALTER TABLE camarero_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "camarero_venues_select_own_or_staff" ON camarero_venues
  FOR SELECT USING (camarero_id = auth.uid() OR is_staff());

CREATE POLICY "camarero_venues_insert_own" ON camarero_venues
  FOR INSERT WITH CHECK (camarero_id = auth.uid());

CREATE POLICY "camarero_venues_update_staff" ON camarero_venues
  FOR UPDATE USING (is_staff());

CREATE POLICY "camarero_venues_delete_staff" ON camarero_venues
  FOR DELETE USING (is_staff() OR camarero_id = auth.uid());

-- Índice
CREATE INDEX IF NOT EXISTS idx_camarero_venues_camarero ON camarero_venues(camarero_id);
CREATE INDEX IF NOT EXISTS idx_camarero_venues_venue ON camarero_venues(venue_id);

-- ============================================================
-- ACTUALIZAR is_staff() para incluir camarero y propietario
-- ============================================================
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cocina', 'camarero', 'propietario')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Permitir a propietarios crear su propio venue (self-service)
CREATE POLICY "venues_insert_owner" ON venues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Permitir a propietarios actualizar su propio venue
CREATE POLICY "venues_update_owner" ON venues
  FOR UPDATE USING (owner_id = auth.uid());
