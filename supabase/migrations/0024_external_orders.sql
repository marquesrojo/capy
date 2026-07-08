-- Extend location_type enum for external orders
ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'retiro_externo';
ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'delivery';

-- Feature flags on venues
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS retiro_externo_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT false;

-- Extra data on orders for external order types
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_time timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_address text;
