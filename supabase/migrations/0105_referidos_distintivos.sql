-- ============================================================
-- Invitar a otro camarero deja algo
--
-- La invitación ya existía pero el link no decía quién invitaba, así que no
-- había forma de saber quién trajo a quién. Dos distintivos, los dos visibles
-- solo entre camareros: no son para el empleador, son para el colega.
--
--   Embajador — cinco invitados que cargaron su alias y recibieron al menos una
--   reseña. No alcanza con que se registren: un registro vacío no es un
--   camarero, y premiar registros es pedir que se inventen cuentas. Se gana una
--   sola vez y suma cinco imágenes de carta con IA, que es lo único que en esta
--   app cuesta plata.
--
--   Fundador — el número de llegada. No se puede comprar, no se puede alcanzar
--   después, y a quien llegó temprano eso le importa más que cualquier crédito.
-- ============================================================

ALTER TABLE staff_names
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES staff_names(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS founder_number int,
  ADD COLUMN IF NOT EXISTS ambassador_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_staff_referred_by ON staff_names(referred_by);

-- ------------------------------------------------------------
-- Fundador: el número lo da el orden de llegada, y se agota
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS camaut_founder_seq START 1;

-- Los que ya estaban, por fecha de alta: el número tiene que reflejar cuándo
-- llegaron de verdad y no cuándo corrimos esto
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM staff_names
    WHERE profile_id IS NOT NULL AND founder_number IS NULL
    ORDER BY created_at
  LOOP
    UPDATE staff_names SET founder_number = nextval('camaut_founder_seq') WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION asignar_numero_fundador()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo el camarero que se registró por su cuenta. Una ficha creada por el
  -- dueño de un local no es alguien que haya llegado a la app.
  IF NEW.profile_id IS NOT NULL AND NEW.founder_number IS NULL THEN
    NEW.founder_number := nextval('camaut_founder_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_numero_fundador ON staff_names;
CREATE TRIGGER trg_numero_fundador
  BEFORE INSERT OR UPDATE OF profile_id ON staff_names
  FOR EACH ROW EXECUTE FUNCTION asignar_numero_fundador();

-- ------------------------------------------------------------
-- Embajador: se calcula sobre datos reales, no sobre un contador que alguien
-- pueda empujar desde el navegador
-- ------------------------------------------------------------
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
    AND EXISTS (SELECT 1 FROM order_feedback f WHERE f.staff_id = s.id);

  IF v_validos >= 5 AND v_ya IS NULL THEN
    UPDATE staff_names SET ambassador_at = now() WHERE id = p_staff_id;
    -- Una sola vez: el premio va atado a que ambassador_at estuviera en null
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
