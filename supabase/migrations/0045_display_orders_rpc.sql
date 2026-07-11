-- Public RPC for the pickup order display screen.
-- Callable by anonymous users; bypasses RLS via SECURITY DEFINER.
create or replace function get_display_orders(p_venue_id uuid)
returns table (
  id uuid,
  daily_number int,
  customer_name text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.id,
    o.daily_number,
    coalesce(c.full_name, 'Cliente') as customer_name,
    o.status::text,
    o.created_at
  from orders o
  left join customers c on c.id = o.customer_id
  where o.venue_id = p_venue_id
    and o.status::text = any(array['recibido', 'en_preparacion', 'listo'])
  order by o.created_at;
$$;

grant execute on function get_display_orders(uuid) to anon;
grant execute on function get_display_orders(uuid) to authenticated;
