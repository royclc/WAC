-- ============================================
-- Migration: add Firewall columns to service_changes
-- Date: 2026-05-22
-- ============================================

ALTER TABLE service_changes ADD COLUMN IF NOT EXISTS ticket_no TEXT DEFAULT '';
ALTER TABLE service_changes ADD COLUMN IF NOT EXISTS directions TEXT DEFAULT '';
ALTER TABLE service_changes ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT '';
ALTER TABLE service_changes ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false;
