-- Add remote_ip column to hardware_assets
-- For: Local PostgreSQL (api schema)
ALTER TABLE api.hardware_assets ADD COLUMN IF NOT EXISTS remote_ip TEXT DEFAULT '';
