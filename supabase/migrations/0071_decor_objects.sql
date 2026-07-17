-- Objetos de referencia en el mapa del salón (columnas, plantas, escenario...).
-- Son venue_zones con type='decor': se dibujan en todos los mapas pero no son
-- seleccionables ni ocupables. "color" define su color en el plano.
ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'decor';
ALTER TABLE venue_zones ADD COLUMN IF NOT EXISTS color text;
