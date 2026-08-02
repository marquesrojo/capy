-- ============================================================
-- El personal también puede estar en un grupo o en una categoría
--
-- Los encargados y los camareros son parte de la casa, y la casa les hace
-- precio: el 20% del personal, la carta de empleados, el menú del plantel. Pero
-- las listas de grupos y de descuentos se arman sobre venue_customers, o sea
-- sobre quien entró a pedir por la página del local. Un camarero que nunca pidió
-- desde el celular no existía ahí, así que no había forma de sumarlo.
--
-- No hace falta una tabla nueva. La cuenta del staff y la del cliente son el
-- mismo auth.users: customers.id es el id del usuario. Alcanza con dejar que la
-- ficha de cliente exista aunque la persona haya llegado por el otro lado.
--
-- Dos funciones:
--   venue_staff_candidates  — quién trabaja acá (propios y vinculados)
--   venue_staff_as_customer — le abre la ficha de cliente y lo asocia al local
--
-- SECURITY DEFINER porque las dos tocan auth.users o escriben en customers, con
-- el control adentro: solo quien administra ese local, y solo sobre gente de
-- ese local.
-- ============================================================

CREATE OR REPLACE FUNCTION venue_staff_candidates(p_venue_id uuid)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  role text,
  email text,
  linked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Los del local
  SELECT p.id, p.full_name, p.role, u.email, false
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.venue_id = p_venue_id
    AND p.role IN ('propietario', 'admin', 'camarero', 'cocina')
    AND COALESCE(p.is_active, true)
    AND (
      p_venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
      OR is_superadmin()
    )

  UNION

  -- Y los vinculados, que trabajan acá sin ser de acá
  SELECT p.id, p.full_name, p.role, u.email, true
  FROM venue_staff vs
  JOIN profiles p ON p.id = vs.staff_profile_id
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE vs.venue_id = p_venue_id
    AND vs.status = 'active'
    AND (
      p_venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
      OR is_superadmin()
    );
$$;

GRANT EXECUTE ON FUNCTION venue_staff_candidates(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION venue_staff_as_customer(p_venue_id uuid, p_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF NOT (
    p_venue_id IN (SELECT venue_id FROM profiles WHERE id = auth.uid())
    OR is_superadmin()
  ) THEN
    RAISE EXCEPTION 'Sin permiso sobre este local';
  END IF;

  -- Que sea del local o esté vinculado: si no, esto sería una forma de darle
  -- de alta la ficha a cualquiera con solo saber su id
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_profile_id AND venue_id = p_venue_id
  ) AND NOT EXISTS (
    SELECT 1 FROM venue_staff
    WHERE venue_id = p_venue_id AND staff_profile_id = p_profile_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Esa persona no trabaja en este local';
  END IF;

  SELECT full_name INTO v_name FROM profiles WHERE id = p_profile_id;

  -- La ficha puede existir ya: si el camarero alguna vez pidió con su cuenta,
  -- es la misma fila. No se pisa nada de lo que haya cargado él.
  INSERT INTO customers (id, full_name, whatsapp)
  VALUES (p_profile_id, v_name, '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO venue_customers (venue_id, customer_id)
  VALUES (p_venue_id, p_profile_id)
  ON CONFLICT DO NOTHING;

  RETURN p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION venue_staff_as_customer(uuid, uuid) TO authenticated;
