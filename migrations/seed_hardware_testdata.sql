-- ============================================
-- 清除舊資料 + 產生測試資料
-- Date: 2026-06-05
-- For: Supabase
-- ============================================

-- ── 1. 清除舊資料（依序，避免 FK 衝突）──
DELETE FROM hardware_assets;
DELETE FROM hardware_models;
DELETE FROM hardware_categories;
DELETE FROM racks;

-- ── 2. 硬體類別 ──
INSERT INTO hardware_categories (key, label, sort_order) VALUES
  ('server',   'x86 伺服器',  1),
  ('storage',  '儲存設備',    2),
  ('network',  '網路設備',    3),
  ('power',    '電源設備',    4);

-- ── 3. 硬體型號 ──
INSERT INTO hardware_models (category_id, name) VALUES
  ((SELECT id FROM hardware_categories WHERE key = 'server'),  'HPE ProLiant DL380 Gen10'),
  ((SELECT id FROM hardware_categories WHERE key = 'server'),  'HPE ProLiant DL360 Gen10'),
  ((SELECT id FROM hardware_categories WHERE key = 'server'),  'Dell PowerEdge R740'),
  ((SELECT id FROM hardware_categories WHERE key = 'server'),  'Dell PowerEdge R640'),
  ((SELECT id FROM hardware_categories WHERE key = 'storage'), 'Synology RS3621xs+'),
  ((SELECT id FROM hardware_categories WHERE key = 'storage'), 'QNAP TS-h2490FU'),
  ((SELECT id FROM hardware_categories WHERE key = 'storage'), 'Dell EMC Unity XT 380'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Cisco Catalyst 9300'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Cisco ASA 5525-X'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Fortinet FortiGate 200F'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Aruba 6300M'),
  ((SELECT id FROM hardware_categories WHERE key = 'power'),   'APC Smart-UPS SRT 10kVA'),
  ((SELECT id FROM hardware_categories WHERE key = 'power'),   'APC Smart-UPS SRT 6kVA'),
  ((SELECT id FROM hardware_categories WHERE key = 'power'),   'APC Rack PDU 2G');

-- ── 4. 機櫃 ──
INSERT INTO racks (name, label, row_name, total_u, sort_order) VALUES
  ('A-01', 'Web Tier',    'A', 42, 1),
  ('A-02', 'App Tier',    'A', 42, 2),
  ('B-01', 'DB Cluster',  'B', 42, 3),
  ('B-02', 'Storage',     'B', 42, 4);

-- ── 5. 硬體資產（含機櫃 U 位置）──

-- === A-01 Web Tier ===
-- UPS (底部)
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A',        'power',   'APC Smart-UPS SRT 6kVA',    'APC',   '',              'A-01', 'Web Tier 不斷電',    true, 1, 3),
  ('PDU-A1',       'power',   'APC Rack PDU 2G',           'APC',   '',              'A-01', '左側 PDU',           true, 4, 1),
  ('PDU-A2',       'power',   'APC Rack PDU 2G',           'APC',   '',              'A-01', '右側 PDU',           true, 5, 1);
-- 網路設備
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('Switch-A',     'network', 'Cisco Catalyst 9300',       'Cisco', '10.1.1.1',      'A-01', 'Web 層核心交換器',    true, 40, 1),
  ('Firewall-A',   'network', 'Fortinet FortiGate 200F',   'Fortinet','10.1.1.2',    'A-01', '前端防火牆',         true, 41, 1);
-- 伺服器
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('Web-01',       'server',  'HPE ProLiant DL360 Gen10',  'HPE',   '10.1.1.11',     'A-01', 'Nginx 負載平衡',     true, 10, 1),
  ('Web-02',       'server',  'HPE ProLiant DL360 Gen10',  'HPE',   '10.1.1.12',     'A-01', 'Nginx 負載平衡',     true, 11, 1),
  ('Web-03',       'server',  'HPE ProLiant DL360 Gen10',  'HPE',   '10.1.1.13',     'A-01', 'Nginx 備援',         true, 12, 1),
  ('App-Web-01',   'server',  'Dell PowerEdge R640',       'Dell',  '10.1.1.21',     'A-01', 'Web Application',    true, 15, 2),
  ('App-Web-02',   'server',  'Dell PowerEdge R640',       'Dell',  '10.1.1.22',     'A-01', 'Web Application',    true, 17, 2),
  ('App-Web-03',   'server',  'Dell PowerEdge R640',       'Dell',  '10.1.1.23',     'A-01', 'Web Application',    true, 19, 2);

-- === A-02 App Tier ===
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-B',        'power',   'APC Smart-UPS SRT 6kVA',    'APC',   '',              'A-02', 'App Tier 不斷電',    true, 1, 3),
  ('PDU-B1',       'power',   'APC Rack PDU 2G',           'APC',   '',              'A-02', '左側 PDU',           true, 4, 1),
  ('Switch-B',     'network', 'Cisco Catalyst 9300',       'Cisco', '10.1.2.1',      'A-02', 'App 層交換器',       true, 40, 1),
  ('App-01',       'server',  'HPE ProLiant DL380 Gen10',  'HPE',   '10.1.2.11',     'A-02', 'Application Server', true, 10, 2),
  ('App-02',       'server',  'HPE ProLiant DL380 Gen10',  'HPE',   '10.1.2.12',     'A-02', 'Application Server', true, 12, 2),
  ('App-03',       'server',  'HPE ProLiant DL380 Gen10',  'HPE',   '10.1.2.13',     'A-02', 'Application Server', true, 14, 2),
  ('API-01',       'server',  'Dell PowerEdge R640',       'Dell',  '10.1.2.21',     'A-02', 'API Gateway',        true, 18, 1),
  ('API-02',       'server',  'Dell PowerEdge R640',       'Dell',  '10.1.2.22',     'A-02', 'API Gateway',        true, 19, 1),
  ('Cache-01',     'server',  'Dell PowerEdge R640',       'Dell',  '10.1.2.31',     'A-02', 'Redis Cache',        true, 22, 1),
  ('Cache-02',     'server',  'Dell PowerEdge R640',       'Dell',  '10.1.2.32',     'A-02', 'Redis Cache',        true, 23, 1),
  ('MQ-01',        'server',  'HPE ProLiant DL360 Gen10',  'HPE',   '10.1.2.41',     'A-02', 'RabbitMQ',           true, 26, 1);

-- === B-01 DB Cluster ===
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-C',        'power',   'APC Smart-UPS SRT 10kVA',   'APC',   '',              'B-01', 'DB 不斷電',          true, 1, 4),
  ('PDU-C1',       'power',   'APC Rack PDU 2G',           'APC',   '',              'B-01', '左側 PDU',           true, 5, 1),
  ('PDU-C2',       'power',   'APC Rack PDU 2G',           'APC',   '',              'B-01', '右側 PDU',           true, 6, 1),
  ('Switch-C',     'network', 'Cisco Catalyst 9300',       'Cisco', '10.1.3.1',      'B-01', 'DB 層交換器',        true, 40, 1),
  ('DB-Primary',   'server',  'Dell PowerEdge R740',       'Dell',  '10.1.3.11',     'B-01', 'PostgreSQL Primary', true, 10, 2),
  ('DB-Replica1',  'server',  'Dell PowerEdge R740',       'Dell',  '10.1.3.12',     'B-01', 'PostgreSQL Replica', true, 12, 2),
  ('DB-Replica2',  'server',  'Dell PowerEdge R740',       'Dell',  '10.1.3.13',     'B-01', 'PostgreSQL Replica', true, 14, 2),
  ('NAS-01',       'storage', 'Synology RS3621xs+',        'Synology','10.1.3.21',   'B-01', 'NFS 備份儲存',       true, 18, 2),
  ('SAN-01',       'storage', 'Dell EMC Unity XT 380',     'Dell',  '10.1.3.31',     'B-01', 'iSCSI SAN',          true, 22, 3);

-- === B-02 Storage ===
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-D',        'power',   'APC Smart-UPS SRT 10kVA',   'APC',   '',              'B-02', 'Storage 不斷電',     true, 1, 4),
  ('PDU-D1',       'power',   'APC Rack PDU 2G',           'APC',   '',              'B-02', '左側 PDU',           true, 5, 1),
  ('Switch-D',     'network', 'Aruba 6300M',               'Aruba', '10.1.4.1',      'B-02', 'Storage 交換器',     true, 40, 1),
  ('NAS-02',       'storage', 'Synology RS3621xs+',        'Synology','10.1.4.11',   'B-02', '檔案伺服器',         true, 10, 2),
  ('NAS-03',       'storage', 'QNAP TS-h2490FU',          'QNAP',  '10.1.4.12',     'B-02', '影音備份',           true, 12, 2),
  ('Backup-01',    'storage', 'Synology RS3621xs+',        'Synology','10.1.4.21',   'B-02', '異地備份 Target',    true, 16, 2),
  ('Backup-02',    'storage', 'Synology RS3621xs+',        'Synology','10.1.4.22',   'B-02', '冷備份',             true, 18, 2),
  ('Archive-01',   'server',  'HPE ProLiant DL380 Gen10',  'HPE',   '10.1.4.31',     'B-02', '歸檔伺服器',         true, 22, 2),
  ('Monitor-01',   'server',  'Dell PowerEdge R640',       'Dell',  '10.1.4.41',     'B-02', 'Zabbix 監控',        true, 26, 1),
  ('Log-01',       'server',  'Dell PowerEdge R640',       'Dell',  '10.1.4.42',     'B-02', 'ELK Log Server',     true, 27, 1);
