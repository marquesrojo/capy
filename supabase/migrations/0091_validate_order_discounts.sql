-- ============================================================
-- El descuento de un pedido del cliente se valida contra el local del pedido
--
-- Hasta acá los montos —subtotal, descuentos, total— viajaban calculados por el
-- navegador y la base los aceptaba como vinieran. Alcanzó con un bug de front
-- para que el descuento de una categoría de un local se aplicara pidiendo en
-- otro: el cliente era el mismo usuario, y nada del lado del servidor miraba a
-- qué local pertenecía ese descuento.
--
-- El trigger no recalcula el precio: pone un techo. Calcula cuánto es lo máximo
-- que ESE local le podía descontar a ESE cliente, y si lo declarado se pasa, lo
-- recorta y corrige el total por la misma diferencia.
--
-- Recorta en vez de rechazar a propósito. Un pedido rechazado deja al cliente
-- trabado en la mesa sin saber por qué; uno recortado entra con el precio que
-- corresponde, y la diferencia queda en el log del servidor.
--
-- QUÉ GARANTIZA: que un descuento de otro local no se aplique acá, y que el
-- descuento total no supere lo máximo que este local ofrece.
-- QUÉ NO: no verifica que el cliente haya tipeado realmente ese código. Si el
-- local tiene un código público del 20%, el techo es 20% aunque no lo haya
-- usado. Es un límite, no una reliquidación.
--
-- El staff queda afuera: la comanda del camarero aplica también descuentos
-- personales (staff_discounts), que no cuelgan del local sino del camarero, y
-- la ficha de un camarero vinculado vive en su venue propio. Todas esas
-- escrituras pasan por una sesión de staff autenticada, así que se reconocen
-- con is_staff(). Lo que se valida es justo lo que puede forjar un cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_order_discounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stack     boolean := false;
  v_cash_pct  numeric := 0;
  v_cat_pct   numeric := 0;
  v_code_pct  numeric := 0;
  v_base      numeric := COALESCE(NEW.subtotal, 0);
  v_cash      numeric := COALESCE(NEW.cash_discount_amount, 0);
  v_other     numeric := COALESCE(NEW.discount_amount, 0);
  v_cash_max  numeric;
  v_other_max numeric;
  v_cash_old  numeric := 0;
  v_other_old numeric := 0;
  v_recortado numeric := 0;
BEGIN
  -- Sin descuento declarado no hay nada que validar
  IF v_cash <= 0 AND v_other <= 0 THEN
    RETURN NEW;
  END IF;

  -- La comanda del camarero tiene sus propias reglas
  IF is_staff() THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(v.stack_discounts, false),
         CASE WHEN COALESCE(v.cash_discount_enabled, false)
              THEN COALESCE(v.cash_discount_percent, 0) ELSE 0 END
    INTO v_stack, v_cash_pct
  FROM venues v
  WHERE v.id = NEW.venue_id;

  -- Acá se cierra la filtración: la categoría vale en el local dueño de la
  -- categoría y en ningún otro
  IF NEW.customer_id IS NOT NULL THEN
    SELECT COALESCE(MAX(dc.discount_percent), 0)
      INTO v_cat_pct
    FROM discount_categories dc
    JOIN discount_category_members m ON m.category_id = dc.id
    WHERE dc.venue_id = NEW.venue_id
      AND m.customer_id = NEW.customer_id;
  END IF;

  SELECT COALESCE(MAX(d.percent), 0)
    INTO v_code_pct
  FROM venue_discounts d
  WHERE d.venue_id = NEW.venue_id
    AND d.is_active
    AND COALESCE(d.is_cash_discount, false) = false;

  v_cash_max := ROUND(v_base * LEAST(v_cash_pct, 100) / 100);
  v_other_max := ROUND(
    v_base * LEAST(
      CASE WHEN v_stack THEN v_cat_pct + v_code_pct
           ELSE GREATEST(v_cat_pct, v_code_pct) END,
      100
    ) / 100
  );

  -- Solo se controla lo que este UPDATE aumenta. Un pedido cargado por el
  -- camarero puede traer un descuento personal más alto que cualquiera del
  -- local; cuando después el cliente pide la cuenta desde su celular, ese
  -- UPDATE no tiene por qué recortar lo que ya estaba aceptado.
  IF TG_OP = 'UPDATE' THEN
    v_cash_old := COALESCE(OLD.cash_discount_amount, 0);
    v_other_old := COALESCE(OLD.discount_amount, 0);
    v_cash_max := GREATEST(v_cash_max, v_cash_old);
    v_other_max := GREATEST(v_other_max, v_other_old);
  END IF;

  IF v_cash > v_cash_max THEN
    v_recortado := v_recortado + (v_cash - v_cash_max);
    NEW.cash_discount_amount := NULLIF(v_cash_max, 0);
  END IF;

  IF v_other > v_other_max THEN
    v_recortado := v_recortado + (v_other - v_other_max);
    NEW.discount_amount := NULLIF(v_other_max, 0);
    IF v_other_max = 0 THEN
      NEW.discount_code := NULL;
    END IF;
  END IF;

  IF v_recortado > 0 THEN
    -- El total se corrige por la diferencia en vez de recalcularse, para no
    -- pisar cualquier otro ajuste que el pedido ya traiga
    NEW.total := GREATEST(COALESCE(NEW.total, 0) + v_recortado, 0);
    RAISE WARNING
      'Descuento recortado en pedido del local %: declarado % (efectivo %, otros %), máximo % + %',
      NEW.venue_id, v_cash + v_other, v_cash, v_other, v_cash_max, v_other_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_discounts ON orders;
CREATE TRIGGER trg_validate_order_discounts
  BEFORE INSERT OR UPDATE OF subtotal, total, discount_amount, cash_discount_amount
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_discounts();
