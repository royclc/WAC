-- ============================================
-- 清除舊資料 + 產生大量測試資料（12 座機櫃）
-- Date: 2026-06-05
-- For: Supabase
-- ============================================

-- ── 1. 清除舊資料 ──
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
  ((SELECT id FROM hardware_categories WHERE key = 'server'),  'Lenovo ThinkSystem SR650'),
  ((SELECT id FROM hardware_categories WHERE key = 'storage'), 'Synology RS3621xs+'),
  ((SELECT id FROM hardware_categories WHERE key = 'storage'), 'QNAP TS-h2490FU'),
  ((SELECT id FROM hardware_categories WHERE key = 'storage'), 'Dell EMC Unity XT 380'),
  ((SELECT id FROM hardware_categories WHERE key = 'storage'), 'NetApp FAS2750'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Cisco Catalyst 9300'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Cisco Nexus 9336C'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Cisco ASA 5525-X'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Fortinet FortiGate 200F'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Aruba 6300M'),
  ((SELECT id FROM hardware_categories WHERE key = 'network'), 'Juniper EX4300'),
  ((SELECT id FROM hardware_categories WHERE key = 'power'),   'APC Smart-UPS SRT 10kVA'),
  ((SELECT id FROM hardware_categories WHERE key = 'power'),   'APC Smart-UPS SRT 6kVA'),
  ((SELECT id FROM hardware_categories WHERE key = 'power'),   'APC Rack PDU 2G'),
  ((SELECT id FROM hardware_categories WHERE key = 'power'),   'Eaton 5PX 3000');

-- ── 4. 機櫃（A 列 12 座）──
INSERT INTO racks (name, label, row_name, total_u, sort_order) VALUES
  ('A-01', 'Web Tier',       'A', 42,  1),
  ('A-02', 'App Tier',       'A', 42,  2),
  ('A-03', 'API Gateway',    'A', 42,  3),
  ('A-04', 'Microservice',   'A', 42,  4),
  ('A-05', 'DB Primary',     'A', 42,  5),
  ('A-06', 'DB Replica',     'A', 42,  6),
  ('A-07', 'Storage',        'A', 42,  7),
  ('A-08', 'Backup',         'A', 42,  8),
  ('A-09', 'Network Core',   'A', 42,  9),
  ('A-10', 'Security',       'A', 42, 10),
  ('A-11', 'Monitor & Log',  'A', 42, 11),
  ('A-12', 'Dev / Staging',  'A', 42, 12);

-- ── 5. 硬體資產 ──

-- ===== A-01 Web Tier =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A01',    'power',   'APC Smart-UPS SRT 6kVA',    'APC',      '',            'A-01', 'Web UPS',              true,  1, 3),
  ('PDU-A01-L',  'power',   'APC Rack PDU 2G',           'APC',      '',            'A-01', '左 PDU',               true,  4, 1),
  ('PDU-A01-R',  'power',   'APC Rack PDU 2G',           'APC',      '',            'A-01', '右 PDU',               true,  5, 1),
  ('SW-A01',     'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.1.1',   'A-01', 'ToR Switch',           true, 40, 1),
  ('FW-A01',     'network', 'Fortinet FortiGate 200F',    'Fortinet', '10.1.1.2',   'A-01', '前端防火牆',            true, 41, 1),
  ('Web-01',     'server',  'HPE ProLiant DL360 Gen10',   'HPE',      '10.1.1.11',  'A-01', 'Nginx LB',             true, 10, 1),
  ('Web-02',     'server',  'HPE ProLiant DL360 Gen10',   'HPE',      '10.1.1.12',  'A-01', 'Nginx LB',             true, 11, 1),
  ('Web-03',     'server',  'HPE ProLiant DL360 Gen10',   'HPE',      '10.1.1.13',  'A-01', 'Nginx LB',             true, 12, 1),
  ('Web-04',     'server',  'HPE ProLiant DL360 Gen10',   'HPE',      '10.1.1.14',  'A-01', 'Nginx LB 備援',        true, 13, 1),
  ('CDN-01',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.1.21',  'A-01', 'CDN Cache',            true, 16, 2),
  ('CDN-02',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.1.22',  'A-01', 'CDN Cache',            true, 18, 2);

-- ===== A-02 App Tier =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A02',    'power',   'APC Smart-UPS SRT 6kVA',    'APC',      '',            'A-02', 'App UPS',              true,  1, 3),
  ('PDU-A02',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-02', 'PDU',                  true,  4, 1),
  ('SW-A02',     'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.2.1',   'A-02', 'ToR Switch',           true, 40, 1),
  ('App-01',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.2.11',  'A-02', 'App Server',           true, 10, 2),
  ('App-02',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.2.12',  'A-02', 'App Server',           true, 12, 2),
  ('App-03',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.2.13',  'A-02', 'App Server',           true, 14, 2),
  ('App-04',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.2.14',  'A-02', 'App Server',           true, 16, 2),
  ('Cache-01',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.2.31',  'A-02', 'Redis Cache',          true, 22, 1),
  ('Cache-02',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.2.32',  'A-02', 'Redis Cache',          true, 23, 1),
  ('MQ-01',      'server',  'Dell PowerEdge R640',        'Dell',     '10.1.2.41',  'A-02', 'RabbitMQ',             true, 26, 1);

-- ===== A-03 API Gateway =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A03',    'power',   'Eaton 5PX 3000',            'Eaton',    '',            'A-03', 'API UPS',              true,  1, 2),
  ('PDU-A03',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-03', 'PDU',                  true,  3, 1),
  ('SW-A03',     'network', 'Aruba 6300M',               'Aruba',    '10.1.3.1',   'A-03', 'ToR Switch',           true, 40, 1),
  ('APIGW-01',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.3.11',  'A-03', 'Kong Gateway',         true, 10, 1),
  ('APIGW-02',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.3.12',  'A-03', 'Kong Gateway',         true, 11, 1),
  ('APIGW-03',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.3.13',  'A-03', 'Kong Gateway',         true, 12, 1),
  ('Auth-01',    'server',  'HPE ProLiant DL360 Gen10',   'HPE',      '10.1.3.21',  'A-03', 'OAuth / SSO',          true, 16, 1),
  ('Auth-02',    'server',  'HPE ProLiant DL360 Gen10',   'HPE',      '10.1.3.22',  'A-03', 'OAuth / SSO',          true, 17, 1);

-- ===== A-04 Microservice =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A04',    'power',   'APC Smart-UPS SRT 6kVA',    'APC',      '',            'A-04', 'Micro UPS',            true,  1, 3),
  ('PDU-A04',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-04', 'PDU',                  true,  4, 1),
  ('SW-A04',     'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.4.1',   'A-04', 'ToR Switch',           true, 40, 1),
  ('K8s-M01',    'server',  'Lenovo ThinkSystem SR650',   'Lenovo',   '10.1.4.11',  'A-04', 'K8s Master',           true, 10, 2),
  ('K8s-M02',    'server',  'Lenovo ThinkSystem SR650',   'Lenovo',   '10.1.4.12',  'A-04', 'K8s Master',           true, 12, 2),
  ('K8s-M03',    'server',  'Lenovo ThinkSystem SR650',   'Lenovo',   '10.1.4.13',  'A-04', 'K8s Master',           true, 14, 2),
  ('K8s-W01',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.4.21',  'A-04', 'K8s Worker',           true, 18, 2),
  ('K8s-W02',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.4.22',  'A-04', 'K8s Worker',           true, 20, 2),
  ('K8s-W03',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.4.23',  'A-04', 'K8s Worker',           true, 22, 2),
  ('K8s-W04',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.4.24',  'A-04', 'K8s Worker',           true, 24, 2),
  ('K8s-W05',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.4.25',  'A-04', 'K8s Worker',           true, 26, 2),
  ('Registry',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.4.31',  'A-04', 'Harbor Registry',      true, 30, 1);

-- ===== A-05 DB Primary =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A05',    'power',   'APC Smart-UPS SRT 10kVA',   'APC',      '',            'A-05', 'DB UPS',               true,  1, 4),
  ('PDU-A05-L',  'power',   'APC Rack PDU 2G',           'APC',      '',            'A-05', '左 PDU',               true,  5, 1),
  ('PDU-A05-R',  'power',   'APC Rack PDU 2G',           'APC',      '',            'A-05', '右 PDU',               true,  6, 1),
  ('SW-A05',     'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.5.1',   'A-05', 'ToR Switch',           true, 40, 1),
  ('PG-Pri',     'server',  'Dell PowerEdge R740',        'Dell',     '10.1.5.11',  'A-05', 'PostgreSQL Primary',   true, 10, 2),
  ('PG-Sync',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.5.12',  'A-05', 'PostgreSQL Sync Rep',  true, 12, 2),
  ('MySQL-Pri',  'server',  'Dell PowerEdge R740',        'Dell',     '10.1.5.21',  'A-05', 'MySQL Primary',        true, 16, 2),
  ('MySQL-Sync', 'server',  'Dell PowerEdge R740',        'Dell',     '10.1.5.22',  'A-05', 'MySQL Sync Rep',       true, 18, 2),
  ('Mongo-01',   'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.5.31',  'A-05', 'MongoDB Primary',      true, 22, 2),
  ('SAN-A05',    'storage', 'Dell EMC Unity XT 380',      'Dell',     '10.1.5.41',  'A-05', 'DB SAN',               true, 28, 3);

-- ===== A-06 DB Replica =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A06',    'power',   'APC Smart-UPS SRT 10kVA',   'APC',      '',            'A-06', 'DB Rep UPS',           true,  1, 4),
  ('PDU-A06',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-06', 'PDU',                  true,  5, 1),
  ('SW-A06',     'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.6.1',   'A-06', 'ToR Switch',           true, 40, 1),
  ('PG-Rep1',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.6.11',  'A-06', 'PostgreSQL Replica',   true, 10, 2),
  ('PG-Rep2',    'server',  'Dell PowerEdge R740',        'Dell',     '10.1.6.12',  'A-06', 'PostgreSQL Replica',   true, 12, 2),
  ('MySQL-Rep1', 'server',  'Dell PowerEdge R740',        'Dell',     '10.1.6.21',  'A-06', 'MySQL Replica',        true, 16, 2),
  ('MySQL-Rep2', 'server',  'Dell PowerEdge R740',        'Dell',     '10.1.6.22',  'A-06', 'MySQL Replica',        true, 18, 2),
  ('Mongo-02',   'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.6.31',  'A-06', 'MongoDB Secondary',    true, 22, 2),
  ('Mongo-03',   'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.6.32',  'A-06', 'MongoDB Arbiter',      true, 24, 2);

-- ===== A-07 Storage =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A07',    'power',   'APC Smart-UPS SRT 10kVA',   'APC',      '',            'A-07', 'Storage UPS',          true,  1, 4),
  ('PDU-A07',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-07', 'PDU',                  true,  5, 1),
  ('SW-A07',     'network', 'Cisco Nexus 9336C',         'Cisco',    '10.1.7.1',   'A-07', 'Storage Switch',       true, 40, 2),
  ('NAS-01',     'storage', 'Synology RS3621xs+',         'Synology', '10.1.7.11',  'A-07', 'NFS 主儲存',           true, 10, 2),
  ('NAS-02',     'storage', 'Synology RS3621xs+',         'Synology', '10.1.7.12',  'A-07', 'NFS 副儲存',           true, 12, 2),
  ('SAN-01',     'storage', 'Dell EMC Unity XT 380',      'Dell',     '10.1.7.21',  'A-07', 'iSCSI SAN',            true, 16, 3),
  ('SAN-02',     'storage', 'NetApp FAS2750',             'NetApp',   '10.1.7.22',  'A-07', 'NFS SAN',              true, 20, 3),
  ('QNAP-01',   'storage', 'QNAP TS-h2490FU',           'QNAP',    '10.1.7.31',  'A-07', '影音檔案',              true, 25, 2);

-- ===== A-08 Backup =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A08',    'power',   'APC Smart-UPS SRT 6kVA',    'APC',      '',            'A-08', 'Backup UPS',           true,  1, 3),
  ('PDU-A08',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-08', 'PDU',                  true,  4, 1),
  ('SW-A08',     'network', 'Aruba 6300M',               'Aruba',    '10.1.8.1',   'A-08', 'ToR Switch',           true, 40, 1),
  ('BK-NAS-01',  'storage', 'Synology RS3621xs+',         'Synology', '10.1.8.11',  'A-08', '每日備份',              true, 10, 2),
  ('BK-NAS-02',  'storage', 'Synology RS3621xs+',         'Synology', '10.1.8.12',  'A-08', '週備份',               true, 12, 2),
  ('BK-NAS-03',  'storage', 'Synology RS3621xs+',         'Synology', '10.1.8.13',  'A-08', '月備份歸檔',            true, 14, 2),
  ('Tape-01',    'storage', 'Dell EMC Unity XT 380',      'Dell',     '10.1.8.21',  'A-08', 'Tape Library',         true, 20, 4),
  ('BK-Srv',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.8.31',  'A-08', 'Veeam Backup',         true, 26, 2);

-- ===== A-09 Network Core =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A09',    'power',   'APC Smart-UPS SRT 10kVA',   'APC',      '',            'A-09', 'Core UPS',             true,  1, 4),
  ('PDU-A09-L',  'power',   'APC Rack PDU 2G',           'APC',      '',            'A-09', '左 PDU',               true,  5, 1),
  ('PDU-A09-R',  'power',   'APC Rack PDU 2G',           'APC',      '',            'A-09', '右 PDU',               true,  6, 1),
  ('Core-SW-1',  'network', 'Cisco Nexus 9336C',         'Cisco',    '10.1.9.1',   'A-09', 'Core Switch A',        true, 38, 2),
  ('Core-SW-2',  'network', 'Cisco Nexus 9336C',         'Cisco',    '10.1.9.2',   'A-09', 'Core Switch B',        true, 40, 2),
  ('Dist-SW-1',  'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.9.11',  'A-09', 'Distribution A',       true, 34, 1),
  ('Dist-SW-2',  'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.9.12',  'A-09', 'Distribution B',       true, 35, 1),
  ('Router-1',   'network', 'Juniper EX4300',             'Juniper',  '10.1.9.21',  'A-09', 'Edge Router A',        true, 30, 1),
  ('Router-2',   'network', 'Juniper EX4300',             'Juniper',  '10.1.9.22',  'A-09', 'Edge Router B',        true, 31, 1),
  ('Patch-1',    'network', 'Aruba 6300M',               'Aruba',    '',            'A-09', 'Patch Panel 1',        true, 10, 1),
  ('Patch-2',    'network', 'Aruba 6300M',               'Aruba',    '',            'A-09', 'Patch Panel 2',        true, 11, 1),
  ('Patch-3',    'network', 'Aruba 6300M',               'Aruba',    '',            'A-09', 'Patch Panel 3',        true, 12, 1);

-- ===== A-10 Security =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A10',    'power',   'APC Smart-UPS SRT 6kVA',    'APC',      '',            'A-10', 'Security UPS',         true,  1, 3),
  ('PDU-A10',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-10', 'PDU',                  true,  4, 1),
  ('SW-A10',     'network', 'Cisco Catalyst 9300',        'Cisco',    '10.1.10.1',  'A-10', 'ToR Switch',           true, 40, 1),
  ('FW-Ext',     'network', 'Fortinet FortiGate 200F',    'Fortinet', '10.1.10.11', 'A-10', '外部防火牆',            true, 38, 1),
  ('FW-Int',     'network', 'Fortinet FortiGate 200F',    'Fortinet', '10.1.10.12', 'A-10', '內部防火牆',            true, 36, 1),
  ('IDS-01',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.10.21', 'A-10', 'Suricata IDS',         true, 10, 1),
  ('IDS-02',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.10.22', 'A-10', 'Suricata IDS',         true, 11, 1),
  ('WAF-01',     'server',  'HPE ProLiant DL360 Gen10',   'HPE',      '10.1.10.31', 'A-10', 'ModSecurity WAF',      true, 14, 1),
  ('SIEM-01',    'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.10.41', 'A-10', 'Wazuh SIEM',           true, 18, 2),
  ('Vault-01',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.10.51', 'A-10', 'HashiCorp Vault',      true, 22, 1);

-- ===== A-11 Monitor & Log =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A11',    'power',   'APC Smart-UPS SRT 6kVA',    'APC',      '',            'A-11', 'Mon UPS',              true,  1, 3),
  ('PDU-A11',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-11', 'PDU',                  true,  4, 1),
  ('SW-A11',     'network', 'Aruba 6300M',               'Aruba',    '10.1.11.1',  'A-11', 'ToR Switch',           true, 40, 1),
  ('Zabbix',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.11.11', 'A-11', 'Zabbix Server',        true, 10, 2),
  ('Grafana',    'server',  'Dell PowerEdge R640',        'Dell',     '10.1.11.12', 'A-11', 'Grafana + Prometheus', true, 12, 1),
  ('ELK-01',     'server',  'Dell PowerEdge R740',        'Dell',     '10.1.11.21', 'A-11', 'Elasticsearch',        true, 16, 2),
  ('ELK-02',     'server',  'Dell PowerEdge R740',        'Dell',     '10.1.11.22', 'A-11', 'Elasticsearch',        true, 18, 2),
  ('ELK-03',     'server',  'Dell PowerEdge R740',        'Dell',     '10.1.11.23', 'A-11', 'Elasticsearch',        true, 20, 2),
  ('Logstash',   'server',  'Dell PowerEdge R640',        'Dell',     '10.1.11.31', 'A-11', 'Logstash',             true, 24, 1),
  ('Kibana',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.11.32', 'A-11', 'Kibana',               true, 25, 1),
  ('Log-NAS',    'storage', 'QNAP TS-h2490FU',           'QNAP',    '10.1.11.41', 'A-11', 'Log 儲存',              true, 28, 2);

-- ===== A-12 Dev / Staging =====
INSERT INTO hardware_assets (name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size) VALUES
  ('UPS-A12',    'power',   'Eaton 5PX 3000',            'Eaton',    '',            'A-12', 'Dev UPS',              true,  1, 2),
  ('PDU-A12',    'power',   'APC Rack PDU 2G',           'APC',      '',            'A-12', 'PDU',                  true,  3, 1),
  ('SW-A12',     'network', 'Aruba 6300M',               'Aruba',    '10.1.12.1',  'A-12', 'ToR Switch',           true, 40, 1),
  ('Dev-01',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.12.11', 'A-12', 'Dev App',              true, 10, 1),
  ('Dev-02',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.12.12', 'A-12', 'Dev DB',               true, 11, 1),
  ('Dev-03',     'server',  'Dell PowerEdge R640',        'Dell',     '10.1.12.13', 'A-12', 'Dev Tools',            true, 12, 1),
  ('Stg-01',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.12.21', 'A-12', 'Staging App',          true, 16, 2),
  ('Stg-02',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.12.22', 'A-12', 'Staging DB',           true, 18, 2),
  ('CI-CD',      'server',  'Dell PowerEdge R640',        'Dell',     '10.1.12.31', 'A-12', 'Jenkins / GitLab CI',  true, 22, 1),
  ('GitLab',     'server',  'HPE ProLiant DL380 Gen10',   'HPE',      '10.1.12.32', 'A-12', 'GitLab Server',        true, 24, 2),
  ('Dev-NAS',    'storage', 'Synology RS3621xs+',         'Synology', '10.1.12.41', 'A-12', 'Dev 共享儲存',          true, 28, 2);
