-- Allow authenticated users to insert their own profile row.
-- Needed when the handle_new_user trigger fails to fire (edge case with
-- some OAuth or test signups). Without this policy, those users get stuck
-- at the login redirect loop because the profile never gets created.
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
