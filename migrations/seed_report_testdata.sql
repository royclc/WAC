-- ============================================
-- 測試資料：統計報表用（organizations, org_devices, downtime_events, org_circuits, circuit_events）
-- 用於驗證新的註腳系統 [註1]固定說明 + [註2+]事件
-- Date: 2026-07-28
-- For: Supabase / Local PostgreSQL
-- ============================================

-- ── 清除既有測試資料 ──
DELETE FROM downtime_events;
DELETE FROM circuit_events;
DELETE FROM org_devices;
DELETE FROM org_circuits;
DELETE FROM organizations;

-- ══════════════════════════════════════════════
-- 1. 單位（Organizations）
-- ══════════════════════════════════════════════
INSERT INTO organizations (id, name, type) VALUES
  ('org-hq',       '財政部財政資訊中心', 'headquarters'),
  ('org-branch-1', '臺北國稅局',       'branch'),
  ('org-branch-2', '高雄國稅局',       'branch'),
  ('org-office-1', '中正稽徵所',       'office');

-- ══════════════════════════════════════════════
-- 2. 網路設備（org_devices）— 總局內網/外網 + 分局
-- ══════════════════════════════════════════════

-- 總局內網設備
INSERT INTO org_devices (id, org_id, name, zone, device_type, vendor, quantity) VALUES
  ('dev-hq-int-fw',   'org-hq', '總局內網防火牆',       'internal', '防火牆',         'Fortinet',  2),
  ('dev-hq-int-core', 'org-hq', '總局內網核心交換器',   'internal', '核心網路交換器', 'Cisco',     2),
  ('dev-hq-int-host', 'org-hq', '總局內網主機交換器',   'internal', '主機網路交換器', 'Cisco',     4),
  ('dev-hq-int-edge', 'org-hq', '總局內網邊界交換器',   'internal', '邊界網路交換器', 'Juniper',   2),
  ('dev-hq-int-agg',  'org-hq', '總局內網聚合交換器',   'internal', '聚合網路交換器', 'Cisco',     3);

-- 總局外網設備
INSERT INTO org_devices (id, org_id, name, zone, device_type, vendor, quantity) VALUES
  ('dev-hq-ext-fw',   'org-hq', '總局外網防火牆',       'external', '防火牆',         'Palo Alto', 2),
  ('dev-hq-ext-core', 'org-hq', '總局外網核心交換器',   'external', '核心網路交換器', 'Cisco',     2),
  ('dev-hq-ext-host', 'org-hq', '總局外網主機交換器',   'external', '主機網路交換器', 'Cisco',     3),
  ('dev-hq-ext-edge', 'org-hq', '總局外網邊界交換器',   'external', '邊界網路交換器', 'Juniper',   2),
  ('dev-hq-ext-agg',  'org-hq', '總局外網聚合交換器',   'external', '聚合網路交換器', 'Cisco',     2);

-- 分局稽徵所設備
INSERT INTO org_devices (id, org_id, name, zone, device_type, vendor, quantity) VALUES
  ('dev-br1-fw',  'org-branch-1', '臺北局防火牆',       'internal', '防火牆',         'Fortinet',  1),
  ('dev-br1-fe',  'org-branch-1', '臺北局前端交換器',   'internal', '前端網路交換器', 'Cisco',     2),
  ('dev-br1-agg', 'org-branch-1', '臺北局聚合交換器',   'internal', '聚合網路交換器', 'Cisco',     1),
  ('dev-br2-fw',  'org-branch-2', '高雄局防火牆',       'internal', '防火牆',         'Fortinet',  1),
  ('dev-br2-fe',  'org-branch-2', '高雄局前端交換器',   'internal', '前端網路交換器', 'Cisco',     2),
  ('dev-br2-agg', 'org-branch-2', '高雄局聚合交換器',   'internal', '聚合網路交換器', 'Cisco',     1),
  ('dev-of1-fw',  'org-office-1', '中正所防火牆',       'internal', '防火牆',         'Fortinet',  1),
  ('dev-of1-fe',  'org-office-1', '中正所前端交換器',   'internal', '前端網路交換器', 'Cisco',     1),
  ('dev-of1-agg', 'org-office-1', '中正所聚合交換器',   'internal', '聚合網路交換器', 'Cisco',     1);

-- ══════════════════════════════════════════════
-- 3. 線路（org_circuits）
-- ══════════════════════════════════════════════
INSERT INTO org_circuits (id, org_id, circuit_number, bandwidth, ip_address) VALUES
  ('cir-hq-1',  'org-hq',       'TLC-HQ-001',  '1Gbps',   '10.1.1.1'),
  ('cir-hq-2',  'org-hq',       'TLC-HQ-002',  '1Gbps',   '10.1.1.2'),
  ('cir-br1-1', 'org-branch-1', 'TLC-TPE-001', '100Mbps', '10.2.1.1'),
  ('cir-br2-1', 'org-branch-2', 'TLC-KHH-001', '100Mbps', '10.3.1.1'),
  ('cir-of1-1', 'org-office-1', 'TLC-ZZ-001',  '50Mbps',  '10.4.1.1');

-- ══════════════════════════════════════════════
-- 4. 網路停機事件（downtime_events, asset_type='network'）
--    115年第3季 (2026/06/26 ~ 2026/09/25)
-- ══════════════════════════════════════════════

-- 事件A：機房空調維護 — 同時影響總局內網防火牆 + 總局內網核心交換器（同事件共用一個註）
INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external) VALUES
  ('evt-n1a', 'dev-hq-int-fw',   'network', 'planned',   '機房空調維護-計畫性停機', '2026-07-10 08:00', '2026-07-10 12:00', false),
  ('evt-n1b', 'dev-hq-int-core', 'network', 'planned',   '機房空調維護-計畫性停機', '2026-07-10 08:00', '2026-07-10 12:00', false);

-- 事件B：防火牆韌體更新 — 只影響總局外網防火牆
INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external) VALUES
  ('evt-n2',  'dev-hq-ext-fw',   'network', 'planned',   '防火牆韌體更新', '2026-07-15 22:00', '2026-07-16 02:00', false);

-- 事件C：異常斷電 — 非計畫性，影響總局內網主機交換器
INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external) VALUES
  ('evt-n3',  'dev-hq-int-host', 'network', 'unplanned', 'UPS異常導致設備重啟',     '2026-07-20 14:30', '2026-07-20 15:45', false);

-- 事件D：ISP線路中斷（外部因素）— 影響總局外網核心交換器
INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external) VALUES
  ('evt-n4',  'dev-hq-ext-core', 'network', 'unplanned', 'ISP骨幹線路中斷',         '2026-08-05 09:00', '2026-08-05 11:30', true);

-- 事件E：分局設備維護 — 影響分局防火牆（跨分局同事件）
INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external) VALUES
  ('evt-n5a', 'dev-br1-fw',      'network', 'planned',   '分局防火牆政策更新',       '2026-08-12 20:00', '2026-08-12 22:00', false),
  ('evt-n5b', 'dev-br2-fw',      'network', 'planned',   '分局防火牆政策更新',       '2026-08-12 20:00', '2026-08-12 22:00', false);

-- ══════════════════════════════════════════════
-- 5. 線路事件（circuit_events）
-- ══════════════════════════════════════════════
INSERT INTO circuit_events (id, circuit_id, plan_type, title, start_time, end_time, is_external) VALUES
  ('evt-c1', 'cir-hq-1',  'planned',   '線路維護-光纖接頭更換',   '2026-07-18 01:00', '2026-07-18 05:00', false),
  ('evt-c2', 'cir-br1-1', 'unplanned', '線路中斷-施工挖斷光纖',   '2026-08-03 10:00', '2026-08-03 16:30', false),
  ('evt-c3', 'cir-of1-1', 'unplanned', '電信商機房設備故障',       '2026-07-25 08:00', '2026-07-25 10:00', true);

-- ══════════════════════════════════════════════
-- 6. 硬體停機事件（downtime_events, asset_type='server'）
--    需要 hardware_assets 已存在（使用 seed_hardware_testdata_v4.sql 建立的資料）
-- ══════════════════════════════════════════════

-- 取得前兩台伺服器的 id
-- 如果 hardware_assets 已有資料，這些 INSERT 會使用 sub-select
INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external)
SELECT 'evt-s1', id, 'server', 'planned', '伺服器韌體更新-計畫性維護', '2026-07-12 22:00', '2026-07-13 02:00', false
FROM hardware_assets WHERE is_active = true ORDER BY name LIMIT 1;

INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external)
SELECT 'evt-s2', id, 'server', 'unplanned', '硬碟故障-緊急更換', '2026-08-01 10:00', '2026-08-01 14:00', false
FROM hardware_assets WHERE is_active = true ORDER BY name LIMIT 1 OFFSET 1;

-- 同一事件影響多台伺服器（共用一個註）— 機房冷氣故障
INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external)
SELECT 'evt-s3a', id, 'server', 'unplanned', '機房冷氣故障-設備過熱關機', '2026-07-22 13:00', '2026-07-22 15:30', false
FROM hardware_assets WHERE is_active = true ORDER BY name LIMIT 1;

INSERT INTO downtime_events (id, asset_id, asset_type, plan_type, title, start_time, end_time, is_external)
SELECT 'evt-s3b', id, 'server', 'unplanned', '機房冷氣故障-設備過熱關機', '2026-07-22 13:00', '2026-07-22 15:30', false
FROM hardware_assets WHERE is_active = true ORDER BY name LIMIT 1 OFFSET 1;
