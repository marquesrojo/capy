ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS wa_notify_new_order boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS wa_notify_listo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS wa_notify_entregado boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS wa_notify_rechazado boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS wa_notify_reservation boolean DEFAULT true;
