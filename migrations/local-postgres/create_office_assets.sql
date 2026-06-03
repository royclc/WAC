-- ============================================
-- Migration: create office_assets table
-- Date: 2026-06-03
-- For: Local PostgreSQL (api schema)
-- ============================================

CREATE TABLE IF NOT EXISTS api.office_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL DEFAULT '主機',
  asset_type_other TEXT DEFAULT '',
  is_cht_asset BOOLEAN DEFAULT false,
  user_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  property_number TEXT DEFAULT '',
  cht_asset_id TEXT DEFAULT '',
  network_zone TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  hostname TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
