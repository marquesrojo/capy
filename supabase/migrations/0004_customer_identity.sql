-- ============================================================
-- MIGRACION 0004: clientes sin login (nombre + whatsapp + token
-- de dispositivo), y renombrar rol "cocina" a "camarero"
-- Ejecutar despues de 0001, 0002 y 0003
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla de clientes "sin cuenta": identificados por un token
--    secreto generado en su dispositivo (localStorage), no por
--    auth.users. El nombre y el whatsapp sirven para que el
--    staff los ubique/contacte; el token es lo que prueba que
--    una request corresponde a ese cliente.
-- ------------------------------------------------------------
create table customers (
  id uuid primary key default uuid_generate_v4(),
  device_token uuid not null unique default uuid_generate_v4(),
  full_name text not null,
  whatsapp text not null,
  created_at timestamptz not null default now()
);

create index idx_customers_device_token on customers(device_token);

-- ------------------------------------------------------------
-- 2. orders.customer_id pasaba a referenciar profiles (=auth.users).
--    Ahora referencia a la nueva tabla customers.
-- ------------------------------------------------------------
alter table orders drop constraint if exists orders_customer_id_fkey;
alter table orders
  add constraint orders_customer_id_fkey
  foreign key (customer_id) references customers(id) on delete restrict;

-- ------------------------------------------------------------
-- 3. Helper: el customer_id que corresponde al device_token
--    enviado en el header 'x-device-token' de la request.
--    Supabase permite leer headers custom via current_setting
--    cuando se configuran en PostgREST (ver nota de uso abajo).
-- ------------------------------------------------------------
create or replace function current_customer_id()
returns uuid as $$
  select id from customers
  where device_token = (
    coalesce(current_setting('request.headers', true)::json->>'x-device-token', '')
  )::uuid
$$ language sql stable;

-- Nota de uso: el frontend debe llamar a supabase con un cliente que
-- mande el header 'x-device-token' en cada request (ver lib/supabase.js
-- actualizado). Si el header no esta presente o no matchea ningun
-- customer, current_customer_id() devuelve null y las policies de abajo
-- simplemente no dan acceso (comportamiento seguro por defecto).

-- ------------------------------------------------------------
-- 4. Actualizar roles de staff: 'cocina' -> 'camarero'
-- ------------------------------------------------------------
update profiles set role = 'camarero' where role = 'cocina';

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check
  check (role in ('admin', 'camarero'));

-- profiles.role ya no necesita el valor 'cliente' (los clientes ya no
-- tienen profile ni auth.users). El default ahora es 'camarero' para
-- cualquier alta nueva por SQL; el primer admin se sigue promoviendo
-- a mano como antes.
alter table profiles alter column role set default 'camarero';

-- ------------------------------------------------------------
-- 5. Actualizar is_staff() (ya funcionaba por rol en profiles, sigue
--    igual, solo lo dejamos documentado tras el cambio de nombres)
-- ------------------------------------------------------------
create or replace function is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'camarero')
  );
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- 6. RLS: customers
-- ------------------------------------------------------------
alter table customers enable row level security;

-- Cualquiera puede crear su registro de cliente (no requiere login)
create policy "customers_insert_public" on customers
  for insert with check (true);

-- Un cliente solo puede ver su propio registro (via su token); el staff ve todos
create policy "customers_select_own_or_staff" on customers
  for select using (id = current_customer_id() or is_staff());

-- Un cliente puede actualizar su propio nombre/whatsapp (ej. si se equivoco)
create policy "customers_update_own" on customers
  for update using (id = current_customer_id());

-- ------------------------------------------------------------
-- 7. RLS: orders, order_items, order_status_history
--    Reemplazan las policies viejas basadas en auth.uid() = customer_id
-- ------------------------------------------------------------
drop policy if exists "orders_select_own_or_staff" on orders;
drop policy if exists "orders_insert_own" on orders;
drop policy if exists "orders_update_own_or_staff" on orders;

create policy "orders_select_own_or_staff" on orders
  for select using (customer_id = current_customer_id() or is_staff());

create policy "orders_insert_own" on orders
  for insert with check (customer_id = current_customer_id());

-- El cliente puede actualizar su propio pedido SOLO mientras esta
-- pendiente de pago (ej. para adjuntar el comprobante de transferencia).
-- Una vez que el pedido avanza, solo el staff puede modificarlo.
create policy "orders_update_own_pending_or_staff" on orders
  for update using (
    (customer_id = current_customer_id() and status = 'pendiente_pago')
    or is_staff()
  );

drop policy if exists "items_select_via_order" on order_items;
drop policy if exists "items_insert_via_order" on order_items;

create policy "items_select_via_order" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.customer_id = current_customer_id() or is_staff()))
  );
create policy "items_insert_via_order" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = current_customer_id())
  );

drop policy if exists "history_select_via_order" on order_status_history;

create policy "history_select_via_order" on order_status_history
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.customer_id = current_customer_id() or is_staff()))
  );

-- ------------------------------------------------------------
-- 8. RLS: payment-proofs (Storage) - actualizar para usar
--    current_customer_id() en vez de auth.uid()
-- ------------------------------------------------------------
drop policy if exists "payment_proofs_insert_own" on storage.objects;
drop policy if exists "payment_proofs_select_own_or_staff" on storage.objects;

create policy "payment_proofs_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = current_customer_id()::text
);

create policy "payment_proofs_select_own_or_staff"
on storage.objects for select
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = current_customer_id()::text
    or is_staff()
  )
);
