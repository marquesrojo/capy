-- ============================================================
-- La base decía una cosa y el repo otra
--
-- 0005_multi_venue.sql declara así la relación entre una persona y su local:
--
--   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS venue_id uuid
--     REFERENCES venues(id) ON DELETE SET NULL;
--
-- En la base quedó en restrict. El IF NOT EXISTS explica cómo: la columna ya
-- existía cuando esa migración corrió, así que el ADD COLUMN no hizo nada y la
-- restricción que había siguió mandando. Desde entonces el repo describe un
-- comportamiento que la base no tiene.
--
-- La consecuencia práctica: no se puede borrar un local mientras quede alguien
-- apuntándolo. Apareció borrando las cuentas de prueba —cada perfil bloqueaba
-- su propio local personal— y hubo que vaciar el campo a mano antes.
--
-- Hoy la app no borra locales, así que esto no rompe nada para nadie. Se
-- corrige por otra razón: una divergencia entre el repo y la base es una
-- trampa silenciosa. Es lo mismo que pasó con el trigger de 0106, que vivía
-- solo en la base y tardó meses en encontrarse porque el código no lo nombraba.
--
-- Vaciar el campo es además lo correcto: si un local desaparece, la persona no
-- desaparece con él. Queda sin local, que es exactamente lo que pasó.
-- ============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_venue_id_fkey;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_venue_id_fkey
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;


-- ============================================================
-- order_feedback.staff_id se queda en restrict, a propósito
--
-- Es la otra que frenó el borrado, y la diferencia importa: acá restrict no es
-- un descuido, es la regla que corresponde. Una reseña es algo que un cliente
-- escribió sobre una persona; que se borre sola porque se borró la ficha del
-- camarero sería perder testimonio sin que nadie lo haya decidido.
--
-- Que borrar un camarero cueste un paso más es el precio, y está bien pagado:
-- obliga a mirar qué reseñas se están tirando antes de tirarlas.
--
-- Queda escrito para que la próxima vez que alguien choque contra esta FK sepa
-- que ya se miró y se decidió, en vez de "corregirla" como si fuera un olvido.
-- ============================================================
