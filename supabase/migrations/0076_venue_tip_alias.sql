-- Alias de propinas del local: fallback cuando el pedido no tiene camarero
-- asignado (mostrador / autoservicio). Si hay camarero con alias personal,
-- la propina va a ese; si no, se muestra este alias del local.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS tip_alias text;
