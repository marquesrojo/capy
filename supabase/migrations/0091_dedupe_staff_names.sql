-- ============================================================
-- Deduplicar las fichas de camarero y evitar que vuelvan
--
-- En un local había 38 filas en staff_names para cinco personas: once "MATIAS
-- CAPY", ocho "MATIAS BORGES", cinco "Paola María Marotta". El causante estaba
-- en la pantalla de tomar pedido del admin: buscaba la ficha del usuario con
-- .maybeSingle(), que con dos filas del mismo nombre devuelve error y ninguna
-- fila, y entonces creaba una más. Con el primer duplicado, cada visita sumaba
-- otra. Ya está arreglado en la app; esto limpia lo que quedó.
--
-- Para cada nombre repetido dentro de un local se conserva una sola ficha —la
-- que tenga más XP y más pedidos, que es la que estuvo en uso— y todo lo que
-- apuntaba a las otras se repunta a esa. Nada se borra: las sobrantes quedan
-- inactivas, así ninguna referencia queda colgada.
-- ============================================================

-- ── 1. Elegir la ficha que se queda por (venue_id, nombre normalizado) ──
CREATE TEMP TABLE staff_dupes AS
WITH ranked AS (
  SELECT
    id,
    venue_id,
    lower(trim(full_name)) AS norm_name,
    first_value(id) OVER (
      PARTITION BY venue_id, lower(trim(full_name))
      ORDER BY COALESCE(xp, 0) DESC, COALESCE(total_orders, 0) DESC, id ASC
    ) AS keeper_id
  FROM staff_names
  WHERE is_active IS NOT false
)
SELECT id AS dupe_id, keeper_id, venue_id, norm_name
FROM ranked
WHERE id <> keeper_id;

-- ── 2. Repuntar todo lo que referenciaba a las duplicadas ──
UPDATE orders o
SET assigned_staff_id = d.keeper_id
FROM staff_dupes d
WHERE o.assigned_staff_id = d.dupe_id;

UPDATE order_feedback f
SET staff_id = d.keeper_id
FROM staff_dupes d
WHERE f.staff_id = d.dupe_id;

UPDATE venue_zones z
SET current_waiter_id = d.keeper_id
FROM staff_dupes d
WHERE z.current_waiter_id = d.dupe_id;

-- Estas tres pueden no existir en todos los entornos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    UPDATE support_tickets t SET staff_id = d.keeper_id
    FROM staff_dupes d WHERE t.staff_id = d.dupe_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'support_chats') THEN
    UPDATE support_chats c SET staff_id = d.keeper_id
    FROM staff_dupes d WHERE c.staff_id = d.dupe_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'staff_discounts') THEN
    -- staff_discounts es cascade: mover el descuento de una ficha que se va a
    -- desactivar mantiene el beneficio en la que queda
    UPDATE staff_discounts s SET staff_id = d.keeper_id
    FROM staff_dupes d WHERE s.staff_id = d.dupe_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'push_subscriptions') THEN
    DELETE FROM push_subscriptions p USING staff_dupes d WHERE p.staff_id = d.dupe_id;
  END IF;
END $$;

-- ── 3. Consolidar los contadores en la ficha que queda ──
UPDATE staff_names k
SET total_orders = k.total_orders + agg.orders_sum,
    xp = GREATEST(COALESCE(k.xp, 0), agg.xp_max)
FROM (
  SELECT d.keeper_id,
         COALESCE(SUM(s.total_orders), 0) AS orders_sum,
         COALESCE(MAX(s.xp), 0) AS xp_max
  FROM staff_dupes d
  JOIN staff_names s ON s.id = d.dupe_id
  GROUP BY d.keeper_id
) agg
WHERE k.id = agg.keeper_id;

-- ── 4. Dar de baja las sobrantes (no se borran: quedan referencias históricas) ──
UPDATE staff_names s
SET is_active = false
FROM staff_dupes d
WHERE s.id = d.dupe_id;

DROP TABLE staff_dupes;

-- ── 5. Que no se puedan volver a crear dos con el mismo nombre en un local ──
-- Solo entre las activas: una ficha vieja dada de baja no debe bloquear el alta
-- de alguien que se llama igual.
CREATE UNIQUE INDEX IF NOT EXISTS staff_names_venue_name_active_key
  ON staff_names (venue_id, lower(trim(full_name)))
  WHERE is_active IS NOT false;
