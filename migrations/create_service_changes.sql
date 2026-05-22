-- ============================================
-- Migration: create service_changes table
-- Date: 2026-05-22
-- ============================================

CREATE TABLE IF NOT EXISTS service_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  change_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT DEFAULT '',
  version TEXT DEFAULT '',
  change_type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_custom TEXT DEFAULT '',
  host_names TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE service_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON service_changes;
CREATE POLICY "Allow all access" ON service_changes FOR ALL USING (true) WITH CHECK (true);
