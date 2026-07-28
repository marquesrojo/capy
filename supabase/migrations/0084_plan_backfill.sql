-- ============================================================
-- Los locales que ya existen arrancan en Pro
--
-- venues.plan viene de 0026 con default 'free', pero hasta ahora ninguna
-- pantalla lo leía: todos los locales tienen 'free' guardado sin que eso
-- signifique nada. Al empezar a gatillar el menú de Mi Local por plan, ese
-- default silencioso dejaría a TODOS los locales en vigencia sin medios de
-- pago, WhatsApp, KPIs ni inventario de un día para el otro.
--
-- Se los pasa a 'pro' de una vez. El default sigue siendo 'free', así que los
-- locales nuevos nacen free y el plan se asigna desde el superadmin.
-- ============================================================

UPDATE venues SET plan = 'pro' WHERE plan = 'free';
