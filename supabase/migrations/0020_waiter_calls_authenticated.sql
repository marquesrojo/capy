-- Allow authenticated customers (anonymous sessions from previous orders) to
-- insert waiter calls. The original policy only covered the anon role, which
-- fails when the customer already has a persisted Supabase session.
create policy "waiter_calls_insert_authenticated" on waiter_calls
  for insert to authenticated with check (true);
