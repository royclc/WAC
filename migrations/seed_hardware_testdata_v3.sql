-- ============================================
-- 測試資料 v3：A~C 列，每列 14~16 座機櫃
-- Date: 2026-06-05
-- For: Supabase
-- ============================================

DELETE FROM hardware_assets;
DELETE FROM hardware_models;
DELETE FROM hardware_categories;
DELETE FROM racks;

-- ── 類別 ──
INSERT INTO hardware_categories (key, label, sort_order) VALUES
  ('server',  'x86 伺服器', 1),
  ('storage', '儲存設備',   2),
  ('network', '網路設備',   3),
  ('power',   '電源設備',   4);

-- ── 型號 ──
INSERT INTO hardware_models (category_id, name) VALUES
  ((SELECT id FROM hardware_categories WHERE key='server'),  'HPE DL380 Gen10'),
  ((SELECT id FROM hardware_categories WHERE key='server'),  'HPE DL360 Gen10'),
  ((SELECT id FROM hardware_categories WHERE key='server'),  'Dell R740'),
  ((SELECT id FROM hardware_categories WHERE key='server'),  'Dell R640'),
  ((SELECT id FROM hardware_categories WHERE key='server'),  'Lenovo SR650'),
  ((SELECT id FROM hardware_categories WHERE key='storage'), 'Synology RS3621xs+'),
  ((SELECT id FROM hardware_categories WHERE key='storage'), 'QNAP TS-h2490FU'),
  ((SELECT id FROM hardware_categories WHERE key='storage'), 'Dell EMC Unity XT'),
  ((SELECT id FROM hardware_categories WHERE key='storage'), 'NetApp FAS2750'),
  ((SELECT id FROM hardware_categories WHERE key='network'), 'Cisco C9300'),
  ((SELECT id FROM hardware_categories WHERE key='network'), 'Cisco Nexus 9336'),
  ((SELECT id FROM hardware_categories WHERE key='network'), 'Fortinet FG-200F'),
  ((SELECT id FROM hardware_categories WHERE key='network'), 'Aruba 6300M'),
  ((SELECT id FROM hardware_categories WHERE key='network'), 'Juniper EX4300'),
  ((SELECT id FROM hardware_categories WHERE key='power'),   'APC SRT 10kVA'),
  ((SELECT id FROM hardware_categories WHERE key='power'),   'APC SRT 6kVA'),
  ((SELECT id FROM hardware_categories WHERE key='power'),   'APC PDU 2G'),
  ((SELECT id FROM hardware_categories WHERE key='power'),   'Eaton 5PX 3000');

-- ══════════════════════════════════════
-- 機櫃：A 列 16 座、B 列 14 座、C 列 16 座
-- ══════════════════════════════════════

INSERT INTO racks (name, label, row_name, total_u, sort_order) VALUES
  -- A 列（核心運算）
  ('A-01','Web LB',       'A',42, 1),('A-02','Web App',      'A',42, 2),
  ('A-03','API Gateway',  'A',42, 3),('A-04','Microservice A','A',42, 4),
  ('A-05','Microservice B','A',42, 5),('A-06','App Tier A',   'A',42, 6),
  ('A-07','App Tier B',   'A',42, 7),('A-08','Cache / MQ',   'A',42, 8),
  ('A-09','DB Primary A', 'A',42, 9),('A-10','DB Primary B', 'A',42,10),
  ('A-11','DB Replica A', 'A',42,11),('A-12','DB Replica B', 'A',42,12),
  ('A-13','Big Data A',   'A',42,13),('A-14','Big Data B',   'A',42,14),
  ('A-15','AI / ML',      'A',42,15),('A-16','HPC',          'A',42,16),
  -- B 列（儲存 / 備份 / 網路）
  ('B-01','Storage A',    'B',42, 1),('B-02','Storage B',    'B',42, 2),
  ('B-03','Storage C',    'B',42, 3),('B-04','Backup A',     'B',42, 4),
  ('B-05','Backup B',     'B',42, 5),('B-06','Archive',      'B',42, 6),
  ('B-07','Net Core A',   'B',42, 7),('B-08','Net Core B',   'B',42, 8),
  ('B-09','Net Dist A',   'B',42, 9),('B-10','Net Dist B',   'B',42,10),
  ('B-11','Security A',   'B',42,11),('B-12','Security B',   'B',42,12),
  ('B-13','DMZ',          'B',42,13),('B-14','WAN / VPN',    'B',42,14),
  -- C 列（監控 / 開發 / 災備）
  ('C-01','Monitor',      'C',42, 1),('C-02','Log / SIEM',   'C',42, 2),
  ('C-03','CMDB / ITSM',  'C',42, 3),('C-04','Dev A',        'C',42, 4),
  ('C-05','Dev B',        'C',42, 5),('C-06','Staging A',    'C',42, 6),
  ('C-07','Staging B',    'C',42, 7),('C-08','CI / CD',      'C',42, 8),
  ('C-09','Container Reg','C',42, 9),('C-10','DR Primary',   'C',42,10),
  ('C-11','DR Replica',   'C',42,11),('C-12','DR Storage',   'C',42,12),
  ('C-13','Lab A',        'C',42,13),('C-14','Lab B',        'C',42,14),
  ('C-15','Telecom',      'C',42,15),('C-16','Facility',     'C',42,16);

-- ══════════════════════════════════════
-- 硬體資產（每櫃 6~12 台設備）
-- ══════════════════════════════════════

-- ===== A-01 Web LB =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A01','power','APC SRT 6kVA','APC','','A-01','UPS',true,1,3),
('PDU-A01','power','APC PDU 2G','APC','','A-01','PDU',true,4,1),
('SW-A01','network','Cisco C9300','Cisco','10.1.1.1','A-01','ToR',true,40,1),
('FW-A01','network','Fortinet FG-200F','Fortinet','10.1.1.2','A-01','WAF',true,41,1),
('LB-01','server','HPE DL360 Gen10','HPE','10.1.1.11','A-01','Nginx LB',true,10,1),
('LB-02','server','HPE DL360 Gen10','HPE','10.1.1.12','A-01','Nginx LB',true,11,1),
('LB-03','server','HPE DL360 Gen10','HPE','10.1.1.13','A-01','Nginx LB',true,12,1),
('LB-04','server','HPE DL360 Gen10','HPE','10.1.1.14','A-01','Nginx LB',true,13,1);

-- ===== A-02 Web App =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A02','power','APC SRT 6kVA','APC','','A-02','UPS',true,1,3),
('PDU-A02','power','APC PDU 2G','APC','','A-02','PDU',true,4,1),
('SW-A02','network','Cisco C9300','Cisco','10.1.2.1','A-02','ToR',true,40,1),
('Web-01','server','Dell R640','Dell','10.1.2.11','A-02','Web App',true,10,1),
('Web-02','server','Dell R640','Dell','10.1.2.12','A-02','Web App',true,11,1),
('Web-03','server','Dell R640','Dell','10.1.2.13','A-02','Web App',true,12,1),
('Web-04','server','Dell R640','Dell','10.1.2.14','A-02','Web App',true,13,1),
('Web-05','server','Dell R640','Dell','10.1.2.15','A-02','Web App',true,14,1),
('Web-06','server','Dell R640','Dell','10.1.2.16','A-02','Web App',true,15,1);

-- ===== A-03 API Gateway =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A03','power','Eaton 5PX 3000','Eaton','','A-03','UPS',true,1,2),
('PDU-A03','power','APC PDU 2G','APC','','A-03','PDU',true,3,1),
('SW-A03','network','Aruba 6300M','Aruba','10.1.3.1','A-03','ToR',true,40,1),
('APIGW-01','server','Dell R640','Dell','10.1.3.11','A-03','Kong',true,10,1),
('APIGW-02','server','Dell R640','Dell','10.1.3.12','A-03','Kong',true,11,1),
('APIGW-03','server','Dell R640','Dell','10.1.3.13','A-03','Kong',true,12,1),
('Auth-01','server','HPE DL360 Gen10','HPE','10.1.3.21','A-03','SSO',true,16,1),
('Auth-02','server','HPE DL360 Gen10','HPE','10.1.3.22','A-03','SSO',true,17,1);

-- ===== A-04 Microservice A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A04','power','APC SRT 6kVA','APC','','A-04','UPS',true,1,3),
('PDU-A04','power','APC PDU 2G','APC','','A-04','PDU',true,4,1),
('SW-A04','network','Cisco C9300','Cisco','10.1.4.1','A-04','ToR',true,40,1),
('K8M-01','server','Lenovo SR650','Lenovo','10.1.4.11','A-04','K8s Master',true,10,2),
('K8M-02','server','Lenovo SR650','Lenovo','10.1.4.12','A-04','K8s Master',true,12,2),
('K8M-03','server','Lenovo SR650','Lenovo','10.1.4.13','A-04','K8s Master',true,14,2),
('K8W-01','server','Dell R740','Dell','10.1.4.21','A-04','K8s Worker',true,18,2),
('K8W-02','server','Dell R740','Dell','10.1.4.22','A-04','K8s Worker',true,20,2),
('K8W-03','server','Dell R740','Dell','10.1.4.23','A-04','K8s Worker',true,22,2),
('K8W-04','server','Dell R740','Dell','10.1.4.24','A-04','K8s Worker',true,24,2);

-- ===== A-05 Microservice B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A05','power','APC SRT 6kVA','APC','','A-05','UPS',true,1,3),
('PDU-A05','power','APC PDU 2G','APC','','A-05','PDU',true,4,1),
('SW-A05','network','Cisco C9300','Cisco','10.1.5.1','A-05','ToR',true,40,1),
('K8W-05','server','Dell R740','Dell','10.1.5.11','A-05','K8s Worker',true,10,2),
('K8W-06','server','Dell R740','Dell','10.1.5.12','A-05','K8s Worker',true,12,2),
('K8W-07','server','Dell R740','Dell','10.1.5.13','A-05','K8s Worker',true,14,2),
('K8W-08','server','Dell R740','Dell','10.1.5.14','A-05','K8s Worker',true,16,2),
('Registry','server','Dell R640','Dell','10.1.5.21','A-05','Harbor',true,20,1),
('Istio-01','server','Dell R640','Dell','10.1.5.22','A-05','Service Mesh',true,21,1);

-- ===== A-06 App Tier A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A06','power','APC SRT 6kVA','APC','','A-06','UPS',true,1,3),
('PDU-A06','power','APC PDU 2G','APC','','A-06','PDU',true,4,1),
('SW-A06','network','Cisco C9300','Cisco','10.1.6.1','A-06','ToR',true,40,1),
('App-01','server','HPE DL380 Gen10','HPE','10.1.6.11','A-06','App',true,10,2),
('App-02','server','HPE DL380 Gen10','HPE','10.1.6.12','A-06','App',true,12,2),
('App-03','server','HPE DL380 Gen10','HPE','10.1.6.13','A-06','App',true,14,2),
('App-04','server','HPE DL380 Gen10','HPE','10.1.6.14','A-06','App',true,16,2);

-- ===== A-07 App Tier B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A07','power','APC SRT 6kVA','APC','','A-07','UPS',true,1,3),
('PDU-A07','power','APC PDU 2G','APC','','A-07','PDU',true,4,1),
('SW-A07','network','Cisco C9300','Cisco','10.1.7.1','A-07','ToR',true,40,1),
('App-05','server','HPE DL380 Gen10','HPE','10.1.7.11','A-07','App',true,10,2),
('App-06','server','HPE DL380 Gen10','HPE','10.1.7.12','A-07','App',true,12,2),
('App-07','server','HPE DL380 Gen10','HPE','10.1.7.13','A-07','App',true,14,2),
('App-08','server','HPE DL380 Gen10','HPE','10.1.7.14','A-07','App',true,16,2);

-- ===== A-08 Cache / MQ =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A08','power','Eaton 5PX 3000','Eaton','','A-08','UPS',true,1,2),
('PDU-A08','power','APC PDU 2G','APC','','A-08','PDU',true,3,1),
('SW-A08','network','Aruba 6300M','Aruba','10.1.8.1','A-08','ToR',true,40,1),
('Redis-01','server','Dell R640','Dell','10.1.8.11','A-08','Redis',true,10,1),
('Redis-02','server','Dell R640','Dell','10.1.8.12','A-08','Redis',true,11,1),
('Redis-03','server','Dell R640','Dell','10.1.8.13','A-08','Redis Sentinel',true,12,1),
('MQ-01','server','Dell R640','Dell','10.1.8.21','A-08','RabbitMQ',true,16,1),
('MQ-02','server','Dell R640','Dell','10.1.8.22','A-08','RabbitMQ',true,17,1),
('Kafka-01','server','HPE DL380 Gen10','HPE','10.1.8.31','A-08','Kafka',true,20,2),
('Kafka-02','server','HPE DL380 Gen10','HPE','10.1.8.32','A-08','Kafka',true,22,2);

-- ===== A-09 DB Primary A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A09','power','APC SRT 10kVA','APC','','A-09','UPS',true,1,4),
('PDU-A09L','power','APC PDU 2G','APC','','A-09','PDU L',true,5,1),
('PDU-A09R','power','APC PDU 2G','APC','','A-09','PDU R',true,6,1),
('SW-A09','network','Cisco C9300','Cisco','10.1.9.1','A-09','ToR',true,40,1),
('PG-Pri','server','Dell R740','Dell','10.1.9.11','A-09','PG Primary',true,10,2),
('PG-Sync','server','Dell R740','Dell','10.1.9.12','A-09','PG Sync',true,12,2),
('MySQL-Pri','server','Dell R740','Dell','10.1.9.21','A-09','MySQL Pri',true,16,2),
('SAN-A09','storage','Dell EMC Unity XT','Dell','10.1.9.31','A-09','DB SAN',true,22,3);

-- ===== A-10 DB Primary B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A10','power','APC SRT 10kVA','APC','','A-10','UPS',true,1,4),
('PDU-A10','power','APC PDU 2G','APC','','A-10','PDU',true,5,1),
('SW-A10','network','Cisco C9300','Cisco','10.1.10.1','A-10','ToR',true,40,1),
('Mongo-P1','server','HPE DL380 Gen10','HPE','10.1.10.11','A-10','Mongo Pri',true,10,2),
('Mongo-P2','server','HPE DL380 Gen10','HPE','10.1.10.12','A-10','Mongo Pri',true,12,2),
('ES-Data1','server','Dell R740','Dell','10.1.10.21','A-10','Elastic',true,16,2),
('ES-Data2','server','Dell R740','Dell','10.1.10.22','A-10','Elastic',true,18,2),
('SAN-A10','storage','NetApp FAS2750','NetApp','10.1.10.31','A-10','SAN',true,22,3);

-- ===== A-11 DB Replica A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A11','power','APC SRT 10kVA','APC','','A-11','UPS',true,1,4),
('PDU-A11','power','APC PDU 2G','APC','','A-11','PDU',true,5,1),
('SW-A11','network','Cisco C9300','Cisco','10.1.11.1','A-11','ToR',true,40,1),
('PG-Rep1','server','Dell R740','Dell','10.1.11.11','A-11','PG Rep',true,10,2),
('PG-Rep2','server','Dell R740','Dell','10.1.11.12','A-11','PG Rep',true,12,2),
('MySQL-R1','server','Dell R740','Dell','10.1.11.21','A-11','MySQL Rep',true,16,2),
('MySQL-R2','server','Dell R740','Dell','10.1.11.22','A-11','MySQL Rep',true,18,2);

-- ===== A-12 DB Replica B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A12','power','APC SRT 10kVA','APC','','A-12','UPS',true,1,4),
('PDU-A12','power','APC PDU 2G','APC','','A-12','PDU',true,5,1),
('SW-A12','network','Cisco C9300','Cisco','10.1.12.1','A-12','ToR',true,40,1),
('Mongo-R1','server','HPE DL380 Gen10','HPE','10.1.12.11','A-12','Mongo Sec',true,10,2),
('Mongo-R2','server','HPE DL380 Gen10','HPE','10.1.12.12','A-12','Mongo Arb',true,12,2),
('ES-Rep1','server','Dell R740','Dell','10.1.12.21','A-12','ES Rep',true,16,2),
('ES-Rep2','server','Dell R740','Dell','10.1.12.22','A-12','ES Rep',true,18,2);

-- ===== A-13 Big Data A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A13','power','APC SRT 10kVA','APC','','A-13','UPS',true,1,4),
('PDU-A13','power','APC PDU 2G','APC','','A-13','PDU',true,5,1),
('SW-A13','network','Cisco Nexus 9336','Cisco','10.1.13.1','A-13','ToR',true,40,2),
('Hadoop-N1','server','Dell R740','Dell','10.1.13.11','A-13','NameNode',true,10,2),
('Hadoop-N2','server','Dell R740','Dell','10.1.13.12','A-13','NameNode HA',true,12,2),
('Hadoop-D1','server','Dell R740','Dell','10.1.13.21','A-13','DataNode',true,16,2),
('Hadoop-D2','server','Dell R740','Dell','10.1.13.22','A-13','DataNode',true,18,2),
('Hadoop-D3','server','Dell R740','Dell','10.1.13.23','A-13','DataNode',true,20,2),
('Hadoop-D4','server','Dell R740','Dell','10.1.13.24','A-13','DataNode',true,22,2),
('Spark-01','server','HPE DL380 Gen10','HPE','10.1.13.31','A-13','Spark',true,26,2);

-- ===== A-14 Big Data B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A14','power','APC SRT 10kVA','APC','','A-14','UPS',true,1,4),
('PDU-A14','power','APC PDU 2G','APC','','A-14','PDU',true,5,1),
('SW-A14','network','Cisco Nexus 9336','Cisco','10.1.14.1','A-14','ToR',true,40,2),
('Hadoop-D5','server','Dell R740','Dell','10.1.14.11','A-14','DataNode',true,10,2),
('Hadoop-D6','server','Dell R740','Dell','10.1.14.12','A-14','DataNode',true,12,2),
('Hadoop-D7','server','Dell R740','Dell','10.1.14.13','A-14','DataNode',true,14,2),
('Hadoop-D8','server','Dell R740','Dell','10.1.14.14','A-14','DataNode',true,16,2),
('Hive-01','server','HPE DL380 Gen10','HPE','10.1.14.21','A-14','Hive',true,20,2),
('Presto-01','server','HPE DL380 Gen10','HPE','10.1.14.22','A-14','Presto',true,22,2),
('HDFS-NAS','storage','Synology RS3621xs+','Synology','10.1.14.31','A-14','HDFS Backup',true,26,2);

-- ===== A-15 AI / ML =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A15','power','APC SRT 10kVA','APC','','A-15','UPS',true,1,4),
('PDU-A15L','power','APC PDU 2G','APC','','A-15','PDU L',true,5,1),
('PDU-A15R','power','APC PDU 2G','APC','','A-15','PDU R',true,6,1),
('SW-A15','network','Cisco Nexus 9336','Cisco','10.1.15.1','A-15','ToR',true,40,2),
('GPU-01','server','Dell R740','Dell','10.1.15.11','A-15','GPU Training',true,10,4),
('GPU-02','server','Dell R740','Dell','10.1.15.12','A-15','GPU Training',true,14,4),
('GPU-03','server','Dell R740','Dell','10.1.15.13','A-15','GPU Inference',true,18,4),
('ML-Srv','server','HPE DL380 Gen10','HPE','10.1.15.21','A-15','MLflow',true,24,2),
('NAS-A15','storage','QNAP TS-h2490FU','QNAP','10.1.15.31','A-15','Dataset',true,28,2);

-- ===== A-16 HPC =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-A16','power','APC SRT 10kVA','APC','','A-16','UPS',true,1,4),
('PDU-A16','power','APC PDU 2G','APC','','A-16','PDU',true,5,1),
('SW-A16','network','Cisco Nexus 9336','Cisco','10.1.16.1','A-16','ToR',true,40,2),
('HPC-01','server','Lenovo SR650','Lenovo','10.1.16.11','A-16','HPC Node',true,10,2),
('HPC-02','server','Lenovo SR650','Lenovo','10.1.16.12','A-16','HPC Node',true,12,2),
('HPC-03','server','Lenovo SR650','Lenovo','10.1.16.13','A-16','HPC Node',true,14,2),
('HPC-04','server','Lenovo SR650','Lenovo','10.1.16.14','A-16','HPC Node',true,16,2),
('HPC-05','server','Lenovo SR650','Lenovo','10.1.16.15','A-16','HPC Node',true,18,2),
('HPC-06','server','Lenovo SR650','Lenovo','10.1.16.16','A-16','HPC Node',true,20,2),
('HPC-FS','storage','Dell EMC Unity XT','Dell','10.1.16.31','A-16','Parallel FS',true,26,3);

-- ===== B-01 Storage A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B01','power','APC SRT 10kVA','APC','','B-01','UPS',true,1,4),
('PDU-B01','power','APC PDU 2G','APC','','B-01','PDU',true,5,1),
('SW-B01','network','Cisco Nexus 9336','Cisco','10.2.1.1','B-01','Storage SW',true,40,2),
('NAS-B01','storage','Synology RS3621xs+','Synology','10.2.1.11','B-01','NFS A',true,10,2),
('NAS-B02','storage','Synology RS3621xs+','Synology','10.2.1.12','B-01','NFS B',true,12,2),
('SAN-B01','storage','Dell EMC Unity XT','Dell','10.2.1.21','B-01','iSCSI',true,16,3),
('SAN-B02','storage','Dell EMC Unity XT','Dell','10.2.1.22','B-01','iSCSI',true,19,3);

-- ===== B-02 Storage B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B02','power','APC SRT 10kVA','APC','','B-02','UPS',true,1,4),
('PDU-B02','power','APC PDU 2G','APC','','B-02','PDU',true,5,1),
('SW-B02','network','Cisco Nexus 9336','Cisco','10.2.2.1','B-02','Storage SW',true,40,2),
('NAS-B03','storage','QNAP TS-h2490FU','QNAP','10.2.2.11','B-02','影音',true,10,2),
('NAS-B04','storage','QNAP TS-h2490FU','QNAP','10.2.2.12','B-02','文件',true,12,2),
('SAN-B03','storage','NetApp FAS2750','NetApp','10.2.2.21','B-02','NFS SAN',true,16,3),
('OBJ-01','storage','Dell EMC Unity XT','Dell','10.2.2.31','B-02','S3 Object',true,22,3);

-- ===== B-03 Storage C =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B03','power','APC SRT 6kVA','APC','','B-03','UPS',true,1,3),
('PDU-B03','power','APC PDU 2G','APC','','B-03','PDU',true,4,1),
('SW-B03','network','Aruba 6300M','Aruba','10.2.3.1','B-03','ToR',true,40,1),
('NAS-B05','storage','Synology RS3621xs+','Synology','10.2.3.11','B-03','Cold Storage',true,10,2),
('NAS-B06','storage','Synology RS3621xs+','Synology','10.2.3.12','B-03','Archive',true,12,2),
('Minio-01','server','Dell R640','Dell','10.2.3.21','B-03','MinIO',true,18,1),
('Minio-02','server','Dell R640','Dell','10.2.3.22','B-03','MinIO',true,19,1);

-- ===== B-04 Backup A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B04','power','APC SRT 6kVA','APC','','B-04','UPS',true,1,3),
('PDU-B04','power','APC PDU 2G','APC','','B-04','PDU',true,4,1),
('SW-B04','network','Aruba 6300M','Aruba','10.2.4.1','B-04','ToR',true,40,1),
('BK-NAS1','storage','Synology RS3621xs+','Synology','10.2.4.11','B-04','Daily',true,10,2),
('BK-NAS2','storage','Synology RS3621xs+','Synology','10.2.4.12','B-04','Weekly',true,12,2),
('BK-NAS3','storage','Synology RS3621xs+','Synology','10.2.4.13','B-04','Monthly',true,14,2),
('Veeam','server','HPE DL380 Gen10','HPE','10.2.4.21','B-04','Veeam',true,20,2);

-- ===== B-05 Backup B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B05','power','APC SRT 6kVA','APC','','B-05','UPS',true,1,3),
('PDU-B05','power','APC PDU 2G','APC','','B-05','PDU',true,4,1),
('SW-B05','network','Aruba 6300M','Aruba','10.2.5.1','B-05','ToR',true,40,1),
('BK-NAS4','storage','Synology RS3621xs+','Synology','10.2.5.11','B-05','DR Backup',true,10,2),
('Tape-01','storage','Dell EMC Unity XT','Dell','10.2.5.21','B-05','Tape Lib',true,16,4),
('BK-Srv','server','Dell R640','Dell','10.2.5.31','B-05','Backup Agent',true,22,1);

-- ===== B-06 Archive =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B06','power','Eaton 5PX 3000','Eaton','','B-06','UPS',true,1,2),
('PDU-B06','power','APC PDU 2G','APC','','B-06','PDU',true,3,1),
('SW-B06','network','Aruba 6300M','Aruba','10.2.6.1','B-06','ToR',true,40,1),
('Arch-NAS1','storage','Synology RS3621xs+','Synology','10.2.6.11','B-06','5Y Archive',true,10,2),
('Arch-NAS2','storage','Synology RS3621xs+','Synology','10.2.6.12','B-06','10Y Archive',true,12,2),
('Arch-Srv','server','Dell R640','Dell','10.2.6.21','B-06','Archive Mgr',true,18,1);

-- ===== B-07 Net Core A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B07','power','APC SRT 10kVA','APC','','B-07','UPS',true,1,4),
('PDU-B07L','power','APC PDU 2G','APC','','B-07','PDU L',true,5,1),
('PDU-B07R','power','APC PDU 2G','APC','','B-07','PDU R',true,6,1),
('Core-SW1','network','Cisco Nexus 9336','Cisco','10.2.7.1','B-07','Core A',true,38,2),
('Core-SW2','network','Cisco Nexus 9336','Cisco','10.2.7.2','B-07','Core B',true,40,2),
('Dist-SW1','network','Cisco C9300','Cisco','10.2.7.11','B-07','Dist A',true,34,1),
('Dist-SW2','network','Cisco C9300','Cisco','10.2.7.12','B-07','Dist B',true,35,1),
('Patch-1','network','Aruba 6300M','Aruba','','B-07','Patch 1',true,10,1),
('Patch-2','network','Aruba 6300M','Aruba','','B-07','Patch 2',true,11,1),
('Patch-3','network','Aruba 6300M','Aruba','','B-07','Patch 3',true,12,1);

-- ===== B-08 Net Core B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B08','power','APC SRT 10kVA','APC','','B-08','UPS',true,1,4),
('PDU-B08','power','APC PDU 2G','APC','','B-08','PDU',true,5,1),
('Core-SW3','network','Cisco Nexus 9336','Cisco','10.2.8.1','B-08','Core C',true,38,2),
('Core-SW4','network','Cisco Nexus 9336','Cisco','10.2.8.2','B-08','Core D',true,40,2),
('Router-1','network','Juniper EX4300','Juniper','10.2.8.11','B-08','Edge A',true,34,1),
('Router-2','network','Juniper EX4300','Juniper','10.2.8.12','B-08','Edge B',true,35,1),
('Patch-4','network','Aruba 6300M','Aruba','','B-08','Patch 4',true,10,1),
('Patch-5','network','Aruba 6300M','Aruba','','B-08','Patch 5',true,11,1);

-- ===== B-09 Net Dist A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B09','power','APC SRT 6kVA','APC','','B-09','UPS',true,1,3),
('PDU-B09','power','APC PDU 2G','APC','','B-09','PDU',true,4,1),
('Dist-A1','network','Cisco C9300','Cisco','10.2.9.1','B-09','Floor 1',true,38,1),
('Dist-A2','network','Cisco C9300','Cisco','10.2.9.2','B-09','Floor 2',true,39,1),
('Dist-A3','network','Cisco C9300','Cisco','10.2.9.3','B-09','Floor 3',true,40,1),
('Dist-A4','network','Cisco C9300','Cisco','10.2.9.4','B-09','Floor 4',true,41,1),
('Patch-6','network','Aruba 6300M','Aruba','','B-09','Patch',true,10,1),
('Patch-7','network','Aruba 6300M','Aruba','','B-09','Patch',true,11,1);

-- ===== B-10 Net Dist B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B10','power','APC SRT 6kVA','APC','','B-10','UPS',true,1,3),
('PDU-B10','power','APC PDU 2G','APC','','B-10','PDU',true,4,1),
('Dist-B1','network','Cisco C9300','Cisco','10.2.10.1','B-10','Floor 5',true,38,1),
('Dist-B2','network','Cisco C9300','Cisco','10.2.10.2','B-10','Floor 6',true,39,1),
('Dist-B3','network','Cisco C9300','Cisco','10.2.10.3','B-10','Floor 7',true,40,1),
('Dist-B4','network','Cisco C9300','Cisco','10.2.10.4','B-10','Floor 8',true,41,1);

-- ===== B-11 Security A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B11','power','APC SRT 6kVA','APC','','B-11','UPS',true,1,3),
('PDU-B11','power','APC PDU 2G','APC','','B-11','PDU',true,4,1),
('SW-B11','network','Cisco C9300','Cisco','10.2.11.1','B-11','ToR',true,40,1),
('FW-Ext1','network','Fortinet FG-200F','Fortinet','10.2.11.11','B-11','FW Ext',true,38,1),
('FW-Ext2','network','Fortinet FG-200F','Fortinet','10.2.11.12','B-11','FW Ext HA',true,37,1),
('IDS-01','server','Dell R640','Dell','10.2.11.21','B-11','Suricata',true,10,1),
('IDS-02','server','Dell R640','Dell','10.2.11.22','B-11','Suricata',true,11,1),
('WAF-01','server','HPE DL360 Gen10','HPE','10.2.11.31','B-11','WAF',true,14,1);

-- ===== B-12 Security B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B12','power','APC SRT 6kVA','APC','','B-12','UPS',true,1,3),
('PDU-B12','power','APC PDU 2G','APC','','B-12','PDU',true,4,1),
('SW-B12','network','Cisco C9300','Cisco','10.2.12.1','B-12','ToR',true,40,1),
('FW-Int1','network','Fortinet FG-200F','Fortinet','10.2.12.11','B-12','FW Int',true,38,1),
('SIEM-01','server','HPE DL380 Gen10','HPE','10.2.12.21','B-12','Wazuh',true,10,2),
('Vault-01','server','Dell R640','Dell','10.2.12.31','B-12','Vault',true,14,1),
('PKI-01','server','Dell R640','Dell','10.2.12.32','B-12','PKI CA',true,15,1);

-- ===== B-13 DMZ =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B13','power','APC SRT 6kVA','APC','','B-13','UPS',true,1,3),
('PDU-B13','power','APC PDU 2G','APC','','B-13','PDU',true,4,1),
('FW-DMZ','network','Fortinet FG-200F','Fortinet','10.2.13.1','B-13','DMZ FW',true,40,1),
('SW-B13','network','Cisco C9300','Cisco','10.2.13.2','B-13','DMZ SW',true,39,1),
('DMZ-Web1','server','Dell R640','Dell','10.2.13.11','B-13','Public Web',true,10,1),
('DMZ-Web2','server','Dell R640','Dell','10.2.13.12','B-13','Public Web',true,11,1),
('DMZ-Mail','server','HPE DL360 Gen10','HPE','10.2.13.21','B-13','Mail Relay',true,14,1),
('DMZ-DNS','server','Dell R640','Dell','10.2.13.22','B-13','Ext DNS',true,15,1);

-- ===== B-14 WAN / VPN =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-B14','power','Eaton 5PX 3000','Eaton','','B-14','UPS',true,1,2),
('PDU-B14','power','APC PDU 2G','APC','','B-14','PDU',true,3,1),
('WAN-R1','network','Juniper EX4300','Juniper','10.2.14.1','B-14','WAN A',true,40,1),
('WAN-R2','network','Juniper EX4300','Juniper','10.2.14.2','B-14','WAN B',true,39,1),
('VPN-01','network','Fortinet FG-200F','Fortinet','10.2.14.11','B-14','VPN GW',true,36,1),
('VPN-02','network','Fortinet FG-200F','Fortinet','10.2.14.12','B-14','VPN HA',true,35,1),
('SDWAN-01','network','Cisco C9300','Cisco','10.2.14.21','B-14','SD-WAN',true,32,1);

-- ===== C-01 Monitor =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C01','power','APC SRT 6kVA','APC','','C-01','UPS',true,1,3),
('PDU-C01','power','APC PDU 2G','APC','','C-01','PDU',true,4,1),
('SW-C01','network','Aruba 6300M','Aruba','10.3.1.1','C-01','ToR',true,40,1),
('Zabbix','server','HPE DL380 Gen10','HPE','10.3.1.11','C-01','Zabbix',true,10,2),
('Grafana','server','Dell R640','Dell','10.3.1.12','C-01','Grafana+Prom',true,12,1),
('Uptime','server','Dell R640','Dell','10.3.1.13','C-01','Uptime Kuma',true,13,1),
('NetBox','server','Dell R640','Dell','10.3.1.21','C-01','DCIM',true,16,1);

-- ===== C-02 Log / SIEM =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C02','power','APC SRT 6kVA','APC','','C-02','UPS',true,1,3),
('PDU-C02','power','APC PDU 2G','APC','','C-02','PDU',true,4,1),
('SW-C02','network','Aruba 6300M','Aruba','10.3.2.1','C-02','ToR',true,40,1),
('ELK-M1','server','Dell R740','Dell','10.3.2.11','C-02','ES Master',true,10,2),
('ELK-D1','server','Dell R740','Dell','10.3.2.12','C-02','ES Data',true,12,2),
('ELK-D2','server','Dell R740','Dell','10.3.2.13','C-02','ES Data',true,14,2),
('Logstash','server','Dell R640','Dell','10.3.2.21','C-02','Logstash',true,18,1),
('Kibana','server','Dell R640','Dell','10.3.2.22','C-02','Kibana',true,19,1),
('Log-NAS','storage','QNAP TS-h2490FU','QNAP','10.3.2.31','C-02','Log Store',true,22,2);

-- ===== C-03 CMDB / ITSM =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C03','power','Eaton 5PX 3000','Eaton','','C-03','UPS',true,1,2),
('PDU-C03','power','APC PDU 2G','APC','','C-03','PDU',true,3,1),
('SW-C03','network','Aruba 6300M','Aruba','10.3.3.1','C-03','ToR',true,40,1),
('CMDB','server','Dell R640','Dell','10.3.3.11','C-03','iTop CMDB',true,10,1),
('ITSM','server','Dell R640','Dell','10.3.3.12','C-03','GLPI ITSM',true,11,1),
('Wiki','server','Dell R640','Dell','10.3.3.13','C-03','Confluence',true,12,1),
('NTP','server','HPE DL360 Gen10','HPE','10.3.3.21','C-03','NTP Server',true,16,1),
('DNS-Int','server','HPE DL360 Gen10','HPE','10.3.3.22','C-03','Internal DNS',true,17,1);

-- ===== C-04 Dev A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C04','power','Eaton 5PX 3000','Eaton','','C-04','UPS',true,1,2),
('PDU-C04','power','APC PDU 2G','APC','','C-04','PDU',true,3,1),
('SW-C04','network','Aruba 6300M','Aruba','10.3.4.1','C-04','ToR',true,40,1),
('Dev-01','server','Dell R640','Dell','10.3.4.11','C-04','Dev App',true,10,1),
('Dev-02','server','Dell R640','Dell','10.3.4.12','C-04','Dev App',true,11,1),
('Dev-03','server','Dell R640','Dell','10.3.4.13','C-04','Dev DB',true,12,1),
('Dev-04','server','Dell R640','Dell','10.3.4.14','C-04','Dev Tools',true,13,1);

-- ===== C-05 Dev B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C05','power','Eaton 5PX 3000','Eaton','','C-05','UPS',true,1,2),
('PDU-C05','power','APC PDU 2G','APC','','C-05','PDU',true,3,1),
('SW-C05','network','Aruba 6300M','Aruba','10.3.5.1','C-05','ToR',true,40,1),
('Dev-05','server','Dell R640','Dell','10.3.5.11','C-05','Dev App',true,10,1),
('Dev-06','server','Dell R640','Dell','10.3.5.12','C-05','Dev API',true,11,1),
('Dev-NAS','storage','Synology RS3621xs+','Synology','10.3.5.21','C-05','Dev Share',true,14,2);

-- ===== C-06 Staging A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C06','power','APC SRT 6kVA','APC','','C-06','UPS',true,1,3),
('PDU-C06','power','APC PDU 2G','APC','','C-06','PDU',true,4,1),
('SW-C06','network','Aruba 6300M','Aruba','10.3.6.1','C-06','ToR',true,40,1),
('Stg-App1','server','HPE DL380 Gen10','HPE','10.3.6.11','C-06','Stg App',true,10,2),
('Stg-App2','server','HPE DL380 Gen10','HPE','10.3.6.12','C-06','Stg App',true,12,2),
('Stg-DB','server','Dell R740','Dell','10.3.6.21','C-06','Stg DB',true,16,2);

-- ===== C-07 Staging B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C07','power','APC SRT 6kVA','APC','','C-07','UPS',true,1,3),
('PDU-C07','power','APC PDU 2G','APC','','C-07','PDU',true,4,1),
('SW-C07','network','Aruba 6300M','Aruba','10.3.7.1','C-07','ToR',true,40,1),
('Stg-API','server','Dell R640','Dell','10.3.7.11','C-07','Stg API',true,10,1),
('Stg-Cache','server','Dell R640','Dell','10.3.7.12','C-07','Stg Redis',true,11,1),
('Stg-NAS','storage','Synology RS3621xs+','Synology','10.3.7.21','C-07','Stg Store',true,14,2);

-- ===== C-08 CI / CD =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C08','power','Eaton 5PX 3000','Eaton','','C-08','UPS',true,1,2),
('PDU-C08','power','APC PDU 2G','APC','','C-08','PDU',true,3,1),
('SW-C08','network','Aruba 6300M','Aruba','10.3.8.1','C-08','ToR',true,40,1),
('Jenkins','server','HPE DL380 Gen10','HPE','10.3.8.11','C-08','Jenkins',true,10,2),
('GitLab','server','HPE DL380 Gen10','HPE','10.3.8.12','C-08','GitLab',true,12,2),
('Runner-1','server','Dell R640','Dell','10.3.8.21','C-08','CI Runner',true,16,1),
('Runner-2','server','Dell R640','Dell','10.3.8.22','C-08','CI Runner',true,17,1),
('Nexus','server','Dell R640','Dell','10.3.8.23','C-08','Artifact',true,18,1);

-- ===== C-09 Container Reg =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C09','power','Eaton 5PX 3000','Eaton','','C-09','UPS',true,1,2),
('PDU-C09','power','APC PDU 2G','APC','','C-09','PDU',true,3,1),
('SW-C09','network','Aruba 6300M','Aruba','10.3.9.1','C-09','ToR',true,40,1),
('Harbor-1','server','Dell R640','Dell','10.3.9.11','C-09','Harbor',true,10,1),
('Harbor-2','server','Dell R640','Dell','10.3.9.12','C-09','Harbor HA',true,11,1),
('Reg-NAS','storage','Synology RS3621xs+','Synology','10.3.9.21','C-09','Image Store',true,14,2);

-- ===== C-10 DR Primary =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C10','power','APC SRT 10kVA','APC','','C-10','UPS',true,1,4),
('PDU-C10','power','APC PDU 2G','APC','','C-10','PDU',true,5,1),
('SW-C10','network','Cisco C9300','Cisco','10.3.10.1','C-10','ToR',true,40,1),
('DR-App1','server','HPE DL380 Gen10','HPE','10.3.10.11','C-10','DR App',true,10,2),
('DR-App2','server','HPE DL380 Gen10','HPE','10.3.10.12','C-10','DR App',true,12,2),
('DR-DB1','server','Dell R740','Dell','10.3.10.21','C-10','DR DB',true,16,2),
('DR-DB2','server','Dell R740','Dell','10.3.10.22','C-10','DR DB',true,18,2);

-- ===== C-11 DR Replica =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C11','power','APC SRT 10kVA','APC','','C-11','UPS',true,1,4),
('PDU-C11','power','APC PDU 2G','APC','','C-11','PDU',true,5,1),
('SW-C11','network','Cisco C9300','Cisco','10.3.11.1','C-11','ToR',true,40,1),
('DR-Rep1','server','Dell R740','Dell','10.3.11.11','C-11','DR Rep',true,10,2),
('DR-Rep2','server','Dell R740','Dell','10.3.11.12','C-11','DR Rep',true,12,2),
('DR-Rep3','server','Dell R740','Dell','10.3.11.13','C-11','DR Rep',true,14,2);

-- ===== C-12 DR Storage =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C12','power','APC SRT 10kVA','APC','','C-12','UPS',true,1,4),
('PDU-C12','power','APC PDU 2G','APC','','C-12','PDU',true,5,1),
('SW-C12','network','Cisco C9300','Cisco','10.3.12.1','C-12','ToR',true,40,1),
('DR-SAN','storage','Dell EMC Unity XT','Dell','10.3.12.11','C-12','DR SAN',true,10,3),
('DR-NAS1','storage','Synology RS3621xs+','Synology','10.3.12.21','C-12','DR NAS',true,14,2),
('DR-NAS2','storage','Synology RS3621xs+','Synology','10.3.12.22','C-12','DR NAS',true,16,2);

-- ===== C-13 Lab A =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C13','power','Eaton 5PX 3000','Eaton','','C-13','UPS',true,1,2),
('PDU-C13','power','APC PDU 2G','APC','','C-13','PDU',true,3,1),
('SW-C13','network','Aruba 6300M','Aruba','10.3.13.1','C-13','ToR',true,40,1),
('Lab-01','server','Dell R640','Dell','10.3.13.11','C-13','Lab',true,10,1),
('Lab-02','server','Dell R640','Dell','10.3.13.12','C-13','Lab',true,11,1),
('Lab-03','server','Dell R640','Dell','10.3.13.13','C-13','Lab',true,12,1),
('Lab-04','server','Dell R640','Dell','10.3.13.14','C-13','Lab',true,13,1);

-- ===== C-14 Lab B =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C14','power','Eaton 5PX 3000','Eaton','','C-14','UPS',true,1,2),
('PDU-C14','power','APC PDU 2G','APC','','C-14','PDU',true,3,1),
('SW-C14','network','Aruba 6300M','Aruba','10.3.14.1','C-14','ToR',true,40,1),
('Lab-05','server','Dell R640','Dell','10.3.14.11','C-14','Lab POC',true,10,1),
('Lab-06','server','Dell R640','Dell','10.3.14.12','C-14','Lab POC',true,11,1),
('Lab-NAS','storage','QNAP TS-h2490FU','QNAP','10.3.14.21','C-14','Lab Store',true,14,2);

-- ===== C-15 Telecom =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C15','power','Eaton 5PX 3000','Eaton','','C-15','UPS',true,1,2),
('PDU-C15','power','APC PDU 2G','APC','','C-15','PDU',true,3,1),
('ISP-R1','network','Juniper EX4300','Juniper','','C-15','ISP A',true,40,1),
('ISP-R2','network','Juniper EX4300','Juniper','','C-15','ISP B',true,39,1),
('PBX-01','server','HPE DL360 Gen10','HPE','10.3.15.11','C-15','IP PBX',true,10,1),
('SBC-01','network','Cisco C9300','Cisco','10.3.15.21','C-15','SBC',true,14,1);

-- ===== C-16 Facility =====
INSERT INTO hardware_assets (name,category_key,model,vendor,ip_address,location,description,is_active,rack_u_start,rack_u_size) VALUES
('UPS-C16','power','APC SRT 10kVA','APC','','C-16','Main UPS',true,1,4),
('PDU-C16L','power','APC PDU 2G','APC','','C-16','PDU L',true,5,1),
('PDU-C16R','power','APC PDU 2G','APC','','C-16','PDU R',true,6,1),
('BMS','server','Dell R640','Dell','10.3.16.11','C-16','建物管理',true,10,1),
('CCTV-NVR','server','HPE DL380 Gen10','HPE','10.3.16.12','C-16','NVR',true,12,2),
('Access','server','Dell R640','Dell','10.3.16.21','C-16','門禁',true,16,1),
('DCIM','server','Dell R640','Dell','10.3.16.22','C-16','DCIM Agent',true,17,1),
('EnvMon','server','Dell R640','Dell','10.3.16.23','C-16','溫溼度監控',true,18,1);
