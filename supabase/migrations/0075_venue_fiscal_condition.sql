-- Condición fiscal del venue: determina qué comprobantes puede emitir.
-- responsable_inscripto → Factura A y B · monotributo → Factura C
ALTER TABLE venues ADD COLUMN IF NOT EXISTS fiscal_condition text NOT NULL DEFAULT 'responsable_inscripto'
  CHECK (fiscal_condition IN ('responsable_inscripto', 'monotributo'));
