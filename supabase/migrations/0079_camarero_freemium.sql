-- ============================================================
-- Modelo freemium del camarero (Camaut) — versión simple
-- Ver docs/modelo-economico-camarero.md
--
-- Comanda por voz: GRATIS, sin límite.
-- Imágenes de carta con IA: 10 gratis (de por vida). Al superarlas, se compra
-- un pack de imágenes (10 por $8.000) con el mismo Mercado Pago que las
-- imágenes IA del venue (capy_settings.mp_access_token).
-- La unidad es la IMAGEN procesada con IA (una carta puede ser varias imágenes).
-- ============================================================

-- Cupo de imágenes con IA en el perfil del camarero
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_image_quota int NOT NULL DEFAULT 10;  -- gratis + compradas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ia_images_used int NOT NULL DEFAULT 0;    -- consumidas (de por vida)

-- ============================================================
-- Compras de packs de imágenes — idempotencia por pago de MP
-- Espejo de photo_pack_purchases (pack de fotos del venue)
-- ============================================================
CREATE TABLE IF NOT EXISTS camarero_image_purchases (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mp_payment_id text UNIQUE,
  amount_ars    numeric,
  images        int NOT NULL DEFAULT 10,   -- cuántas imágenes sumó el pack
  status        text NOT NULL DEFAULT 'approved',
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE camarero_image_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS camarero_image_purchases_select_own ON camarero_image_purchases;
CREATE POLICY camarero_image_purchases_select_own ON camarero_image_purchases
  FOR SELECT USING (staff_id = auth.uid());

-- ============================================================
-- RPC: consumir 1 imagen (al subir una imagen de carta con IA). Atómico.
-- Devuelve { allowed, remaining, limit }.
-- ============================================================
CREATE OR REPLACE FUNCTION consume_ia_image(p_staff uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota int;
  v_used  int;
BEGIN
  SELECT ia_image_quota, ia_images_used INTO v_quota, v_used
    FROM profiles WHERE id = p_staff FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', 0, 'error', 'staff_not_found');
  END IF;

  IF v_used >= v_quota THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_quota);
  END IF;

  UPDATE profiles SET ia_images_used = v_used + 1 WHERE id = p_staff;
  RETURN jsonb_build_object('allowed', true, 'remaining', v_quota - (v_used + 1), 'limit', v_quota);
END;
$$;

-- ============================================================
-- RPC: snapshot del cupo de imágenes (para la UI). No muta.
-- ============================================================
CREATE OR REPLACE FUNCTION get_camarero_image_quota(p_staff uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota int;
  v_used  int;
BEGIN
  SELECT ia_image_quota, ia_images_used INTO v_quota, v_used
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
-- RPC: sumar imágenes por compra de pack (desde el webhook, service role)
-- ============================================================
CREATE OR REPLACE FUNCTION add_camarero_images(p_staff uuid, p_images int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET ia_image_quota = ia_image_quota + p_images WHERE id = p_staff;
END;
$$;

-- ============================================================
-- RPC: devolver 1 imagen (si el procesamiento con IA falló tras consumir)
-- ============================================================
CREATE OR REPLACE FUNCTION refund_ia_image(p_staff uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET ia_images_used = GREATEST(ia_images_used - 1, 0) WHERE id = p_staff;
END;
$$;

-- ============================================================
-- Precio del pack de imágenes del camarero, editable por el superadmin
-- (mismo patrón que photo_pack_price del venue).
-- ============================================================
ALTER TABLE capy_settings ADD COLUMN IF NOT EXISTS camarero_image_pack_price numeric;
