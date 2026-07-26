-- ============================================================
-- is_staff() quedó desactualizada y bloquea a media plantilla
--
-- La función se definió por última vez en 0004, cuando los únicos roles
-- eran 'admin' y 'camarero'. En 0005 se agregaron 'cocina', 'propietario'
-- y 'superadmin' al check de profiles, pero is_staff() nunca se actualizó.
--
-- Consecuencia: esos tres roles fallan is_staff() y RLS les bloquea el
-- UPDATE en orders, table_sessions, etc. Se ve como "cierro la mesa y
-- sigue roja": el SELECT funciona (hay policies propias de superadmin en
-- 0017), pero el UPDATE se rechaza en silencio.
--
-- Afecta a las ~48 policies que usan is_staff().
-- ============================================================

CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'camarero', 'cocina', 'propietario', 'superadmin')
  )
$$;
