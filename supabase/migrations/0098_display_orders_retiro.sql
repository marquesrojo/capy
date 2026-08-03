-- ============================================================
-- La pantalla es para los que pasan a buscar
--
-- Devolvía todos los pedidos del local. El que está sentado en una mesa no
-- mira la pantalla —le llevan la comida—, así que su nombre y su número
-- colgaban de una tele del salón sin que hiciera falta.
--
-- Queda solo lo que se retira: el punto de entrega adentro del local y el que
-- pidió de afuera para pasar a buscarlo. El delivery tampoco va: nadie lo
-- espera parado frente a la pantalla.
--
-- Mismo tipo de retorno que 0097, así que alcanza con REPLACE.
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
    COALESCE(c.full_name, 'Cliente') AS customer_name,
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
