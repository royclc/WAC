-- ============================================
-- Migration: add is_external to downtime_events and circuit_events
-- Date: 2026-05-25
-- ============================================

ALTER TABLE downtime_events ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;
ALTER TABLE circuit_events ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;
