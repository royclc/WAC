-- ============================================
-- Seed: vm_instances 測試資料
-- Date: 2026-05-22
-- ============================================

INSERT INTO vm_instances (network_zone, hostname, ip_address, os_name, os_version, area, service_group, service_name, software, cpu_cores, ram_gb, disk1_gb, disk2_gb, disk3_gb, note) VALUES
-- 內網 - 管理區
('內網', 'MGT-AD01', '10.1.1.10', 'Windows', 'Server 2022', '管理區', '管理', 'Active Directory', 'AD DS, DNS, DHCP', 4, 16, '100', '200', '', '主要 AD 網域控制站'),
('內網', 'MGT-AD02', '10.1.1.11', 'Windows', 'Server 2022', '管理區', '管理', 'Active Directory', 'AD DS, DNS', 4, 16, '100', '200', '', '備援 AD 網域控制站'),
('內網', 'MGT-SCCM01', '10.1.1.20', 'Windows', 'Server 2022', '管理區', '組態', 'SCCM', 'MECM, SQL Server', 8, 32, '100', '300', '300', '組態管理伺服器'),
('內網', 'MGT-MON01', '10.1.1.30', 'Rocky Linux', '9.4', '管理區', '監控', 'Zabbix', 'Zabbix Server 7.0, MariaDB', 4, 16, '50', '200', '', '監控伺服器'),
('內網', 'MGT-LOG01', '10.1.1.31', 'Rocky Linux', '9.4', '管理區', '監控', 'Graylog', 'Graylog, OpenSearch, MongoDB', 8, 32, '100', '300', '300', '日誌收集伺服器'),
('內網', 'MGT-BKP01', '10.1.1.40', 'Windows', 'Server 2022', '管理區', '備份', 'Veeam Backup', 'Veeam B&R 12, SQL Server', 4, 16, '100', '200', '', '備份管理伺服器'),
('內網', 'MGT-FTP01', '10.1.1.50', 'Rocky Linux', '9.4', '管理區', '傳檔', 'SFTP Server', 'vsftpd, OpenSSH', 2, 4, '50', '300', '', '內部檔案傳輸'),
('內網', 'MGT-WSUS01', '10.1.1.60', 'Windows', 'Server 2022', '管理區', '管理', 'WSUS', 'WSUS, IIS', 4, 8, '100', '250', '', 'Windows 更新伺服器'),

-- 內網 - 資源區
('內網', 'APP-WEB01', '10.1.2.10', 'Rocky Linux', '9.4', '資源區', '管理', 'Web Server', 'Nginx, Node.js 20', 4, 8, '50', '100', '', '內部入口網站'),
('內網', 'APP-WEB02', '10.1.2.11', 'Rocky Linux', '9.4', '資源區', '管理', 'Web Server', 'Nginx, Node.js 20', 4, 8, '50', '100', '', '內部入口網站-備援'),
('內網', 'APP-DB01', '10.1.2.20', 'Rocky Linux', '9.4', '資源區', '管理', 'Database', 'PostgreSQL 16', 8, 32, '100', '300', '300', '主要資料庫'),
('內網', 'APP-DB02', '10.1.2.21', 'Rocky Linux', '9.4', '資源區', '管理', 'Database', 'PostgreSQL 16 Replica', 8, 32, '100', '300', '300', '備援資料庫'),
('內網', 'APP-MAIL01', '10.1.2.30', 'Windows', 'Server 2019', '資源區', '管理', 'Mail Server', 'Exchange Server 2019', 8, 32, '100', '250', '250', '郵件伺服器'),
('內網', 'APP-FILE01', '10.1.2.40', 'Windows', 'Server 2022', '資源區', '管理', 'File Server', 'DFS, 檔案伺服器', 4, 16, '100', '300', '300', '檔案共享伺服器'),

-- 中繼
('中繼', 'DMZ-PROXY01', '10.2.1.10', 'Rocky Linux', '9.4', '管理區', '管理', 'Reverse Proxy', 'Nginx, WAF', 4, 8, '50', '100', '', '反向代理伺服器'),
('中繼', 'DMZ-PROXY02', '10.2.1.11', 'Rocky Linux', '9.4', '管理區', '管理', 'Reverse Proxy', 'Nginx, WAF', 4, 8, '50', '100', '', '反向代理-備援'),
('中繼', 'DMZ-VPN01', '10.2.1.20', 'Rocky Linux', '9.4', '管理區', '管理', 'VPN Server', 'OpenVPN, WireGuard', 2, 4, '50', '', '', 'VPN 閘道'),
('中繼', 'DMZ-FTP01', '10.2.1.30', 'Rocky Linux', '9.4', '管理區', '傳檔', 'SFTP Gateway', 'vsftpd, OpenSSH', 2, 4, '50', '200', '', '對外檔案交換'),

-- 外網
('外網', 'EXT-WEB01', '10.3.1.10', 'Rocky Linux', '9.4', '資源區', '管理', 'Public Web', 'Nginx, PHP 8.3', 4, 8, '50', '100', '', '對外網站'),
('外網', 'EXT-WEB02', '10.3.1.11', 'Rocky Linux', '9.4', '資源區', '管理', 'Public Web', 'Nginx, PHP 8.3', 4, 8, '50', '100', '', '對外網站-備援'),
('外網', 'EXT-API01', '10.3.1.20', 'Rocky Linux', '9.4', '資源區', '管理', 'API Gateway', 'Nginx, Node.js 20', 4, 16, '50', '150', '', 'API 服務'),
('外網', 'EXT-DNS01', '10.3.1.30', 'RedHat', '9.4', '管理區', '管理', 'DNS Server', 'BIND 9', 2, 4, '50', '', '', '外部 DNS'),
('外網', 'EXT-SMTP01', '10.3.1.40', 'RedHat', '9.4', '管理區', '管理', 'SMTP Relay', 'Postfix, SpamAssassin', 2, 8, '50', '100', '', '郵件閘道');
