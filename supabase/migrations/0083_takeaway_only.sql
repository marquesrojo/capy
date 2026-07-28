-- ============================================================
-- Locales que solo trabajan para llevar
--
-- Un local sin salón no tiene mesas, ni camareros que llamar, ni un número de
-- pedido que pedirle a nadie: la home le ofrecía tres caminos que no existen.
-- Con takeaway_only la página del local muestra únicamente retiro y delivery.
--
-- Depende de retiro_externo_enabled / delivery_enabled (0024): sin ninguno de
-- los dos activo no habría forma de pedir, así que el admin no deja activarlo.
-- ============================================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS takeaway_only boolean NOT NULL DEFAULT false;
