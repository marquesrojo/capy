-- Per-waiter WhatsApp number for call notifications
alter table staff_names add column if not exists whatsapp_number text;

-- Which waiter is currently assigned to a zone/mesa
alter table venue_zones add column if not exists current_waiter_id uuid references staff_names(id) on delete set null;

-- Venue-level fallback number for waiter call alerts (separate from kitchen WA)
alter table venues add column if not exists waiter_alert_whatsapp text;
