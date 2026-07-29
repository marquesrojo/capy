-- ============================================================
-- Publicar las tablas que el tablero escucha en tiempo real
--
-- El admin y el mapa del salón se suscriben por postgres_changes a orders,
-- order_items, table_sessions y waiter_calls. Si esas tablas no están en la
-- publicación supabase_realtime, la suscripción se abre sin error pero no
-- llega ningún evento: el mapa queda pintado como al abrirlo y una mesa recién
-- ocupada no se pone en rojo hasta recargar.
--
-- Nunca se había versionado; dependía de que alguien lo tildara a mano en el
-- panel. Con esto queda en el repo y vale para cualquier entorno nuevo.
--
-- La app además relee cada pocos segundos por su cuenta, así que esto no es
-- imprescindible: lo que cambia es que el rojo aparezca al instante en vez de
-- en el siguiente barrido.
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders', 'order_items', 'table_sessions', 'waiter_calls']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
