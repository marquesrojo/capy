-- ============================================================
-- MIGRACION 0003: comprobante de transferencia por alias
-- Ejecutar despues de 0001_init.sql y 0002_seed.sql
-- ============================================================

-- Nuevo estado de pago: el cliente subio comprobante pero el cajero
-- todavia no lo confirmo manualmente.
alter type payment_status add value if not exists 'en_revision';

-- Columna para guardar la URL del comprobante subido
alter table orders add column if not exists payment_proof_url text;

-- Quien y cuando confirmo el comprobante (auditoria del cajero)
alter table orders add column if not exists payment_confirmed_by uuid references profiles(id);
alter table orders add column if not exists payment_confirmed_at timestamptz;

-- ============================================================
-- STORAGE: bucket para comprobantes de pago
-- ============================================================
-- Ejecutar esto en el SQL Editor crea el bucket, pero las politicas de
-- Storage tambien se pueden configurar desde Storage > Policies en el
-- dashboard si este insert da error de permisos.

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- El cliente autenticado puede subir su propio comprobante
create policy "payment_proofs_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- El cliente ve su propio comprobante; el staff ve todos
create policy "payment_proofs_select_own_or_staff"
on storage.objects for select
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or is_staff()
  )
);

-- ============================================================
-- Permitir que el cliente actualice su propio pedido para
-- adjuntar el comprobante (la policy de UPDATE en orders ya
-- cubre esto - auth.uid() = customer_id - no se necesita cambio
-- ahi, queda documentado por claridad).
-- ============================================================
