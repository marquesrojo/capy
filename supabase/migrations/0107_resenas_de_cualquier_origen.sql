-- ============================================================
-- De quién es una reseña, definido en un solo lugar
--
-- Lo usaban dos: el contador de Embajador y la página pública del camarero. Con
-- la regla escrita dos veces, tarde o temprano muestran números distintos.
--
-- Una reseña es suya por dos caminos, y los dos son hechos, no suposiciones:
--   1. La reseña lo nombra (staff_id).
--   2. El pedido que se está calificando lo tenía asignado a él. Pasa cuando la
--      calificación se guardó sin copiar el camarero, pero el pedido sí lo dice.
--
-- Se descartó una tercera: "la reseña no nombra a nadie y el pedido es de su
-- local personal". Rescataba las reseñas que quedaron huérfanas por el bug de
-- la comanda —que se guardaba sin camarero asignado—, pero ese bug ya está
-- corregido en el origen. Dejarla puesta significaría que, si mañana otro
-- camino vuelve a dejar pedidos sin asignar, las reseñas se absorben solas y
-- nadie se entera. Preferimos que se note.
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
  SELECT
    f.rating,
    f.notes,
    f.tags,
    f.order_id,
    -- Con un pedido detrás vale distinto que una suelta desde el QR
    f.order_id IS NOT NULL AS verificada
  FROM order_feedback f
  LEFT JOIN orders o ON o.id = f.order_id
  WHERE f.staff_id = p_staff_id
     OR o.assigned_staff_id = p_staff_id
$$;

GRANT EXECUTE ON FUNCTION resenas_del_camarero(uuid) TO anon;
GRANT EXECUTE ON FUNCTION resenas_del_camarero(uuid) TO authenticated;


-- Embajador pasa a usar la misma definición
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
