-- ============================================================
-- Pausar los pedidos del cliente sin cerrar la carta
--
-- Hay momentos —cocina desbordada, faltante de mercadería, un corte— en los
-- que el local quiere que la gente siga mirando la carta pero no pueda mandar
-- pedidos. Hasta ahora lo único disponible era "alta demanda", que solo avisa
-- de una demora y no frena nada.
--
-- La pausa es para el cliente. El camarero y el mostrador siguen cargando
-- pedidos: son justamente los que ordenan el caos cuando se pausa la app.
-- ============================================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS orders_paused boolean NOT NULL DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS orders_paused_message text;

-- Que la pausa valga de verdad, no solo en la pantalla: el cliente inserta el
-- pedido directo contra la tabla, así que sin esto alcanza con tener el
-- checkout abierto de antes para saltearla.
CREATE OR REPLACE FUNCTION orders_reject_when_paused()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    -- Sin usuario es el backend (service role): las edge functions no se pausan
    RETURN NEW;
  END IF;
  -- No se mira created_by_staff: lo manda el cliente en el insert, así que
  -- confiar en esa bandera sería dejar la puerta abierta. El mostrador carga
  -- por /admin/tomar, con sesión de staff, y entra por is_staff().
  IF is_staff() THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM venues WHERE id = NEW.venue_id AND orders_paused) THEN
    RAISE EXCEPTION 'PEDIDOS_PAUSADOS'
      USING HINT = 'El local no está tomando pedidos en este momento.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_reject_when_paused_trg ON orders;
CREATE TRIGGER orders_reject_when_paused_trg
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_reject_when_paused();
