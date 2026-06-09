-- ============================================
-- Migration: 將舊 location 格式轉換為新結構
-- 舊格式: "A08櫃31-32U" 或 "A08櫃31U"
-- 新格式: location="A-08", rack_u_start=31, rack_u_size=2
-- Date: 2026-06-09
-- For: Local PostgreSQL (api schema)
-- ============================================

-- ── 1. 確保新欄位存在 ──
ALTER TABLE api.hardware_assets ADD COLUMN IF NOT EXISTS remote_ip TEXT DEFAULT '';
ALTER TABLE api.hardware_assets ADD COLUMN IF NOT EXISTS rack_u_start INT DEFAULT 0;
ALTER TABLE api.hardware_assets ADD COLUMN IF NOT EXISTS rack_u_size INT DEFAULT 1;

-- ── 2. 確保 racks 表存在 ──
CREATE TABLE IF NOT EXISTS api.racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT DEFAULT '',
  row_name TEXT DEFAULT '',
  total_u INT DEFAULT 42,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. 從舊 location 資料自動建立 racks ──
-- 提取不重複的機櫃編號（如 A08 → A-08）
INSERT INTO api.racks (name, label, row_name, sort_order)
SELECT DISTINCT
  -- "A08櫃..." → "A-08"
  substring(location from '^([A-Za-z])') || '-' ||
  lpad(substring(location from '^[A-Za-z](\d+)'), 2, '0') AS name,
  '' AS label,
  substring(location from '^([A-Za-z])') AS row_name,
  CAST(substring(location from '^[A-Za-z](\d+)') AS INT) AS sort_order
FROM api.hardware_assets
WHERE location ~ '^[A-Za-z]\d+櫃'
  AND NOT EXISTS (
    SELECT 1 FROM api.racks r
    WHERE r.name = substring(location from '^([A-Za-z])') || '-' ||
      lpad(substring(location from '^[A-Za-z](\d+)'), 2, '0')
  )
ON CONFLICT (name) DO NOTHING;

-- ── 4. 解析 location 並更新 rack_u_start / rack_u_size ──
-- 格式 1: "A08櫃31-32U" → start=31, size=2
-- 格式 2: "A08櫃31U"    → start=31, size=1
-- 格式 3: "A08櫃31"     → start=31, size=1
UPDATE api.hardware_assets
SET
  -- 機櫃名稱: "A08" → "A-08"
  location = substring(location from '^([A-Za-z])') || '-' ||
    lpad(substring(location from '^[A-Za-z](\d+)'), 2, '0'),
  -- 起始 U
  rack_u_start = CAST(substring(location from '櫃(\d+)') AS INT),
  -- U 大小: 如果有 "-" 則計算差值+1，否則為 1
  rack_u_size = CASE
    WHEN location ~ '櫃\d+-\d+' THEN
      CAST(substring(location from '櫃\d+-(\d+)') AS INT) -
      CAST(substring(location from '櫃(\d+)-') AS INT) + 1
    ELSE 1
  END
WHERE location ~ '^[A-Za-z]\d+櫃\d+';

-- ── 5. 驗證結果 ──
-- 執行後可用以下查詢確認：
-- SELECT name, location, rack_u_start, rack_u_size FROM api.hardware_assets WHERE rack_u_start > 0 ORDER BY location, rack_u_start;
-- SELECT * FROM api.racks ORDER BY row_name, sort_order;
