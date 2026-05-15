-- ============================================
-- MAC (Monthly Availability Calendar) Schema
-- ============================================

-- 1. 使用者資料表
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  department TEXT,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- 2. 資產類型：server / network
CREATE TYPE public.asset_type AS ENUM ('server', 'network');

-- 3. 資產清單
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type asset_type NOT NULL,
  name TEXT NOT NULL,
  ip_address TEXT,
  location TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assets_type ON public.assets(type);
CREATE INDEX idx_assets_active ON public.assets(is_active) WHERE is_active = true;

-- 4. 設備可用率事件（斷線記錄）
CREATE TABLE public.availability_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'downtime' CHECK (event_type IN ('downtime', 'maintenance', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes NUMERIC GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
  ) STORED,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_avail_events_asset ON public.availability_events(asset_id);
CREATE INDEX idx_avail_events_time ON public.availability_events(start_time, end_time);

-- 5. 工作月曆事件
CREATE TABLE public.work_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3B82F6',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_work_events_date ON public.work_events(event_date);

-- 6. 工作事件 ↔ 使用者（多對多）
CREATE TABLE public.work_event_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_event_id UUID NOT NULL REFERENCES public.work_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(work_event_id, user_id)
);

CREATE INDEX idx_assignees_event ON public.work_event_assignees(work_event_id);
CREATE INDEX idx_assignees_user ON public.work_event_assignees(user_id);

-- 7. 請假記錄
CREATE TABLE public.leave_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'personal', 'official', 'other')),
  leave_date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT false,
  half_day_period TEXT CHECK (half_day_period IN ('morning', 'afternoon')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leave_user ON public.leave_records(user_id);
CREATE INDEX idx_leave_date ON public.leave_records(leave_date);

-- 8. 保養記錄
CREATE TYPE public.maintenance_category AS ENUM ('hvac', 'fire', 'electrical', 'generator', 'server', 'network');

CREATE TABLE public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category maintenance_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  contractor TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maintenance_date ON public.maintenance_records(event_date);
CREATE INDEX idx_maintenance_category ON public.maintenance_records(category);

-- ============================================
-- Views
-- ============================================

-- 月度設備可用率統計 view
CREATE OR REPLACE VIEW public.monthly_availability AS
SELECT
  a.id AS asset_id,
  a.type AS asset_type,
  a.name AS asset_name,
  DATE_TRUNC('month', e.start_time) AS month,
  COUNT(e.id) AS event_count,
  COALESCE(SUM(e.duration_minutes), 0) AS total_downtime_minutes,
  ROUND(
    (1 - COALESCE(SUM(e.duration_minutes), 0) / (
      EXTRACT(DAY FROM (DATE_TRUNC('month', e.start_time) + INTERVAL '1 month' - DATE_TRUNC('month', e.start_time))) * 24 * 60
    )) * 100, 4
  ) AS availability_pct
FROM public.assets a
LEFT JOIN public.availability_events e ON e.asset_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.type, a.name, DATE_TRUNC('month', e.start_time);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_event_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- 所有登入使用者可讀取
CREATE POLICY "users_read" ON public.users FOR SELECT USING (true);
CREATE POLICY "assets_read" ON public.assets FOR SELECT USING (true);
CREATE POLICY "avail_events_read" ON public.availability_events FOR SELECT USING (true);
CREATE POLICY "work_events_read" ON public.work_events FOR SELECT USING (true);
CREATE POLICY "assignees_read" ON public.work_event_assignees FOR SELECT USING (true);
CREATE POLICY "leave_read" ON public.leave_records FOR SELECT USING (true);
CREATE POLICY "maintenance_read" ON public.maintenance_records FOR SELECT USING (true);

CREATE POLICY "user_maintenance_insert" ON public.maintenance_records FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "user_maintenance_update" ON public.maintenance_records FOR UPDATE
  USING (auth.uid() = created_by);

-- Admin 可完整操作
CREATE POLICY "admin_users_all" ON public.users FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "admin_assets_all" ON public.assets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- 使用者可建立/修改自己的工作事件
CREATE POLICY "user_work_events_insert" ON public.work_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "user_work_events_update" ON public.work_events FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "user_work_events_delete" ON public.work_events FOR DELETE
  USING (auth.uid() = created_by);

-- 使用者可管理自己的請假
CREATE POLICY "user_leave_insert" ON public.leave_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_leave_update" ON public.leave_records FOR UPDATE
  USING (auth.uid() = user_id);

-- 所有登入使用者可建立可用率事件
CREATE POLICY "user_avail_insert" ON public.availability_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "user_avail_update" ON public.availability_events FOR UPDATE
  USING (auth.uid() = created_by);

-- ============================================
-- Seed: 預設 admin 帳號
-- ============================================
-- 密碼需透過 Supabase Auth 建立，這裡僅為 schema 記錄
-- INSERT INTO public.users (email, name, role, password_hash)
-- VALUES ('admin@mac.local', 'Admin', 'admin', 'SET_VIA_AUTH');

-- ============================================
-- Functions
-- ============================================

-- 計算指定資產在指定月份的可用率
CREATE OR REPLACE FUNCTION public.calc_availability(
  p_asset_id UUID,
  p_year INT,
  p_month INT
) RETURNS TABLE(
  total_hours NUMERIC,
  downtime_hours NUMERIC,
  uptime_hours NUMERIC,
  availability_pct NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
  month_start TIMESTAMPTZ;
  month_end TIMESTAMPTZ;
  total_mins NUMERIC;
  down_mins NUMERIC;
BEGIN
  month_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Asia/Taipei');
  month_end := month_start + INTERVAL '1 month';
  total_mins := EXTRACT(EPOCH FROM (month_end - month_start)) / 60;

  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (
      LEAST(e.end_time, month_end) - GREATEST(e.start_time, month_start)
    )) / 60
  ), 0)
  INTO down_mins
  FROM public.availability_events e
  WHERE e.asset_id = p_asset_id
    AND e.start_time < month_end
    AND e.end_time > month_start;

  RETURN QUERY SELECT
    ROUND(total_mins / 60, 2),
    ROUND(down_mins / 60, 2),
    ROUND((total_mins - down_mins) / 60, 2),
    ROUND((1 - down_mins / total_mins) * 100, 4);
END;
$$;
