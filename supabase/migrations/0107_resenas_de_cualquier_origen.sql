-- ============================================================
-- Una reseña cuenta venga de donde venga
--
-- Hasta ahora una calificación era del camarero solo si tenía su staff_id
-- escrito encima. Eso deja afuera el caso más común del camarero autónomo:
-- toma un pedido en su propio local, el cliente califica desde la pantalla del
-- pedido, y si ese pedido no quedó con camarero asignado la reseña no es de
-- nadie. Su reputación no arranca, y su invitación tampoco cuenta.
--
-- Tres formas de que una reseña sea suya, en orden de certeza:
--   1. La reseña lo nombra (staff_id).
--   2. El pedido que se califica lo tenía asignado a él.
--   3. La reseña no nombra a nadie y el pedido es de su local personal. El
--      venue de un camarero autónomo es él: no hay otro a quién atribuirla.
--
-- La tercera no aplica a un restaurante con varios camareros: ahí staff_names
-- guarda el venue personal de cada uno, no el del local, así que un pedido del
-- restaurante no coincide con el venue de nadie.
--
-- Una sola definición para los dos que la usan: el contador de Embajador y la
-- página pública. Si viven separadas, muestran números distintos.
-- ============================================================

CREATE OR REPLACE FUNCTION resenas_del_camarero(p_staff_id uuid)
RETURNS TABLE (
  rating int,
  notes text,
  tags text[],
  order_id uuid,
  verificada boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (f.id)
    f.rating,
    f.notes,
    f.tags,
    f.order_id,
    f.order_id IS NOT NULL AS verificada
  FROM order_feedback f
  LEFT JOIN orders o ON o.id = f.order_id
  LEFT JOIN staff_names s ON s.id = p_staff_id
  WHERE f.staff_id = p_staff_id
     OR o.assigned_staff_id = p_staff_id
     OR (f.staff_id IS NULL AND o.venue_id IS NOT NULL AND o.venue_id = s.venue_id)
$$;

GRANT EXECUTE ON FUNCTION resenas_del_camarero(uuid) TO anon;
GRANT EXECUTE ON FUNCTION resenas_del_camarero(uuid) TO authenticated;


-- Embajador pasa a usar la misma regla
CREATE OR REPLACE FUNCTION revisar_embajador(p_staff_id uuid)
RETURNS TABLE (
  invitados int,
  invitados_validos int,
  es_embajador boolean,
  recien_ganado boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total    int;
  v_validos  int;
  v_ya       timestamptz;
  v_profile  uuid;
  v_gano     boolean := false;
BEGIN
  SELECT ambassador_at, profile_id INTO v_ya, v_profile
  FROM staff_names WHERE id = p_staff_id;

  SELECT count(*) INTO v_total
  FROM staff_names s WHERE s.referred_by = p_staff_id;

  -- Activado y con reseña: cargó dónde cobrar y alguien ya lo calificó
  SELECT count(*) INTO v_validos
  FROM staff_names s
  WHERE s.referred_by = p_staff_id
    AND s.alias_bancario IS NOT NULL
    AND EXISTS (SELECT 1 FROM resenas_del_camarero(s.id));

  IF v_validos >= 5 AND v_ya IS NULL THEN
    UPDATE staff_names SET ambassador_at = now() WHERE id = p_staff_id;
    IF v_profile IS NOT NULL THEN
      PERFORM add_camarero_images(v_profile, 5);
    END IF;
    v_ya := now();
    v_gano := true;
  END IF;

  RETURN QUERY SELECT v_total, v_validos, v_ya IS NOT NULL, v_gano;
END;
$$;

GRANT EXECUTE ON FUNCTION revisar_embajador(uuid) TO authenticated;
