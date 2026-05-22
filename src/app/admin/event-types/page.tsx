'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface EventType {
  id: string
  name: string
  color: string
  description: string
}

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#6B7280', '#F97316', '#14B8A6',
]

export default function EventTypesPage() {
  const [types, setTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EventType | null>(null)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#3B82F6')
  const [formDesc, setFormDesc] = useState('')

  const fetch_ = useCallback(async () => {
    const { data } = await supabase.from('event_types').select('*').order('created_at')
    if (data) setTypes(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditing(null)
    setFormName(''); setFormColor('#3B82F6'); setFormDesc('')
    setShowModal(true)
  }

  function openEdit(t: EventType) {
    setEditing(t)
    setFormName(t.name); setFormColor(t.color); setFormDesc(t.description)
    setShowModal(true)
  }

  async function save() {
    if (!formName) return
    const dupQuery = supabase.from('event_types').select('id').eq('name', formName.trim())
    if (editing) dupQuery.neq('id', editing.id)
    const { data: dup } = await dupQuery.limit(1)
    if (dup && dup.length > 0) { alert(`事件類型「${formName}」已存在`); return }

    setSaving(true)
    const payload = { name: formName, color: formColor, description: formDesc }
    if (editing) {
      await supabase.from('event_types').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('event_types').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetch_()
  }

  async function remove(id: string) {
    if (!confirm('確定刪除此事件類型？')) return
    await supabase.from('event_types').delete().eq('id', id)
    fetch_()
  }

  if (loading) return <AppShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /><span className="ml-2 text-[var(--color-text-muted)]">載入中...</span></div></AppShell>

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">事件類型管理</h1>
        <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增類型
        </button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 mb-6">
        <span className="text-2xl font-bold text-[var(--color-primary)]">{types.length}</span>
        <span className="text-sm text-[var(--color-text-muted)] ml-2">種事件類型</span>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
              <th className="text-left px-4 py-3 font-medium">顏色</th>
              <th className="text-left px-4 py-3 font-medium">名稱</th>
              <th className="text-left px-4 py-3 font-medium">說明</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]">
                <td className="px-4 py-3">
                  <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: t.color }} />
                </td>
                <td className="px-4 py-3 font-medium">
                  <Tag className="w-4 h-4 inline mr-2" style={{ color: t.color }} />
                  {t.name}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{t.description || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(t)} className="p-1 hover:bg-[var(--color-hover)] rounded mr-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(t.id)} className="p-1 hover:bg-[var(--color-danger-dim)] text-[var(--color-danger)] rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {types.length === 0 && <div className="text-center py-8 text-[var(--color-text-muted)]">尚無事件類型</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '編輯事件類型' : '新增事件類型'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">名稱 *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="例：計畫性維護" className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="例：預定的系統維護作業" className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">顏色</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setFormColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${formColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-[var(--color-text-muted)]">預覽：</span>
              <span className="text-xs px-3 py-1 rounded-full text-white" style={{ backgroundColor: formColor }}>{formName || '名稱'}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} 儲存
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
