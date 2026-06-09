-- Add icon column to hardware_categories
-- For: Supabase
ALTER TABLE hardware_categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'hard-drive';
