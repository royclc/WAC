-- Add icon column to hardware_categories
-- For: Local PostgreSQL (api schema)
ALTER TABLE api.hardware_categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'hard-drive';
