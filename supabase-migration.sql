-- ============================================
-- MAC System - Supabase Migration
-- ============================================

-- ── 廠商 ──
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 硬體類別 ──
CREATE TABLE IF NOT EXISTS hardware_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 硬體型號 ──
CREATE TABLE IF NOT EXISTS hardware_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES hardware_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 硬體資產 ──
CREATE TABLE IF NOT EXISTS hardware_assets (
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
CREATE TABLE IF NOT EXISTS maintenance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#06B6D4',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 保養記錄 ──
CREATE TABLE IF NOT EXISTS maintenance_events (
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
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('headquarters', 'branch', 'office')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 單位設備 ──
CREATE TABLE IF NOT EXISTS org_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('internal', 'external')),
  device_type TEXT NOT NULL,
  vendor TEXT DEFAULT '宏華',
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 單位電路 ──
CREATE TABLE IF NOT EXISTS org_circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  circuit_number TEXT NOT NULL,
  bandwidth TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 事件類型 ──
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 使用者 ──
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  password_hash TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 網路單位(網路管理) ──
CREATE TABLE IF NOT EXISTS network_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone TEXT DEFAULT '',
  device_type TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  vendor TEXT DEFAULT '',
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 線路管理 ──
CREATE TABLE IF NOT EXISTS circuits (
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

-- ============================================
-- RLS: 暫時全開（開發階段）
-- ============================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON vendors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE hardware_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON hardware_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE hardware_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON hardware_models FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE hardware_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON hardware_assets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE maintenance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON maintenance_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE maintenance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON maintenance_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON organizations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE org_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON org_devices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE org_circuits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON org_circuits FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON event_types FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE network_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON network_units FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON circuits FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Seed Data (初始資料)
-- ============================================

-- 廠商
INSERT INTO vendors (name, contact_person, phone, email, description) VALUES
  ('宏華', '李經理', '02-1234-5678', 'lee@honghua.com', '網路設備供應商'),
  ('HPE', '張業務', '02-8765-4321', 'chang@hpe.com', 'x86伺服器供應商'),
  ('NetApp', '王工程師', '02-2222-3333', 'wang@netapp.com', '儲存設備供應商'),
  ('大金空調', '陳先生', '02-3333-4444', 'chen@daikin.com', '空調設備維護'),
  ('永安消防', '林主任', '02-5555-6666', 'lin@yongan.com', '消防設備維護'),
  ('台電機電', '吳工程師', '02-7777-8888', 'wu@taipower.com', '發電機與機電維護');

-- 硬體類別 + 型號
INSERT INTO hardware_categories (key, label, sort_order) VALUES
  ('x86_server', 'x86伺服器', 1),
  ('storage', '儲存裝置', 2);

INSERT INTO hardware_models (category_id, name)
SELECT id, 'HPE 380' FROM hardware_categories WHERE key = 'x86_server'
UNION ALL
SELECT id, 'HPE 360' FROM hardware_categories WHERE key = 'x86_server'
UNION ALL
SELECT id, 'NetApp' FROM hardware_categories WHERE key = 'storage'
UNION ALL
SELECT id, '磁帶機' FROM hardware_categories WHERE key = 'storage';

-- 硬體資產
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description) VALUES
  ('Web Server 01', 'x86_server', 'HPE 380', 'HPE', '192.168.1.10', '機房A', '主要網頁伺服器'),
  ('DB Server 01', 'x86_server', 'HPE 380', 'HPE', '192.168.1.20', '機房A', '資料庫伺服器'),
  ('AP Server 01', 'x86_server', 'HPE 360', 'HPE', '192.168.1.30', '機房B', '應用程式伺服器'),
  ('AP Server 02', 'x86_server', 'HPE 360', 'HPE', '192.168.1.31', '機房B', '備援應用伺服器'),
  ('NetApp FAS01', 'storage', 'NetApp', 'NetApp', '192.168.1.50', '機房A', '主要儲存設備'),
  ('備份磁帶機 01', 'storage', '磁帶機', 'HPE', '192.168.1.60', '機房A', '磁帶備份裝置');

-- 保養類別
INSERT INTO maintenance_categories (key, label, color, sort_order) VALUES
  ('hvac', '空調', '#3B82F6', 1),
  ('fire', '消防', '#EF4444', 2),
  ('electrical', '機電', '#F59E0B', 3),
  ('generator', '發電機', '#8B5CF6', 4),
  ('server', '伺服器', '#10B981', 5),
  ('network', '網路設備', '#06B6D4', 6);

-- 保養記錄
INSERT INTO maintenance_events (category_key, title, description, event_date, contractor, is_completed) VALUES
  ('hvac', '冷氣主機年度保養', '更換冷媒、清洗濾網', CURRENT_DATE, '大金空調', false),
  ('fire', '消防設備檢查', '滅火器、偵煙器檢測', CURRENT_DATE, '永安消防', true),
  ('generator', '發電機月保養', '試運轉、油量檢查', CURRENT_DATE + INTERVAL '3 days', '台電機電', false);

-- 事件類型
INSERT INTO event_types (name, color, description) VALUES
  ('計畫性維護', '#3B82F6', '預定的系統維護作業'),
  ('非計畫性中斷', '#EF4444', '非預期的服務中斷'),
  ('設備更新', '#10B981', '硬體或軟體升級');

-- 使用者
INSERT INTO users (name, email, role) VALUES
  ('管理員', 'admin@mac.gov.tw', 'admin'),
  ('操作員', 'operator@mac.gov.tw', 'user');
