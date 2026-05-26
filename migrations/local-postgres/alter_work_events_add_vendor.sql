-- ============================================
-- Migration: add vendor column to work_events
-- For local PostgreSQL + PostgREST (api schema)
-- Date: 2026-05-25
-- ============================================

ALTER TABLE api.work_events ADD COLUMN IF NOT EXISTS vendor TEXT DEFAULT '';
