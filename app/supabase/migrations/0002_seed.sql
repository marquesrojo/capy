-- ============================================================
-- SEED: datos de ejemplo para probar el sistema
-- Ejecutar despues de 0001_init.sql
-- ============================================================

insert into venues (id, name, map_width, map_height)
values ('00000000-0000-0000-0000-000000000001', 'Mi Club / Restaurante', 1000, 700);

-- Zonas: mesas del sector restaurante/bar + sectores generales del club
insert into venue_zones (venue_id, name, type, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Mesa 1', 'mesa', 1),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 2', 'mesa', 2),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 3', 'mesa', 3),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 4', 'mesa', 4),
  ('00000000-0000-0000-0000-000000000001', 'Barra', 'mesa', 5),
  ('00000000-0000-0000-0000-000000000001', 'Tribuna', 'zona', 6),
  ('00000000-0000-0000-0000-000000000001', 'Juegos chicos', 'zona', 7),
  ('00000000-0000-0000-0000-000000000001', 'Cancha de Pádel', 'zona', 8);

-- Categorias
insert into categories (id, venue_id, name, sort_order) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Tragos', 1),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Cerveza', 2),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Comida', 3);

-- Productos
insert into products (venue_id, category_id, name, description, price, sort_order) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Gin Tonic', 'Gin premium con tonica y citricos', 4500, 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Fernet con Coca', 'Clasico de la casa', 3800, 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Cerveza Rubia 500ml', 'Tirada, bien fria', 2800, 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Tabla de Picadas', 'Fiambres, quesos y pan', 8500, 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Papas Fritas', 'Porcion grande', 4200, 2);
