-- ============================================
-- MAC System - Local PostgreSQL Setup
-- 適用於本地 PostgreSQL + PostgREST
-- ============================================

-- 建立資料庫（如果需要）
-- CREATE DATABASE mac_system;
-- \c mac_system;

-- 啟用必要擴充
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 設定搜尋路徑
SET search_path TO public;

-- ============================================
-- Tables
-- ============================================

-- ── 廠商 ──
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 硬體類別 ──
CREATE TABLE IF NOT EXISTS public.hardware_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 硬體型號 ──
CREATE TABLE IF NOT EXISTS public.hardware_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.hardware_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 硬體資產 ──
CREATE TABLE IF NOT EXISTS public.hardware_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_key TEXT NOT NULL,
  model TEXT DEFAULT '',
  vendor TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 保養類別 ──
CREATE TABLE IF NOT EXISTS public.maintenance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#06B6D4',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 保養記錄 ──
CREATE TABLE IF NOT EXISTS public.maintenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date DATE NOT NULL,
  contractor TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 單位(組織) ──
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('headquarters', 'branch', 'office')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 單位設備 ──
CREATE TABLE IF NOT EXISTS public.org_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('internal', 'external')),
  device_type TEXT NOT NULL,
  vendor TEXT DEFAULT '宏華',
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 單位電路 ──
CREATE TABLE IF NOT EXISTS public.org_circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  circuit_number TEXT NOT NULL,
  bandwidth TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 事件類型 ──
CREATE TABLE IF NOT EXISTS public.event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 使用者 ──
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  password_hash TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 線路管理 ──
CREATE TABLE IF NOT EXISTS public.circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_number TEXT NOT NULL,
  bandwidth TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  vendor TEXT DEFAULT '',
  unit_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 工作事件（月曆） ──
CREATE TABLE IF NOT EXISTS public.work_events (
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
CREATE TABLE IF NOT EXISTS public.leave_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  leave_date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT false,
  half_day_period TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 停機事件 ──
CREATE TABLE IF NOT EXISTS public.downtime_events (
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

-- ── 線路停機事件 ──
CREATE TABLE IF NOT EXISTS public.circuit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'unplanned',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 登入驗證 Function
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_password(user_email TEXT, user_password TEXT)
RETURNS TABLE(id UUID, name TEXT, email TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.role
  FROM public.users u
  WHERE u.email = user_email
    AND u.password_hash = crypt(user_password, u.password_hash)
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PostgREST 角色與權限
-- ============================================

-- 匿名角色（PostgREST 使用）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'mysecretpassword';
  END IF;
END
$$;

GRANT anon TO authenticator;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;

-- 允許呼叫 function
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
