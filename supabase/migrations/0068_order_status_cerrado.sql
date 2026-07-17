-- Estado terminal "cerrado": el pedido salió del tablero operativo
-- (cerrado desde el kanban o al cerrar la mesa) y queda solo en Historial.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cerrado';
