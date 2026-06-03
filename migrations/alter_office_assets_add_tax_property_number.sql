-- ============================================
-- Migration: add tax_property_number to office_assets
-- Date: 2026-06-03
-- For: Supabase
-- ============================================

ALTER TABLE office_assets ADD COLUMN IF NOT EXISTS tax_property_number TEXT DEFAULT '';
