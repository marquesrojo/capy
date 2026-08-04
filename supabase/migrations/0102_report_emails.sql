-- ============================================================
-- A quién más le llega el reporte diario
--
-- El destinatario estaba escrito adentro de la edge function, así que sumar a
-- alguien significaba editar código y redeployar. Acá van los que se agreguen,
-- separados por coma. El de siempre lo sigue recibiendo pase lo que pase: si
-- este campo queda mal escrito o vacío, el reporte no se pierde.
-- ============================================================

ALTER TABLE capy_settings ADD COLUMN IF NOT EXISTS report_emails text;
