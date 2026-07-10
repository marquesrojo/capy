-- Description shown below venue name on client home
ALTER TABLE venues ADD COLUMN IF NOT EXISTS description text;

-- Daily announcement shown as banner on client home (can be cleared)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS announcement text;

-- Opening hours: { lunes: { active: bool, from: 'HH:MM', to: 'HH:MM' }, ... }
ALTER TABLE venues ADD COLUMN IF NOT EXISTS schedule jsonb;
# Fri Jul 10 13:11:09 UTC 2026
