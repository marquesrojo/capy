-- ============================================================
-- En la pantalla, el nombre de pila y nada más
--
-- Una tele colgada en el mostrador la ve cualquiera que pase. El apellido no
-- hace falta para que alguien reconozca su pedido, y el número solo ya alcanza:
-- si no tenemos el nombre, no se inventa un "Cliente" para llenar el renglón.
--
-- Mismo tipo de retorno que 0098, así que alcanza con REPLACE.
-- ============================================================

CREATE OR REPLACE FUNCTION get_display_orders(p_venue_id uuid)
RETURNS TABLE (
  id uuid,
  daily_number int,
  customer_name text,
  status text,
  created_at timestamptz,
  location_label text,
  location_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    o.id,
    o.daily_number,
    -- Hasta el primer espacio. Sin nombre cargado devuelve null, y la pantalla
    -- muestra el número solo.
    NULLIF(split_part(trim(COALESCE(c.full_name, '')), ' ', 1), '') AS customer_name,
    o.status::text,
    o.created_at,
    o.location_label,
    o.location_type::text
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE o.venue_id = p_venue_id
    AND o.status::text = ANY(ARRAY['recibido', 'en_preparacion', 'listo'])
    AND o.location_type::text = ANY(ARRAY['retiro', 'retiro_externo'])
  ORDER BY o.created_at;
$$;

GRANT EXECUTE ON FUNCTION get_display_orders(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_display_orders(uuid) TO authenticated;
