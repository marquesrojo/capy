-- ============================================================
-- La página del camarero pasa a ser su forma de cobrar
--
-- Hasta ahora el alias para la propina solo aparecía adentro de un pedido, así
-- que un camarero que se registró solo —sin local vinculado— no tenía ninguna
-- forma de recibir una. Su página pública era un currículum: nivel, estrellas,
-- arquetipo. Nada para cobrar.
--
-- Dos cambios para que esa página funcione desde el primer día:
--
-- 1. Se puede calificar sin haber pedido. Un camarero recién registrado no
--    tiene pedidos, y sin calificaciones su reputación no arranca nunca. La
--    contra es obvia: cualquiera puede calificar, incluido él mismo. No se
--    bloquea, se distingue — una calificación con pedido es verificada, una
--    suelta no, y la página lo dice. Quien la mira sabe qué está mirando.
--
-- 2. Cada camarero decide qué se ve. Puede querer el QR para la propina sin
--    exponer sus estrellas mientras arranca, o apagar la página entera.
-- ============================================================

-- Sin pedido: la calificación queda igual de asociada al camarero
ALTER TABLE order_feedback ALTER COLUMN order_id DROP NOT NULL;

-- Una por dispositivo. No es infalible —se borra el storage y listo— pero
-- corta el caso obvio de sentarse a farmear cinco estrellas.
ALTER TABLE order_feedback ADD COLUMN IF NOT EXISTS device_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_una_por_dispositivo
  ON order_feedback (staff_id, device_id)
  WHERE order_id IS NULL AND device_id IS NOT NULL AND staff_id IS NOT NULL;

-- Qué muestra su página. Los dos arrancan prendidos: el que se registra quiere
-- que lo vean, y apagarlo es la excepción.
ALTER TABLE staff_names
  ADD COLUMN IF NOT EXISTS public_page_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_ratings_enabled boolean NOT NULL DEFAULT true;
