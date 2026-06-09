-- Add maintenance_event_id to work_events for sync delete
-- For: Supabase
ALTER TABLE work_events ADD COLUMN IF NOT EXISTS maintenance_event_id UUID DEFAULT NULL;
