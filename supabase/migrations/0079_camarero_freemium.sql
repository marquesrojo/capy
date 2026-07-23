-- ============================================================
-- Modelo freemium del camarero (Camaut) — versión simple
-- Ver docs/modelo-economico-camarero.md
--
-- Comanda por voz: GRATIS, sin límite.
-- Cartas con IA: 10 gratis (de por vida). Al superar las 10, se compra un
-- pack de cartas con el mismo Mercado Pago que las imágenes IA del venue
-- (capy_settings.mp_access_token).
-- ============================================================

-- Cupo de cartas con IA en el perfil del camarero
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_carta_quota int NOT NULL DEFAULT 10;  -- cartas gratis + compradas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_cartas_used int NOT NULL DEFAULT 0;    -- cartas consumidas (de por vida)

-- ============================================================
-- Compras de packs de cartas — idempotencia por pago de MP
-- Espejo de photo_pack_purchases (pack de fotos del venue)
-- ============================================================
CREATE TABLE IF NOT EXISTS camarero_carta_purchases (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mp_payment_id text UNIQUE,
  amount_ars    numeric,
  cartas        int NOT NULL DEFAULT 10,   -- cuántas cartas sumó el pack
  status        text NOT NULL DEFAULT 'approved',
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE camarero_carta_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS camarero_carta_purchases_select_own ON camarero_carta_purchases;
CREATE POLICY camarero_carta_purchases_select_own ON camarero_carta_purchases
  FOR SELECT USING (staff_id = auth.uid());

-- ============================================================
-- RPC: consumir 1 carta (al subir una carta con IA). Atómico.
-- Devuelve { allowed, remaining, limit }.
-- ============================================================
CREATE OR REPLACE FUNCTION consume_ia_carta(p_staff uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota int;
  v_used  int;
BEGIN
  SELECT ia_carta_quota, ia_cartas_used INTO v_quota, v_used
    FROM profiles WHERE id = p_staff FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', 0, 'error', 'staff_not_found');
  END IF;

  IF v_used >= v_quota THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_quota);
  END IF;

  UPDATE profiles SET ia_cartas_used = v_used + 1 WHERE id = p_staff;
  RETURN jsonb_build_object('allowed', true, 'remaining', v_quota - (v_used + 1), 'limit', v_quota);
END;
$$;

-- ============================================================
-- RPC: snapshot del cupo de cartas (para la UI). No muta.
-- ============================================================
CREATE OR REPLACE FUNCTION get_camarero_carta_quota(p_staff uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota int;
  v_used  int;
BEGIN
  SELECT ia_carta_quota, ia_cartas_used INTO v_quota, v_used
    FROM profiles WHERE id = p_staff;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'staff_not_found');
  END IF;
  RETURN jsonb_build_object(
    'quota', v_quota,
    'used', v_used,
    'remaining', GREATEST(v_quota - v_used, 0)
  );
END;
$$;

-- ============================================================
-- RPC: sumar cartas por compra de pack (desde el webhook, service role)
-- ============================================================
CREATE OR REPLACE FUNCTION add_camarero_cartas(p_staff uuid, p_cartas int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET ia_carta_quota = ia_carta_quota + p_cartas WHERE id = p_staff;
END;
$$;
