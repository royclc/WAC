-- ============================================
-- Migration: add is_external to downtime_events and circuit_events
-- For local PostgreSQL + PostgREST (api schema)
-- Date: 2026-05-25
-- ============================================

ALTER TABLE api.downtime_events ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;
ALTER TABLE api.circuit_events ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;
