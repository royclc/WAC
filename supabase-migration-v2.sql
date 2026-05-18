-- ============================================
-- MAC System - Supabase Migration V2
-- 新增: 工作月曆、請假、停機事件等表
-- ============================================

-- ── 工作事件（月曆） ──
CREATE TABLE IF NOT EXISTS work_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date DATE NOT NULL,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '17:00',
  is_all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3B82F6',
  assignees TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 請假記錄 ──
CREATE TABLE IF NOT EXISTS leave_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  leave_date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT false,
  half_day_period TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 停機事件（硬體可用率） ──
CREATE TABLE IF NOT EXISTS downtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL DEFAULT 'server',
  asset_id UUID NOT NULL,
  asset_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'downtime',
  plan_type TEXT NOT NULL DEFAULT 'unplanned',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 線路停機事件（網路可用率） ──
CREATE TABLE IF NOT EXISTS circuit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'unplanned',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──
ALTER TABLE work_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON work_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON leave_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE downtime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON downtime_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE circuit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON circuit_events FOR ALL USING (true) WITH CHECK (true);

-- ── 測試資料 ──

-- 工作事件
INSERT INTO work_events (title, description, event_date, start_time, end_time, is_all_day, color, assignees) VALUES
  ('伺服器維護', '定期維護作業', CURRENT_DATE, '09:00', '12:00', false, '#3B82F6', '管理員,操作員'),
  ('網路設備巡檢', '每月例行巡檢', CURRENT_DATE, '14:00', '17:00', false, '#10B981', '操作員'),
  ('防火牆規則更新', '更新安全規則', CURRENT_DATE + INTERVAL '2 days', '10:00', '11:00', false, '#F59E0B', '管理員'),
  ('系統備份', '全系統備份作業', CURRENT_DATE + INTERVAL '5 days', '00:00', '00:00', true, '#8B5CF6', '管理員,操作員'),
  ('UPS 電池檢測', '不斷電系統檢查', CURRENT_DATE + INTERVAL '7 days', '09:00', '12:00', false, '#EF4444', '操作員');

-- 請假記錄
INSERT INTO leave_records (user_name, leave_type, leave_date, is_half_day, half_day_period, note) VALUES
  ('操作員', 'annual', CURRENT_DATE, false, '', '出國旅遊'),
  ('管理員', 'personal', CURRENT_DATE + INTERVAL '3 days', true, 'morning', '看醫生'),
  ('操作員', 'sick', CURRENT_DATE + INTERVAL '10 days', false, '', '身體不適');
