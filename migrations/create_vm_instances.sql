-- ============================================
-- Migration: create vm_instances table
-- Date: 2026-05-22
-- ============================================

CREATE TABLE IF NOT EXISTS vm_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_zone TEXT NOT NULL DEFAULT '內網',
  hostname TEXT NOT NULL,
  ip_address TEXT DEFAULT '',
  os_name TEXT DEFAULT '',
  os_version TEXT DEFAULT '',
  area TEXT DEFAULT '管理區',
  service_group TEXT DEFAULT '',
  service_name TEXT DEFAULT '',
  software TEXT DEFAULT '',
  cpu_cores INT DEFAULT 4,
  ram_gb INT DEFAULT 8,
  disk1_gb TEXT DEFAULT '',
  disk2_gb TEXT DEFAULT '',
  disk3_gb TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
