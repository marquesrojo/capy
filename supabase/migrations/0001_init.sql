-- ============================================================
-- ESQUEMA INICIAL - Sistema de Pedidos para Restaurante/Club
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type order_status as enum (
  'pendiente_pago',   -- creado, esperando confirmacion de pago
  'recibido',         -- pago confirmado, cocina lo ve
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado'
);

create type payment_status as enum (
  'pendiente',
  'aprobado',
  'rechazado',
  'reembolsado'
);

create type location_type as enum (
  'mesa',     -- mesa numerada tradicional
  'zona',     -- zona predefinida (VIP, Terraza, Barra)
  'punto_mapa' -- punto marcado libremente en la vista aerea
);

-- ============================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'cliente' check (role in ('cliente', 'admin', 'cocina')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLA: venues (el local/club - permite multi-local a futuro)
-- ============================================================
create table venues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  map_image_url text,        -- imagen de la vista aerea/plano del local
  map_width numeric,          -- dimensiones originales de la imagen (px) para escalar el pin
  map_height numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLA: venue_zones (zonas predefinidas: VIP, Terraza, Barra, Mesa 1, etc)
-- ============================================================
create table venue_zones (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  type location_type not null default 'zona',
  -- coordenadas relativas (0 a 1) sobre map_image_url, para dibujar el pin de la zona
  map_x numeric,
  map_y numeric,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLA: categories (categorias de la carta)
-- ============================================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ============================================================
-- TABLA: products (items de la carta)
-- ============================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references venues(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true, -- la cocina puede marcar "agotado"
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABLA: orders (pedidos)
-- ============================================================
create table orders (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references venues(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete restrict,
  status order_status not null default 'pendiente_pago',

  -- ubicacion del cliente al momento del pedido
  location_type location_type not null,
  zone_id uuid references venue_zones(id) on delete set null, -- si elige zona predefinida
  map_x numeric,  -- si marca punto libre en el mapa (relativo 0-1)
  map_y numeric,
  location_label text, -- texto a mostrar al staff, ej "Mesa 5" o "Terraza - punto libre"

  notes text,           -- notas generales del pedido
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,

  payment_status payment_status not null default 'pendiente',
  payment_id text,        -- id de pago de Mercado Pago
  payment_method text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABLA: order_items (detalle del pedido)
-- ============================================================
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,   -- copia del nombre al momento del pedido (historico)
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  item_notes text,              -- ej "sin cebolla"
  line_total numeric(10,2) not null
);

-- ============================================================
-- TABLA: order_status_history (auditoria / registro de operaciones)
-- ============================================================
create table order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  note text
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Mantener updated_at en orders
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at();

-- Registrar automaticamente cada cambio de estado en el historial
create or replace function log_order_status_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into order_status_history (order_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), null);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_orders_log_status
after insert or update on orders
for each row execute function log_order_status_change();

-- Crear automaticamente un profile cuando se registra un usuario en auth.users
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone, 'cliente');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ============================================================
-- INDICES
-- ============================================================
create index idx_orders_venue_status on orders(venue_id, status);
create index idx_orders_customer on orders(customer_id);
create index idx_order_items_order on order_items(order_id);
create index idx_products_venue_category on products(venue_id, category_id);
create index idx_status_history_order on order_status_history(order_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table venues enable row level security;
alter table venue_zones enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;

-- Helper: saber si el usuario actual es admin o cocina
create or replace function is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'cocina')
  );
$$ language sql security definer stable;

-- profiles: el usuario ve y edita su propio perfil; staff ve todos
create policy "profiles_select_own_or_staff" on profiles
  for select using (auth.uid() = id or is_staff());
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- venues, zones, categories, products: lectura publica (clientes necesitan ver la carta), escritura solo staff
create policy "venues_select_all" on venues for select using (true);
create policy "venues_write_staff" on venues for all using (is_staff()) with check (is_staff());

create policy "zones_select_all" on venue_zones for select using (true);
create policy "zones_write_staff" on venue_zones for all using (is_staff()) with check (is_staff());

create policy "categories_select_all" on categories for select using (true);
create policy "categories_write_staff" on categories for all using (is_staff()) with check (is_staff());

create policy "products_select_all" on products for select using (true);
create policy "products_write_staff" on products for all using (is_staff()) with check (is_staff());

-- orders: cliente ve y crea solo las suyas; staff ve y actualiza todas
create policy "orders_select_own_or_staff" on orders
  for select using (auth.uid() = customer_id or is_staff());
create policy "orders_insert_own" on orders
  for insert with check (auth.uid() = customer_id);
create policy "orders_update_own_or_staff" on orders
  for update using (auth.uid() = customer_id or is_staff());

-- order_items: visibles si se puede ver el pedido padre
create policy "items_select_via_order" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_staff()))
  );
create policy "items_insert_via_order" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );

-- order_status_history: visible si se puede ver el pedido padre; insercion la hace el trigger (security definer)
create policy "history_select_via_order" on order_status_history
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_staff()))
  );
