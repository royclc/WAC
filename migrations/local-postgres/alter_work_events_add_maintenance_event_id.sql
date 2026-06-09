-- Add maintenance_event_id to work_events for sync delete
-- For: Local PostgreSQL (api schema)
ALTER TABLE api.work_events ADD COLUMN IF NOT EXISTS maintenance_event_id UUID DEFAULT NULL;
