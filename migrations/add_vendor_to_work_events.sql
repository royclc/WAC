-- ============================================
-- Migration: add vendor column to work_events
-- Date: 2026-05-21
-- ============================================

-- 工作事件新增廠商欄位
ALTER TABLE work_events ADD COLUMN IF NOT EXISTS vendor TEXT DEFAULT '';
