-- ============================================
-- MAC System - Local PostgreSQL Seed Data
-- ============================================

SET search_path TO api, public;

-- 清空所有表
TRUNCATE TABLE circuit_events, downtime_events, leave_records, work_events,
  org_circuits, org_devices, organizations,
  maintenance_events, maintenance_categories,
  hardware_models, hardware_assets, hardware_categories,
  circuits, event_types, users, vendors
  CASCADE;

-- ── 廠商 ──
INSERT INTO vendors (name, contact_person, phone, email, description) VALUES
  ('宏華', '李經理', '02-1234-5678', 'lee@honghua.com', '網路設備供應商'),
  ('HPE', '張業務', '02-8765-4321', 'chang@hpe.com', 'x86伺服器供應商'),
  ('NetApp', '王工程師', '02-2222-3333', 'wang@netapp.com', '儲存設備供應商'),
  ('大金空調', '陳先生', '02-3333-4444', 'chen@daikin.com', '空調設備維護'),
  ('永安消防', '林主任', '02-5555-6666', 'lin@yongan.com', '消防設備維護'),
  ('台電機電', '吳工程師', '02-7777-8888', 'wu@taipower.com', '發電機與機電維護'),
  ('中華電信', '趙經理', '02-9999-0000', 'chao@cht.com.tw', '電路與通訊服務');

-- ── 硬體類別 + 型號 ──
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

-- ── 硬體資產 ──
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description) VALUES
  ('Web Server 01', 'x86_server', 'HPE 380', 'HPE', '192.168.1.10', '機房A', '主要網頁伺服器'),
  ('Web Server 02', 'x86_server', 'HPE 380', 'HPE', '192.168.1.11', '機房A', '備援網頁伺服器'),
  ('DB Server 01', 'x86_server', 'HPE 380', 'HPE', '192.168.1.20', '機房A', '主資料庫伺服器'),
  ('DB Server 02', 'x86_server', 'HPE 380', 'HPE', '192.168.1.21', '機房A', '備援資料庫伺服器'),
  ('AP Server 01', 'x86_server', 'HPE 360', 'HPE', '192.168.1.30', '機房B', '應用程式伺服器'),
  ('AP Server 02', 'x86_server', 'HPE 360', 'HPE', '192.168.1.31', '機房B', '備援應用伺服器'),
  ('Mail Server 01', 'x86_server', 'HPE 360', 'HPE', '192.168.1.40', '機房B', '郵件伺服器'),
  ('NetApp FAS01', 'storage', 'NetApp', 'NetApp', '192.168.1.50', '機房A', '主要儲存設備'),
  ('備份磁帶機 01', 'storage', '磁帶機', 'HPE', '192.168.1.60', '機房A', '磁帶備份裝置');

-- ── 保養類別 ──
INSERT INTO maintenance_categories (key, label, color, sort_order) VALUES
  ('hvac', '空調', '#3B82F6', 1),
  ('fire', '消防', '#EF4444', 2),
  ('electrical', '機電', '#F59E0B', 3),
  ('generator', '發電機', '#8B5CF6', 4),
  ('server', '伺服器', '#10B981', 5),
  ('network', '網路設備', '#06B6D4', 6);

-- ── 保養記錄 ──
INSERT INTO maintenance_events (category_key, title, description, event_date, contractor, is_completed) VALUES
  ('hvac', '冷氣主機年度保養', '更換冷媒、清洗濾網', CURRENT_DATE, '大金空調', false),
  ('hvac', '空調系統效能檢測', '溫度校正、風量調整', CURRENT_DATE + INTERVAL '30 days', '大金空調', false),
  ('fire', '消防設備檢查', '滅火器、偵煙器檢測', CURRENT_DATE - INTERVAL '5 days', '永安消防', true),
  ('fire', '消防演練', '年度消防演練', CURRENT_DATE + INTERVAL '60 days', '永安消防', false),
  ('electrical', '配電盤檢測', '電壓、電流量測', CURRENT_DATE - INTERVAL '10 days', '台電機電', true),
  ('generator', '發電機月保養', '試運轉、油量檢查', CURRENT_DATE + INTERVAL '3 days', '台電機電', false),
  ('generator', '發電機年度大保養', '全面檢修', CURRENT_DATE + INTERVAL '45 days', '台電機電', false),
  ('server', '伺服器韌體更新', 'HPE iLO 韌體升級', CURRENT_DATE + INTERVAL '7 days', 'HPE', false),
  ('server', '伺服器硬碟更換', '預防性更換', CURRENT_DATE - INTERVAL '3 days', 'HPE', true),
  ('network', '網路交換器韌體更新', '安全性修補', CURRENT_DATE + INTERVAL '14 days', '宏華', false),
  ('network', '防火牆規則審查', '季度規則清理', CURRENT_DATE + INTERVAL '20 days', '宏華', false),
  ('electrical', 'UPS 電池更換', '不斷電系統電池汰換', CURRENT_DATE + INTERVAL '90 days', '台電機電', false);

-- ── 事件類型 ──
INSERT INTO event_types (name, color, description) VALUES
  ('計畫性維護', '#3B82F6', '預定的系統維護作業'),
  ('非計畫性中斷', '#EF4444', '非預期的服務中斷'),
  ('設備更新', '#10B981', '硬體或軟體升級'),
  ('安全性事件', '#F59E0B', '資安相關事件'),
  ('效能調校', '#8B5CF6', '系統效能優化');

-- ── 使用者（密碼使用 bcrypt 加密）──
INSERT INTO users (name, email, role, password_hash, is_active) VALUES
  ('管理員', 'admin@mac.gov.tw', 'admin', crypt('1qaz@WSX3edc', gen_salt('bf')), true),
  ('操作員', 'operator@mac.gov.tw', 'user', crypt('operator123', gen_salt('bf')), true),
  ('王小明', 'wang@mac.gov.tw', 'user', crypt('user123', gen_salt('bf')), true),
  ('陳美麗', 'chen@mac.gov.tw', 'user', crypt('user123', gen_salt('bf')), true),
  ('林志偉', 'lin@mac.gov.tw', 'user', crypt('user123', gen_salt('bf')), true);

-- ── 單位（組織） ──
INSERT INTO organizations (name, type) VALUES
  ('總局', 'headquarters'),
  ('a稽徵所', 'office'),
  ('b分局', 'branch'),
  ('c稽徵所', 'office');

-- ── 單位設備 ──
-- 總局 (內網)
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity)
SELECT id, '總局內網防火牆', 'internal', '防火牆', '宏華', 2 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局內網核心交換器', 'internal', '核心交換器', '宏華', 2 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局內網主機交換器', 'internal', '主機交換器', '宏華', 6 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局內網邊界交換器', 'internal', '邊界交換器', '宏華', 2 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局內網聚合交換器', 'internal', '聚合交換器', '宏華', 4 FROM organizations WHERE name = '總局';

-- 總局 (外網)
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity)
SELECT id, '總局外網防火牆', 'external', '防火牆', '宏華', 2 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局外網核心交換器', 'external', '核心交換器', '宏華', 2 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局外網主機交換器', 'external', '主機交換器', '宏華', 4 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局外網邊界交換器', 'external', '邊界交換器', '宏華', 2 FROM organizations WHERE name = '總局'
UNION ALL SELECT id, '總局外網聚合交換器', 'external', '聚合交換器', '宏華', 2 FROM organizations WHERE name = '總局';

-- a稽徵所
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity)
SELECT id, 'a稽徵所內網防火牆', 'internal', '防火牆', '宏華', 1 FROM organizations WHERE name = 'a稽徵所'
UNION ALL SELECT id, 'a稽徵所內網前端交換器', 'internal', '前端交換器', '宏華', 1 FROM organizations WHERE name = 'a稽徵所'
UNION ALL SELECT id, 'a稽徵所內網聚合交換器', 'internal', '聚合交換器', '宏華', 1 FROM organizations WHERE name = 'a稽徵所'
UNION ALL SELECT id, 'a稽徵所外網防火牆', 'external', '防火牆', '宏華', 1 FROM organizations WHERE name = 'a稽徵所'
UNION ALL SELECT id, 'a稽徵所外網前端交換器', 'external', '前端交換器', '宏華', 1 FROM organizations WHERE name = 'a稽徵所'
UNION ALL SELECT id, 'a稽徵所外網聚合交換器', 'external', '聚合交換器', '宏華', 1 FROM organizations WHERE name = 'a稽徵所';

-- b分局
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity)
SELECT id, 'b分局內網防火牆', 'internal', '防火牆', '宏華', 1 FROM organizations WHERE name = 'b分局'
UNION ALL SELECT id, 'b分局內網前端交換器', 'internal', '前端交換器', '宏華', 1 FROM organizations WHERE name = 'b分局'
UNION ALL SELECT id, 'b分局內網聚合交換器', 'internal', '聚合交換器', '宏華', 1 FROM organizations WHERE name = 'b分局'
UNION ALL SELECT id, 'b分局外網防火牆', 'external', '防火牆', '宏華', 1 FROM organizations WHERE name = 'b分局'
UNION ALL SELECT id, 'b分局外網前端交換器', 'external', '前端交換器', '宏華', 1 FROM organizations WHERE name = 'b分局'
UNION ALL SELECT id, 'b分局外網聚合交換器', 'external', '聚合交換器', '宏華', 1 FROM organizations WHERE name = 'b分局';

-- c稽徵所
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity)
SELECT id, 'c稽徵所內網防火牆', 'internal', '防火牆', '宏華', 1 FROM organizations WHERE name = 'c稽徵所'
UNION ALL SELECT id, 'c稽徵所內網前端交換器', 'internal', '前端交換器', '宏華', 1 FROM organizations WHERE name = 'c稽徵所'
UNION ALL SELECT id, 'c稽徵所內網聚合交換器', 'internal', '聚合交換器', '宏華', 1 FROM organizations WHERE name = 'c稽徵所'
UNION ALL SELECT id, 'c稽徵所外網防火牆', 'external', '防火牆', '宏華', 1 FROM organizations WHERE name = 'c稽徵所'
UNION ALL SELECT id, 'c稽徵所外網前端交換器', 'external', '前端交換器', '宏華', 1 FROM organizations WHERE name = 'c稽徵所'
UNION ALL SELECT id, 'c稽徵所外網聚合交換器', 'external', '聚合交換器', '宏華', 1 FROM organizations WHERE name = 'c稽徵所';

-- ── 單位電路 ──
INSERT INTO org_circuits (org_id, circuit_number, bandwidth, ip_address)
SELECT id, 'HQ-FW-001', '200', '10.1.1.1' FROM organizations WHERE name = '總局'
UNION ALL SELECT id, 'HQ-FW-002', '200', '10.1.1.2' FROM organizations WHERE name = '總局'
UNION ALL SELECT id, 'HQ-VPN-001', '100', '10.1.2.1' FROM organizations WHERE name = '總局'
UNION ALL SELECT id, 'HQ-NET-001', '100/40', '' FROM organizations WHERE name = '總局';

INSERT INTO org_circuits (org_id, circuit_number, bandwidth, ip_address)
SELECT id, 'AO-FW-001', '80', '' FROM organizations WHERE name = 'a稽徵所'
UNION ALL SELECT id, 'AO-NET-001', '90', '' FROM organizations WHERE name = 'a稽徵所'
UNION ALL SELECT id, 'AO-NET-002', '80', '' FROM organizations WHERE name = 'a稽徵所';

INSERT INTO org_circuits (org_id, circuit_number, bandwidth, ip_address)
SELECT id, 'BB-FW-001', '50', '' FROM organizations WHERE name = 'b分局'
UNION ALL SELECT id, 'BB-NET-001', '60', '' FROM organizations WHERE name = 'b分局'
UNION ALL SELECT id, 'BB-NET-002', '70', '' FROM organizations WHERE name = 'b分局';

INSERT INTO org_circuits (org_id, circuit_number, bandwidth, ip_address)
SELECT id, 'CO-FW-001', '70', '' FROM organizations WHERE name = 'c稽徵所'
UNION ALL SELECT id, 'CO-NET-001', '50', '' FROM organizations WHERE name = 'c稽徵所'
UNION ALL SELECT id, 'CO-NET-002', '60', '' FROM organizations WHERE name = 'c稽徵所';

-- ── 獨立線路 ──
INSERT INTO circuits (circuit_number, bandwidth, ip_address, vendor, unit_name, description) VALUES
  ('ISP-001', '1000', '203.1.1.1', '中華電信', '總局', '對外網際網路專線'),
  ('ISP-002', '500', '203.1.1.2', '中華電信', '總局', '備援網際網路專線'),
  ('MPLS-001', '100', '', '中華電信', '總局', 'MPLS 骨幹線路'),
  ('VPN-HQ-A', '50', '', '中華電信', '總局-a稽徵所', 'VPN 專線'),
  ('VPN-HQ-B', '50', '', '中華電信', '總局-b分局', 'VPN 專線');

-- ── 工作事件 ──
INSERT INTO work_events (title, description, event_date, start_time, end_time, is_all_day, color, assignees) VALUES
  ('伺服器維護', '定期維護作業', CURRENT_DATE, '09:00', '12:00', false, '#3B82F6', '管理員,操作員'),
  ('網路設備巡檢', '每月例行巡檢', CURRENT_DATE, '14:00', '17:00', false, '#10B981', '操作員'),
  ('防火牆規則更新', '更新安全規則', CURRENT_DATE + INTERVAL '2 days', '10:00', '11:00', false, '#F59E0B', '管理員'),
  ('系統備份', '全系統備份作業', CURRENT_DATE + INTERVAL '5 days', '00:00', '00:00', true, '#8B5CF6', '管理員,操作員'),
  ('UPS 電池檢測', '不斷電系統檢查', CURRENT_DATE + INTERVAL '7 days', '09:00', '12:00', false, '#EF4444', '操作員');

-- ── 請假記錄 ──
INSERT INTO leave_records (user_name, leave_type, leave_date, is_half_day, half_day_period, note) VALUES
  ('操作員', 'annual', CURRENT_DATE, false, '', '出國旅遊'),
  ('管理員', 'personal', CURRENT_DATE + INTERVAL '3 days', true, 'morning', '看醫生'),
  ('操作員', 'sick', CURRENT_DATE + INTERVAL '10 days', false, '', '身體不適');
