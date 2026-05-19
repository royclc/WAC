-- ============================================
-- MAC System - 測試資料 (Seed Data)
-- 執行前請先執行 supabase-migration.sql 建表
-- 如果 migration 已含 seed data，請先清空再執行此檔
-- ============================================

-- 先啟用 pgcrypto 以支援密碼雜湊
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 為 users 表增加 password_hash 欄位（如尚未存在）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT '';
  END IF;
END $$;

-- ============================================
-- 清空既有資料（重新匯入用）
-- ============================================
TRUNCATE vendors, hardware_categories, hardware_models, hardware_assets,
         maintenance_categories, maintenance_events,
         organizations, org_devices, org_circuits,
         event_types, users, circuits CASCADE;

-- ============================================
-- 1. 廠商
-- ============================================
INSERT INTO vendors (name, contact_person, phone, email, description) VALUES
  ('宏華', '李經理', '02-1234-5678', 'lee@honghua.com', '網路設備供應商'),
  ('HPE', '張業務', '02-8765-4321', 'chang@hpe.com', 'x86伺服器供應商'),
  ('NetApp', '王工程師', '02-2222-3333', 'wang@netapp.com', '儲存設備供應商'),
  ('大金空調', '陳先生', '02-3333-4444', 'chen@daikin.com', '空調設備維護'),
  ('永安消防', '林主任', '02-5555-6666', 'lin@yongan.com', '消防設備維護'),
  ('台電機電', '吳工程師', '02-7777-8888', 'wu@taipower.com', '發電機與機電維護'),
  ('中華電信', '趙課長', '02-9999-0000', 'chao@cht.com', '光纖線路供應商');

-- ============================================
-- 2. 硬體類別 + 型號
-- ============================================
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

-- ============================================
-- 3. 硬體資產
-- ============================================
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description) VALUES
  ('Web Server 01', 'x86_server', 'HPE 380', 'HPE', '192.168.1.10', '機房A', '主要網頁伺服器'),
  ('DB Server 01', 'x86_server', 'HPE 380', 'HPE', '192.168.1.20', '機房A', '資料庫伺服器'),
  ('AP Server 01', 'x86_server', 'HPE 360', 'HPE', '192.168.1.30', '機房B', '應用程式伺服器'),
  ('AP Server 02', 'x86_server', 'HPE 360', 'HPE', '192.168.1.31', '機房B', '備援應用伺服器'),
  ('File Server 01', 'x86_server', 'HPE 380', 'HPE', '192.168.1.40', '機房A', '檔案伺服器'),
  ('NetApp FAS01', 'storage', 'NetApp', 'NetApp', '192.168.1.50', '機房A', '主要儲存設備'),
  ('NetApp FAS02', 'storage', 'NetApp', 'NetApp', '192.168.1.51', '機房B', '備援儲存設備'),
  ('備份磁帶機 01', 'storage', '磁帶機', 'HPE', '192.168.1.60', '機房A', '磁帶備份裝置');

-- ============================================
-- 4. 保養類別
-- ============================================
INSERT INTO maintenance_categories (key, label, color, sort_order) VALUES
  ('hvac', '空調', '#3B82F6', 1),
  ('fire', '消防', '#EF4444', 2),
  ('electrical', '機電', '#F59E0B', 3),
  ('generator', '發電機', '#8B5CF6', 4),
  ('server', '伺服器', '#10B981', 5),
  ('network', '網路設備', '#06B6D4', 6);

-- ============================================
-- 5. 保養記錄（跨多月份）
-- ============================================
INSERT INTO maintenance_events (category_key, title, description, event_date, contractor, is_completed) VALUES
  ('hvac', '冷氣主機年度保養', '更換冷媒、清洗濾網', CURRENT_DATE, '大金空調', false),
  ('hvac', '空調濾網清洗', '所有機房空調濾網清洗', CURRENT_DATE - INTERVAL '15 days', '大金空調', true),
  ('fire', '消防設備檢查', '滅火器、偵煙器檢測', CURRENT_DATE, '永安消防', true),
  ('fire', '消防灑水系統測試', '灑水系統壓力測試', CURRENT_DATE + INTERVAL '10 days', '永安消防', false),
  ('electrical', '機電設備巡檢', 'UPS、配電盤檢查', CURRENT_DATE - INTERVAL '7 days', '台電機電', true),
  ('electrical', 'UPS電池更換', '更換B機房UPS電池組', CURRENT_DATE + INTERVAL '20 days', '台電機電', false),
  ('generator', '發電機月保養', '試運轉、油量檢查', CURRENT_DATE + INTERVAL '3 days', '台電機電', false),
  ('generator', '發電機年度大保養', '全面檢修、換油、負載測試', CURRENT_DATE - INTERVAL '30 days', '台電機電', true),
  ('server', '伺服器韌體更新', 'HPE iLO韌體升級', CURRENT_DATE + INTERVAL '5 days', 'HPE', false),
  ('server', '伺服器硬碟更換', 'DB Server 01硬碟預防更換', CURRENT_DATE - INTERVAL '10 days', 'HPE', true),
  ('network', '核心交換器維護', '韌體更新與設定備份', CURRENT_DATE + INTERVAL '7 days', '宏華', false),
  ('network', '防火牆規則檢視', '季度防火牆規則審查', CURRENT_DATE - INTERVAL '5 days', '宏華', true);

-- ============================================
-- 6. 事件類型
-- ============================================
INSERT INTO event_types (name, color, description) VALUES
  ('計畫性維護', '#3B82F6', '預定的系統維護作業'),
  ('非計畫性中斷', '#EF4444', '非預期的服務中斷'),
  ('設備更新', '#10B981', '硬體或軟體升級'),
  ('線路中斷', '#F59E0B', '網路線路異常'),
  ('測試作業', '#8B5CF6', '系統測試與驗證');

-- ============================================
-- 7. 使用者（含管理員密碼 bcrypt 雜湊）
-- ============================================
-- admin 密碼: 1qaz@WSX3edc
INSERT INTO users (name, email, role, is_active, password_hash) VALUES
  ('admin', 'admin@mac.gov.tw', 'admin', true, crypt('1qaz@WSX3edc', gen_salt('bf'))),
  ('王小明', 'wang@mac.gov.tw', 'user', true, crypt('user1234', gen_salt('bf'))),
  ('陳美麗', 'chen@mac.gov.tw', 'user', true, crypt('user1234', gen_salt('bf'))),
  ('林志偉', 'lin@mac.gov.tw', 'user', true, crypt('user1234', gen_salt('bf'))),
  ('張雅琪', 'chang@mac.gov.tw', 'user', true, crypt('user1234', gen_salt('bf')));

-- ============================================
-- 8. 組織/單位
-- ============================================
INSERT INTO organizations (id, name, type) VALUES
  ('11111111-0000-0000-0000-000000000001', '總局', 'headquarters'),
  ('11111111-0000-0000-0000-000000000002', 'a稽徵所', 'office'),
  ('11111111-0000-0000-0000-000000000003', 'b分局', 'branch'),
  ('11111111-0000-0000-0000-000000000004', 'c稽徵所', 'office');

-- 總局設備（內外網）
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity) VALUES
  ('11111111-0000-0000-0000-000000000001', '總局內網防火牆', 'internal', '防火牆', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局內網核心交換器', 'internal', '核心交換器', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局內網主機交換器', 'internal', '主機交換器', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局內網邊界交換器', 'internal', '邊界交換器', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局內網聚合交換器', 'internal', '聚合交換器', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局外網防火牆', 'external', '防火牆', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局外網核心交換器', 'external', '核心交換器', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局外網主機交換器', 'external', '主機交換器', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局外網邊界交換器', 'external', '邊界交換器', '宏華', 2),
  ('11111111-0000-0000-0000-000000000001', '總局外網聚合交換器', 'external', '聚合交換器', '宏華', 2);

-- a稽徵所設備
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity) VALUES
  ('11111111-0000-0000-0000-000000000002', 'a稽徵所內網防火牆', 'internal', '防火牆', '宏華', 1),
  ('11111111-0000-0000-0000-000000000002', 'a稽徵所內網前端交換器', 'internal', '前端交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000002', 'a稽徵所內網聚合交換器', 'internal', '聚合交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000002', 'a稽徵所外網防火牆', 'external', '防火牆', '宏華', 1),
  ('11111111-0000-0000-0000-000000000002', 'a稽徵所外網前端交換器', 'external', '前端交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000002', 'a稽徵所外網聚合交換器', 'external', '聚合交換器', '宏華', 1);

-- b分局設備
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity) VALUES
  ('11111111-0000-0000-0000-000000000003', 'b分局內網防火牆', 'internal', '防火牆', '宏華', 1),
  ('11111111-0000-0000-0000-000000000003', 'b分局內網前端交換器', 'internal', '前端交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000003', 'b分局內網聚合交換器', 'internal', '聚合交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000003', 'b分局外網防火牆', 'external', '防火牆', '宏華', 1),
  ('11111111-0000-0000-0000-000000000003', 'b分局外網前端交換器', 'external', '前端交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000003', 'b分局外網聚合交換器', 'external', '聚合交換器', '宏華', 1);

-- c稽徵所設備
INSERT INTO org_devices (org_id, name, zone, device_type, vendor, quantity) VALUES
  ('11111111-0000-0000-0000-000000000004', 'c稽徵所內網防火牆', 'internal', '防火牆', '宏華', 1),
  ('11111111-0000-0000-0000-000000000004', 'c稽徵所內網前端交換器', 'internal', '前端交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000004', 'c稽徵所內網聚合交換器', 'internal', '聚合交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000004', 'c稽徵所外網防火牆', 'external', '防火牆', '宏華', 1),
  ('11111111-0000-0000-0000-000000000004', 'c稽徵所外網前端交換器', 'external', '前端交換器', '宏華', 1),
  ('11111111-0000-0000-0000-000000000004', 'c稽徵所外網聚合交換器', 'external', '聚合交換器', '宏華', 1);

-- ============================================
-- 9. 單位電路
-- ============================================
INSERT INTO org_circuits (org_id, circuit_number, bandwidth, ip_address) VALUES
  ('11111111-0000-0000-0000-000000000001', 'HQ-FBR-001', '200', '10.0.1.1'),
  ('11111111-0000-0000-0000-000000000001', 'HQ-FBR-002', '200', '10.0.1.2'),
  ('11111111-0000-0000-0000-000000000001', 'HQ-FBR-003', '100', '10.0.1.3'),
  ('11111111-0000-0000-0000-000000000001', 'HQ-FBR-004', '100/40', '10.0.1.4'),
  ('11111111-0000-0000-0000-000000000002', 'OF-A-001', '80', '10.0.2.1'),
  ('11111111-0000-0000-0000-000000000002', 'OF-A-002', '90', '10.0.2.2'),
  ('11111111-0000-0000-0000-000000000002', 'OF-A-003', '80', '10.0.2.3'),
  ('11111111-0000-0000-0000-000000000003', 'BR-B-001', '50', '10.0.3.1'),
  ('11111111-0000-0000-0000-000000000003', 'BR-B-002', '60', '10.0.3.2'),
  ('11111111-0000-0000-0000-000000000003', 'BR-B-003', '70', '10.0.3.3'),
  ('11111111-0000-0000-0000-000000000004', 'OF-C-001', '70', '10.0.4.1'),
  ('11111111-0000-0000-0000-000000000004', 'OF-C-002', '50', '10.0.4.2'),
  ('11111111-0000-0000-0000-000000000004', 'OF-C-003', '60', '10.0.4.3');

-- ============================================
-- 10. 線路管理
-- ============================================
INSERT INTO circuits (circuit_number, bandwidth, ip_address, vendor, unit_name, description) VALUES
  ('FBR-MAIN-001', '1000', '203.0.113.1', '中華電信', '總局', '主要對外光纖'),
  ('FBR-MAIN-002', '500', '203.0.113.2', '中華電信', '總局', '備援對外光纖'),
  ('FBR-BR-001', '200', '203.0.113.10', '中華電信', 'b分局', '分局對外線路'),
  ('FBR-OF-A-001', '100', '203.0.113.20', '中華電信', 'a稽徵所', '稽徵所對外線路'),
  ('FBR-OF-C-001', '100', '203.0.113.30', '中華電信', 'c稽徵所', '稽徵所對外線路');

-- ============================================
-- Done!
-- admin 登入帳號: admin@mac.gov.tw / 1qaz@WSX3edc
-- ============================================
