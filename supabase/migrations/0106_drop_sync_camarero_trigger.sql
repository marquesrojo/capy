-- ============================================================
-- Sacar el trigger que creaba fichas de camarero huérfanas
--
-- sync_camarero_to_staff_names() insertaba en staff_names cada vez que un
-- perfil con rol camarero se creaba o se actualizaba. Tres cosas mal en cuatro
-- líneas:
--
--   1. El venue estaba escrito a mano: '00000000-...-0001', el local semilla.
--      No importaba a qué local perteneciera el camarero, la ficha siempre caía
--      en ese. Para cualquier otro venue el trigger nunca funcionó.
--   2. No ponía profile_id, así que la ficha nacía sin dueño y la app no podía
--      relacionarla con nadie.
--   3. Disparaba también en UPDATE, y su ON CONFLICT DO NOTHING no servía
--      porque no hay restricción única sobre (venue_id, full_name). Cada
--      actualización del perfil dejaba otra fila.
--
-- Es código de cuando había un solo local. Hoy ese trabajo lo hace
-- ensureWaiterRecord: crea el venue personal del camarero y su ficha con el
-- profile_id puesto. Por eso el trigger se retira sin reemplazo.
--
-- El trigger vivía solo en la base, creado fuera de las migraciones. Esto queda
-- para que su ausencia sea una decisión registrada y no un misterio.
--
-- handle_new_user() no se toca: crear el perfil al registrarse está bien.
-- ============================================================

DROP TRIGGER IF EXISTS camarero_to_staff_names ON public.profiles;
DROP FUNCTION IF EXISTS sync_camarero_to_staff_names();
