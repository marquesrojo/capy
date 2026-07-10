-- Créditos extra de imágenes por venue, asignados manualmente desde superadmin.
-- Se usan cuando el cupo diario (localStorage) está agotado.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS extra_image_credits integer DEFAULT 0 NOT NULL;
