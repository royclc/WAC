-- Add remote_ip column to hardware_assets
-- For: Supabase
ALTER TABLE hardware_assets ADD COLUMN IF NOT EXISTS remote_ip TEXT DEFAULT '';
