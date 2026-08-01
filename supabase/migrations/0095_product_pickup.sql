-- ============================================================
-- Dónde se come cada plato
--
-- No alcanza con "se puede llevar o no", porque el problema va para los dos
-- lados. Hay platos que en el salón salen bien y para llevar no: el que se
-- enfría en diez minutos, el que se arma delante del cliente, la copa de vino.
-- Y hay otros que existen solo para llevar: la porción familiar, el combo de
-- delivery, la docena para el freezer. El resto va en los dos casos, que es la
-- mayoría y por eso es el default.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS service_mode text NOT NULL DEFAULT 'ambos';

DO $$
BEGIN
  ALTER TABLE products
    ADD CONSTRAINT products_service_mode_check
    CHECK (service_mode IN ('ambos', 'salon', 'retiro'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN products.service_mode IS
  'ambos = se pide de las dos formas. salon = solo para consumir en el local. retiro = solo para llevar (retiro, retiro externo o delivery).';
