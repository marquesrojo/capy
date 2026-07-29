-- ============================================================
-- ¿Se acumulan los descuentos?
--
-- Por defecto no: se aplica uno solo, primero la categoría del cliente y
-- después el código o el de efectivo. Un local que quiera premiar el efectivo
-- por encima de eso puede activarlo y que se sumen.
--
-- Arranca en false para no cambiarle el comportamiento a nadie.
-- ============================================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS stack_discounts boolean NOT NULL DEFAULT false;
