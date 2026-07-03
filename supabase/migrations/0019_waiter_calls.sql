-- Tabla para llamadas anónimas al camarero desde la landing del restaurante
create table waiter_calls (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references venues(id) on delete cascade,
  zone_id uuid references venue_zones(id) on delete set null,
  location_label text not null,
  called_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table waiter_calls enable row level security;

-- Clientes anónimos pueden insertar
create policy "waiter_calls_insert_anon" on waiter_calls
  for insert to anon with check (true);

-- Staff puede ver y resolver las llamadas de su local
create policy "waiter_calls_select_staff" on waiter_calls
  for select using (is_staff());

create policy "waiter_calls_update_staff" on waiter_calls
  for update using (is_staff());
