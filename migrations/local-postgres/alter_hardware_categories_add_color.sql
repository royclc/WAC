-- Add color column to hardware_categories
-- For: Local PostgreSQL (api schema)
ALTER TABLE api.hardware_categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
