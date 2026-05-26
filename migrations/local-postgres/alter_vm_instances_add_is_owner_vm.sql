-- ============================================
-- Migration: add is_owner_vm to vm_instances
-- Date: 2026-05-25
-- For: Local PostgreSQL + PostgREST (api schema)
-- ============================================

ALTER TABLE api.vm_instances ADD COLUMN IF NOT EXISTS is_owner_vm BOOLEAN DEFAULT false;
