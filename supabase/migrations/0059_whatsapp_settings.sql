ALTER TABLE capy_settings
  ADD COLUMN IF NOT EXISTS wa_phone_number_id text,
  ADD COLUMN IF NOT EXISTS wa_access_token text,
  ADD COLUMN IF NOT EXISTS wa_enabled boolean DEFAULT false;
