-- ============================================================
-- Adoptar pedidos cargados por el camarero
--
-- Cuando el camarero toma la comanda, el pedido nace sin dueño
-- (orders.customer_id = null): el cliente nunca tocó la app. Al compartirle
-- el link de la cuenta y crear su cuenta desde ahí, esos pedidos pasan a ser
-- suyos y entran en su historial y en el programa de rangos.
--
-- Va por RPC y no por UPDATE directo porque la policy de UPDATE de orders
-- deja escribir a cualquier sesión autenticada (la necesita la página pública
-- para "llamar al camarero"). Acá el filtro customer_id IS NULL es la regla:
-- un pedido que ya tiene dueño no se puede robar.
-- ============================================================

-- customers.whatsapp es NOT NULL y el alta por Google no lo pide: se guarda
-- vacío y el cliente lo completa después desde Mi cuenta.
CREATE OR REPLACE FUNCTION ensure_customer_row()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  INSERT INTO customers (id, full_name, whatsapp)
  SELECT
    u.id,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(COALESCE(u.email, ''), '@', 1)
    ),
    ''
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Adopta todos los pedidos huérfanos de una mesa (session_id).
-- Devuelve cuántos quedaron asignados.
CREATE OR REPLACE FUNCTION claim_session_orders(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL OR p_session_id IS NULL THEN RETURN 0; END IF;

  PERFORM ensure_customer_row();

  UPDATE orders
     SET customer_id = auth.uid()
   WHERE session_id = p_session_id
     AND customer_id IS NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Misma idea para un pedido suelto (mostrador, o mesa sin sesión abierta).
CREATE OR REPLACE FUNCTION claim_order(p_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL OR p_order_id IS NULL THEN RETURN 0; END IF;

  PERFORM ensure_customer_row();

  UPDATE orders
     SET customer_id = auth.uid()
   WHERE id = p_order_id
     AND customer_id IS NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION ensure_customer_row() FROM public;
GRANT EXECUTE ON FUNCTION ensure_customer_row() TO authenticated;
GRANT EXECUTE ON FUNCTION claim_session_orders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_order(uuid) TO authenticated;
