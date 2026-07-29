-- 單位管理：新增「不列入可用率計算」欄位
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS exclude_from_availability BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN organizations.exclude_from_availability IS '若為 true，該單位的設備不列入網路統計報表可用率計算';
