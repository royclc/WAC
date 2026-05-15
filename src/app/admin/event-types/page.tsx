'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'

export interface EventType {
  id: string
  key: string
  label: string
  color: string
}

const DEFAULT_EVENT_TYPES: EventType[] = [
  { id: '1', key: 'downtime', label: '斷線', color: '#EF4444' },
  { id: '2', key: 'maintenance', label: '維護', color: '#F59E0B' },
  { id: '3', key: 'other', label: '其他', color: '#6B7280' },
]

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#6B7280', '#F97316', '#14B8A6',
]

export default function EventTypesPage() {
  const [types, setTypes] = useState<EventType[]>(DEFAULT_EVENT_TYPES)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EventType | null>(null)

  const [formLabel, setFormLabel] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formColor, setFormColor] = useState('#EF4444')

  function openNew() {
    setEditing(null)
    setFormLabel('')
    setFormKey('')
    setFormColor('#3B82F6')
    setShowModal(true)
  }

  function openEdit(t: EventType) {
    setEditing(t)
    setFormLabel(t.label)
    setFormKey(t.key)
    setFormColor(t.color)
    setShowModal(true)
  }

  function save() {
    if (!formLabel || !formKey) return
    const item: EventType = {
      id: editing?.id || crypto.randomUUID(),
      key: formKey,
      label: formLabel,
      color: formColor,
    }
    if (editing) {
      setTypes(types.map((t) => (t.id === editing.id ? item : t)))
    } else {
      setTypes([...types, item])
    }
    setShowModal(false)
  }

  function remove(id: string) {
    setTypes(types.filter((t) => t.id !== id))
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">事件類型管理</h1>
        <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增類型
        </button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 mb-6">
        <span className="text-2xl font-bold text-blue-600">{types.length}</span>
        <span className="text-sm text-[var(--color-text-muted)] ml-2">種事件類型</span>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-gray-50">
              <th className="text-left px-4 py-3 font-medium">顏色</th>
              <th className="text-left px-4 py-3 font-medium">代碼</th>
              <th className="text-left px-4 py-3 font-medium">名稱</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: t.color }} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{t.key}</td>
                <td className="px-4 py-3 font-medium">
                  <Tag className="w-4 h-4 inline mr-2" style={{ color: t.color }} />
                  {t.label}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(t)} className="p-1 hover:bg-gray-100 rounded mr-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(t.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
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
            <input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="例：斷線" className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">代碼 *</label>
            <input value={formKey} onChange={(e) => setFormKey(e.target.value)} placeholder="例：downtime（英文小寫）" className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">顏色</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setFormColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${formColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-[var(--color-text-muted)]">預覽：</span>
            <span className="text-xs px-3 py-1 rounded-full text-white" style={{ backgroundColor: formColor }}>{formLabel || '名稱'}</span>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={save} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">儲存</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
