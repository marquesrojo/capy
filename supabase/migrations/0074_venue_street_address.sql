-- Dirección escrita del local (calle y número). Distinta de venues.address,
-- que guarda el link de Google Maps para la página de bienvenida.
-- Se usa como domicilio en la facturación electrónica.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS street_address text;
