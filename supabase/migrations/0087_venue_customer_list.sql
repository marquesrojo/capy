-- ============================================================
-- Lista de clientes de un local, con su email
--
-- customers guarda nombre y WhatsApp, los dos opcionales: el checkout rápido
-- inserta la ficha sin ninguno. El email, que es lo único obligatorio cuando
-- alguien se registra de verdad, vive en auth.users y no se puede leer desde
-- la app. Sin él, la lista del local mostraba "Sin nombre · sin WhatsApp" para
-- gente que sí tenía cuenta.
--
-- SECURITY DEFINER para poder leer auth.users, con el control de acceso
-- adentro: solo devuelve datos a quien administra ese local.
-- ============================================================

CREATE OR REPLACE FUNCTION venue_customer_list(p_venue_id uuid)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  whatsapp text,
  email text,
  first_seen_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.whatsapp, u.email, vc.first_seen_at
  FROM venue_customers vc
  JOIN customers c ON c.id = vc.customer_id
  LEFT JOIN auth.users u ON u.id = c.id
  WHERE vc.venue_id = p_venue_id
    AND (
      p_venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
      OR is_superadmin()
    );
$$;

GRANT EXECUTE ON FUNCTION venue_customer_list(uuid) TO authenticated;
