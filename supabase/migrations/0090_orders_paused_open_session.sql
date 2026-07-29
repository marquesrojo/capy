-- ============================================================
-- La pausa no alcanza a quien ya está comiendo
--
-- Pausar los pedidos sirve para que no entren mesas nuevas. Al que ya pidió la
-- entrada y quiere sumar el postre no se le puede cortar en el medio: quedó
-- sentado, con la cuenta abierta y sin forma de seguir.
--
-- Dos puertas:
--   · el cliente tiene un pedido sin cerrar en el local, dentro de la ventana
--     de horas (un pedido de ayer que nadie cerró no habilita a nadie);
--   · el pedido se suma a una sesión de mesa que sigue abierta, que es el caso
--     del que se sumó a la mesa de otro con "invitar a mi mesa".
--
-- "entregado" cuenta como abierto a propósito: comió, todavía no pagó.
-- ============================================================

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

  IF NOT EXISTS (SELECT 1 FROM venues WHERE id = NEW.venue_id AND orders_paused) THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.venue_id = NEW.venue_id
      AND o.customer_id = NEW.customer_id
      AND o.status NOT IN ('cerrado', 'cancelado')
      AND o.created_at > now() - interval '8 hours'
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.session_id = NEW.session_id
      AND o.status NOT IN ('cerrado', 'cancelado')
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'PEDIDOS_PAUSADOS'
    USING HINT = 'El local no está tomando pedidos en este momento.';
END;
$$;
