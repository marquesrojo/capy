create table staff_discounts (
  id uuid default gen_random_uuid() primary key,
  staff_id uuid references staff_names(id) on delete cascade not null,
  code text not null,
  label text,
  percent numeric not null check (percent >= 1 and percent <= 100),
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table staff_discounts enable row level security;

create policy "staff_discounts_own" on staff_discounts
  for all using (
    staff_id in (select id from staff_names where profile_id = auth.uid())
  ) with check (
    staff_id in (select id from staff_names where profile_id = auth.uid())
  );
