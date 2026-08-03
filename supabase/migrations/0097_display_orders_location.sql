-- ============================================================
-- La pantalla también dice dónde
--
-- El tablero de retiro mostraba número y nombre. Con un local que además tiene
-- salón, el que mira la pantalla no sabe si el #14 lo tiene que pasar a buscar
-- o se lo llevan a la mesa.
--
-- Se agrega la ubicación del pedido. Es la misma función pública de siempre:
-- número, nombre de pila y dónde. Nada de plata ni de qué pidió.
--
-- DROP y no CREATE OR REPLACE: cambia el tipo de retorno, y Postgres no deja
-- reemplazar una función cuando cambian sus columnas de salida.
-- ============================================================

DROP FUNCTION IF EXISTS get_display_orders(uuid);

CREATE FUNCTION get_display_orders(p_venue_id uuid)
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
    COALESCE(c.full_name, 'Cliente') AS customer_name,
    o.status::text,
    o.created_at,
    o.location_label,
    o.location_type::text
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE o.venue_id = p_venue_id
    AND o.status::text = ANY(ARRAY['recibido', 'en_preparacion', 'listo'])
  ORDER BY o.created_at;
$$;

GRANT EXECUTE ON FUNCTION get_display_orders(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_display_orders(uuid) TO authenticated;
