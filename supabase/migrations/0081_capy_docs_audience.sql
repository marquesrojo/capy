-- ============================================================
-- Audiencia de los documentos del asistente Capy
--
-- capy_docs alimenta el chat con IA (capy-chat), pero no distinguía a quién
-- le habla: al camarero en Capy Camarero se le inyectaba la misma
-- documentación escrita para el administrador del local (configurar zonas,
-- medios de pago, kitchen display).
--
-- 'all'    → se inyecta en los dos chats
-- 'venue'  → solo en el panel de administración del local
-- 'waiter' → solo en la app de Capy Camarero
--
-- Default 'all': todo lo ya cargado sigue comportándose igual.
-- ============================================================

ALTER TABLE capy_docs ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

ALTER TABLE capy_docs DROP CONSTRAINT IF EXISTS capy_docs_audience_check;
ALTER TABLE capy_docs ADD CONSTRAINT capy_docs_audience_check
  CHECK (audience IN ('all', 'venue', 'waiter'));
