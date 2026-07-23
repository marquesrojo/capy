-- ============================================================
-- Modelo freemium del camarero (Camaut)
-- Ver docs/modelo-economico-camarero.md
--
-- Plan sin cargo: voz 40/mes, cartas 2 (de por vida).
-- Pack Pro (pago único ARS 9.000): voz 500/mes, +10 cartas, perfil pro.
-- Recargas: suman cupo de cartas.
-- ============================================================

-- Contadores de cupo de IA + estado Pro en el perfil del camarero
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_voice_period text;                 -- 'YYYY-MM' (hora AR)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_voice_used   int  NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_carta_quota  int  NOT NULL DEFAULT 2;  -- cupo total de cartas (de por vida)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_cartas_used  int  NOT NULL DEFAULT 0;  -- cartas consumidas (de por vida)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_active      boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_source      text;                     -- 'paid' | 'bonificado'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_activated_at timestamptz;

-- ============================================================
-- Compras del camarero (Pro / recargas) — idempotencia por pago de MP
-- Espejo de photo_pack_purchases (pack de fotos del venue)
-- ============================================================
CREATE TABLE IF NOT EXISTS camarero_pro_purchases (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind         text NOT NULL DEFAULT 'pro' CHECK (kind IN ('pro', 'recarga_cartas')),
  mp_payment_id text UNIQUE,
  amount_ars   numeric,
  cartas_added int,                 -- cuántas cartas sumó (recargas)
  status       text NOT NULL DEFAULT 'approved',
  approved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE camarero_pro_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS camarero_pro_purchases_select_own ON camarero_pro_purchases;
CREATE POLICY camarero_pro_purchases_select_own ON camarero_pro_purchases
  FOR SELECT USING (staff_id = auth.uid());

-- ============================================================
-- Referidos del camarero (camareros y locales)
-- ============================================================
CREATE TABLE IF NOT EXISTS camarero_referrals (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_staff_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_type     text NOT NULL CHECK (referred_type IN ('waiter', 'venue')),
  referred_id       uuid,           -- profile.id o venue.id según el tipo
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid')),
  reward            text,           -- 'pro' | 'recarga' | null
  created_at        timestamptz NOT NULL DEFAULT now(),
  validated_at      timestamptz
);
ALTER TABLE camarero_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS camarero_referrals_select_own ON camarero_referrals;
CREATE POLICY camarero_referrals_select_own ON camarero_referrals
  FOR SELECT USING (referrer_staff_id = auth.uid());

-- ============================================================
-- RPC: consumir cupo de IA (voz mensual con reset / cartas de por vida)
-- Atómico. SECURITY DEFINER: puede tocar los contadores del perfil.
-- Devuelve: { allowed, remaining, limit, pro, kind }
-- ============================================================
CREATE OR REPLACE FUNCTION consume_ia_quota(p_staff uuid, p_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro          boolean;
  v_voice_period text;
  v_voice_used   int;
  v_carta_quota  int;
  v_cartas_used  int;
  v_cur_period   text := to_char(now() AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM');
  v_limit        int;
  v_used         int;
  v_remaining    int;
BEGIN
  SELECT pro_active, ia_voice_period, ia_voice_used, ia_carta_quota, ia_cartas_used
    INTO v_pro, v_voice_period, v_voice_used, v_carta_quota, v_cartas_used
    FROM profiles WHERE id = p_staff FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', 0, 'pro', false, 'kind', p_kind, 'error', 'staff_not_found');
  END IF;

  IF p_kind = 'voice' THEN
    v_limit := CASE WHEN v_pro THEN 500 ELSE 40 END;
    -- reset mensual
    IF v_voice_period IS DISTINCT FROM v_cur_period THEN
      v_voice_used := 0;
    END IF;
    IF v_voice_used >= v_limit THEN
      RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'pro', v_pro, 'kind', 'voice');
    END IF;
    v_voice_used := v_voice_used + 1;
    UPDATE profiles SET ia_voice_used = v_voice_used, ia_voice_period = v_cur_period WHERE id = p_staff;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_limit - v_voice_used, 'limit', v_limit, 'pro', v_pro, 'kind', 'voice');

  ELSIF p_kind = 'carta' THEN
    v_limit := v_carta_quota;
    v_used  := v_cartas_used;
    IF v_used >= v_limit THEN
      RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'pro', v_pro, 'kind', 'carta');
    END IF;
    v_used := v_used + 1;
    UPDATE profiles SET ia_cartas_used = v_used WHERE id = p_staff;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_limit - v_used, 'limit', v_limit, 'pro', v_pro, 'kind', 'carta');
  END IF;

  RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', 0, 'pro', v_pro, 'kind', p_kind, 'error', 'unknown_kind');
END;
$$;

-- ============================================================
-- RPC: snapshot de cupos (para la UI). No muta contadores.
-- ============================================================
CREATE OR REPLACE FUNCTION get_camarero_quota(p_staff uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro          boolean;
  v_voice_period text;
  v_voice_used   int;
  v_carta_quota  int;
  v_cartas_used  int;
  v_cur_period   text := to_char(now() AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM');
  v_voice_limit  int;
  v_voice_eff    int;
BEGIN
  SELECT pro_active, ia_voice_period, ia_voice_used, ia_carta_quota, ia_cartas_used
    INTO v_pro, v_voice_period, v_voice_used, v_carta_quota, v_cartas_used
    FROM profiles WHERE id = p_staff;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'staff_not_found');
  END IF;

  v_voice_limit := CASE WHEN v_pro THEN 500 ELSE 40 END;
  v_voice_eff   := CASE WHEN v_voice_period IS DISTINCT FROM v_cur_period THEN 0 ELSE v_voice_used END;

  RETURN jsonb_build_object(
    'pro', v_pro,
    'voice_used', v_voice_eff,
    'voice_limit', v_voice_limit,
    'voice_remaining', GREATEST(v_voice_limit - v_voice_eff, 0),
    'carta_quota', v_carta_quota,
    'cartas_used', v_cartas_used,
    'carta_remaining', GREATEST(v_carta_quota - v_cartas_used, 0)
  );
END;
$$;

-- ============================================================
-- RPC: otorgar Pro (llamada desde el webhook con service role, o bonificado)
-- Suma 10 cartas al cupo la primera vez que se activa el Pro.
-- ============================================================
CREATE OR REPLACE FUNCTION grant_camarero_pro(p_staff uuid, p_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro boolean;
BEGIN
  SELECT pro_active INTO v_pro FROM profiles WHERE id = p_staff FOR UPDATE;
  IF v_pro THEN
    RETURN;  -- ya es Pro, no re-otorgar cupo
  END IF;
  UPDATE profiles
     SET pro_active = true,
         pro_source = p_source,
         pro_activated_at = now(),
         ia_carta_quota = ia_carta_quota + 10
   WHERE id = p_staff;
END;
$$;

-- ============================================================
-- RPC: sumar cartas por recarga (desde el webhook)
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
