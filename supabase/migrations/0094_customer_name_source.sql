-- ============================================================
-- El nombre de invitado es provisorio; el de la cuenta, no
--
-- Todo cliente arranca con una identidad anónima para no perder el pedido que
-- está haciendo. Si en el camino escribe un nombre, ese nombre es de apuro:
-- "rt", "asd", lo que salga. Cuando después entra con Google —que es cuando
-- empieza a tener historial, beneficios y descuentos por categoría— corresponde
-- que valga el nombre de su cuenta y no aquel.
--
-- Pero una vez que la persona lo edita en Mi cuenta, es suyo. En un bar hay
-- quien prefiere que lo llamen "Colo" y no como figura en su DNI, y un campo
-- editable que se revierte solo en el próximo login es peor que no tenerlo.
--
-- Esta columna recuerda cuál de los dos casos es.
-- ============================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS name_set_by_user boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN customers.name_set_by_user IS
  'true = lo editó la persona desde Mi cuenta y no se pisa. false = quedó de un pedido como invitado y el login lo reemplaza.';
