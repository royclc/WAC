-- ============================================
-- Migration: create racks table + add rack position to hardware_assets
-- Date: 2026-06-05
-- For: Local PostgreSQL (api schema)
-- ============================================

CREATE TABLE IF NOT EXISTS api.racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT DEFAULT '',
  row_name TEXT DEFAULT '',
  total_u INT DEFAULT 42,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- hardware_assets 增加機櫃 U 位置欄位
ALTER TABLE api.hardware_assets ADD COLUMN IF NOT EXISTS rack_u_start INT DEFAULT 0;
ALTER TABLE api.hardware_assets ADD COLUMN IF NOT EXISTS rack_u_size INT DEFAULT 1;
