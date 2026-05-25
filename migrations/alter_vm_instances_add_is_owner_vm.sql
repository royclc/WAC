-- ============================================
-- Migration: add is_owner_vm to vm_instances
-- Date: 2026-05-25
-- For: Supabase
-- ============================================

ALTER TABLE vm_instances ADD COLUMN IF NOT EXISTS is_owner_vm BOOLEAN DEFAULT false;
