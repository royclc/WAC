'use client'

import React, { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Wrench, Palette, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MaintCat {
  id: string
  key: string
  label: string
  color: string
}

const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#10B981', '#06B6D4',
  '#EC4899', '#F97316', '#84CC16', '#14B8A6', '#6366F1', '#A855F7',
]

export default function MaintenanceCategoriesPage() {
  const [categories, setCategories] = useState<MaintCat[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<MaintCat | null>(null)
  const [saving, setSaving] = useState(false)

  const [formLabel, setFormLabel] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])

  const fetch_ = useCallback(async () => {
    const { data } = await supabase.from('maintenance_categories').select('*').order('sort_order')
    if (data) setCategories(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openAdd() {
    setEditing(null); setFormLabel(''); setFormKey(''); setFormColor(PRESET_COLORS[0])
    setShowModal(true)
  }

  function openEdit(cat: MaintCat) {
    setEditing(cat); setFormLabel(cat.label); setFormKey(cat.key); setFormColor(cat.color)
    setShowModal(true)
  }

  async function save() {
    if (!formLabel.trim() || !formKey.trim()) return
    setSaving(true)
    const payload = { key: formKey.trim(), label: formLabel.trim(), color: formColor }
    if (editing) {
      await supabase.from('maintenance_categories').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('maintenance_categories').insert({ ...payload, sort_order: categories.length + 1 })
    }
    setSaving(false)
    setShowModal(false)
    fetch_()
  }

  async function remove(id: string) {
    if (!confirm('確定要刪除此保養類別？')) return
    await supabase.from('maintenance_categories').delete().eq('id', id)
    fetch_()
  }

  if (loading) return <AppShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /><span className="ml-2 text-[var(--color-text-muted)]">載入中...</span></div></AppShell>

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">保養類別管理</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">管理保養記錄的分類項目，設定名稱與識別顏色</p>
        </div>
        <button onClick={openAdd} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增類別
        </button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 mb-6 inline-flex items-center gap-2">
        <Wrench className="w-4 h-4 text-[var(--color-primary)]" />
        <span className="text-2xl font-bold text-[var(--color-primary)]">{categories.length}</span>
        <span className="text-sm text-[var(--color-text-muted)]">個保養類別</span>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>尚未建立任何保養類別</p>
          <button onClick={openAdd} className="mt-2 text-[var(--color-primary)] hover:underline text-sm">+ 新增第一個類別</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: cat.color }} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                      <Wrench className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <div className="font-semibold">{cat.label}</div>
                      <div className="text-xs text-[var(--color-text-muted)] font-mono">{cat.key}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-[var(--color-primary-dim)] rounded text-[var(--color-primary)]"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(cat.id)} className="p-1.5 hover:bg-[var(--color-danger-dim)] rounded text-[var(--color-danger)]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">預覽標籤</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '編輯保養類別' : '新增保養類別'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">類別名稱 *</label>
            <input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="例：空調" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">類別代碼 *</label>
            <input value={formKey} onChange={(e) => setFormKey(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono" placeholder="例：hvac" />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">系統內部識別用，建議使用英文及底線</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Palette className="w-4 h-4" /> 識別顏色</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setFormColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${formColor === c ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-[var(--color-text-muted)]">自訂：</label>
              <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{formColor}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">預覽：</span>
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: formColor }}>{formLabel || '類別名稱'}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} {editing ? '更新' : '新增'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
