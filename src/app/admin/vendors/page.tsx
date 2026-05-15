'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Search, Store } from 'lucide-react'

export interface Vendor {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  description: string
}

const DEMO_VENDORS: Vendor[] = [
  { id: 'v1', name: '宏華', contact_person: '李經理', phone: '02-1234-5678', email: 'lee@honghua.com', description: '網路設備供應商' },
  { id: 'v2', name: 'HPE', contact_person: '張業務', phone: '02-8765-4321', email: 'chang@hpe.com', description: 'x86伺服器供應商' },
  { id: 'v3', name: 'NetApp', contact_person: '王工程師', phone: '02-2222-3333', email: 'wang@netapp.com', description: '儲存設備供應商' },
]

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>(DEMO_VENDORS)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)

  const [formName, setFormName] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const filtered = vendors.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.contact_person.includes(search)) return false
    return true
  })

  function openNew() {
    setEditing(null)
    setFormName(''); setFormContact(''); setFormPhone(''); setFormEmail(''); setFormDesc('')
    setShowModal(true)
  }

  function openEdit(v: Vendor) {
    setEditing(v)
    setFormName(v.name); setFormContact(v.contact_person); setFormPhone(v.phone); setFormEmail(v.email); setFormDesc(v.description)
    setShowModal(true)
  }

  function save() {
    if (!formName) return
    const item: Vendor = {
      id: editing?.id || crypto.randomUUID(),
      name: formName, contact_person: formContact, phone: formPhone, email: formEmail, description: formDesc,
    }
    if (editing) {
      setVendors(vendors.map((v) => (v.id === editing.id ? item : v)))
    } else {
      setVendors([...vendors, item])
    }
    setShowModal(false)
  }

  function remove(id: string) { setVendors(vendors.filter((v) => v.id !== id)) }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">廠商管理</h1>
        <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增廠商
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3">
          <span className="text-2xl font-bold text-blue-600">{vendors.length}</span>
          <span className="text-sm text-[var(--color-text-muted)] ml-2">家廠商</span>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋廠商名稱或聯絡人..." className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-border)] rounded-lg" />
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-gray-50">
              <th className="text-left px-4 py-3 font-medium">廠商名稱</th>
              <th className="text-left px-4 py-3 font-medium">聯絡人</th>
              <th className="text-left px-4 py-3 font-medium">電話</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">說明</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Store className="w-4 h-4 inline mr-2 text-purple-600" />{v.name}
                </td>
                <td className="px-4 py-3">{v.contact_person}</td>
                <td className="px-4 py-3 text-sm">{v.phone}</td>
                <td className="px-4 py-3 text-sm text-blue-600">{v.email}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{v.description}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(v)} className="p-1 hover:bg-gray-100 rounded mr-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(v.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-[var(--color-text-muted)]">無符合條件的廠商</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '編輯廠商' : '新增廠商'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">廠商名稱 *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">聯絡人</label>
            <input value={formContact} onChange={(e) => setFormContact(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">電話</label>
              <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
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
