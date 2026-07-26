-- ============================================================
-- is_staff() no incluía a 'superadmin'
--
-- 0005 actualizó is_staff() a ('admin', 'cocina', 'camarero', 'propietario'),
-- pero 0017 agregó el rol 'superadmin' sin sumarlo a la función. Al
-- superadmin sólo se le dieron policies de SELECT (0017) y de escritura
-- sobre products/categories/venue_zones (0065), así que en el resto de las
-- tablas el UPDATE le quedaba bloqueado.
--
-- Se veía como "cierro la mesa y sigue roja": impersonando un venue, el
-- mapa se leía bien pero el UPDATE en orders y table_sessions se rechazaba
-- en silencio. Con un usuario admin funcionaba.
--
-- Los demás roles (admin, camarero, cocina, propietario) ya estaban bien.
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
