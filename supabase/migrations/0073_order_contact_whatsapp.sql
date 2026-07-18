-- WhatsApp de contacto cargado por el cajero directamente en el pedido
-- (para mandar el ticket fiscal cuando el cliente no compartió su número).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_whatsapp text;
