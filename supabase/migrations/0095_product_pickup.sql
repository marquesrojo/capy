-- ============================================================
-- Qué se puede llevar y qué no
--
-- Hay platos que en el salón salen bien y para llevar no: el que se enfría en
-- diez minutos, el que se arma en la mesa, la copa de vino. Hasta acá la carta
-- era la misma se coma acá o se lleve, y el local se enteraba del problema
-- cuando alguien volvía a quejarse.
--
-- Por defecto todo se puede llevar: los locales que no tengan el problema no
-- tienen que tocar nada.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS available_for_pickup boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN products.available_for_pickup IS
  'false = solo para consumir en el local; no aparece cuando el pedido es para retiro o delivery.';
