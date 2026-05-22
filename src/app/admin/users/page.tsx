'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Shield, User, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LocalUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  is_active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<LocalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<LocalUser | null>(null)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user')

  const fetch_ = useCallback(async () => {
    const { data } = await supabase.from('users').select('*').order('created_at')
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openNew() {
    setEditingUser(null)
    setFormName(''); setFormEmail(''); setFormRole('user')
    setShowModal(true)
  }

  function openEdit(user: LocalUser) {
    setEditingUser(user)
    setFormName(user.name); setFormEmail(user.email); setFormRole(user.role)
    setShowModal(true)
  }

  async function saveUser() {
    if (!formName || !formEmail) return
    const dupQuery = supabase.from('users').select('id').eq('email', formEmail.trim())
    if (editingUser) dupQuery.neq('id', editingUser.id)
    const { data: dup } = await dupQuery.limit(1)
    if (dup && dup.length > 0) { alert(`Email「${formEmail}」已存在`); return }

    setSaving(true)
    const payload = { name: formName, email: formEmail, role: formRole }
    if (editingUser) {
      await supabase.from('users').update(payload).eq('id', editingUser.id)
    } else {
      await supabase.from('users').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetch_()
  }

  async function deleteUser(id: string) {
    if (!confirm('確定刪除此使用者？')) return
    await supabase.from('users').delete().eq('id', id)
    fetch_()
  }

  async function toggleActive(id: string) {
    const user = users.find((u) => u.id === id)
    if (!user) return
    await supabase.from('users').update({ is_active: !user.is_active }).eq('id', id)
    fetch_()
  }

  if (loading) return <AppShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /><span className="ml-2 text-[var(--color-text-muted)]">載入中...</span></div></AppShell>

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">使用者管理</h1>
        <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增使用者
        </button>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
              <th className="text-left px-4 py-3 font-medium">姓名</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">角色</th>
              <th className="text-left px-4 py-3 font-medium">狀態</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] ${!user.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{user.email}</td>
                <td className="px-4 py-3">
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300">
                      <Shield className="w-3 h-3" /> 管理員
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                      <User className="w-3 h-3" /> 使用者
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(user.id)}
                    className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-[var(--color-badge-green)] text-[var(--color-badge-green-text)]' : 'bg-[var(--color-badge-red)] text-[var(--color-badge-red-text)]'}`}>
                    {user.is_active ? '啟用' : '停用'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(user)} className="p-1 hover:bg-[var(--color-hover)] rounded mr-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteUser(user.id)} className="p-1 hover:bg-[var(--color-danger-dim)] text-[var(--color-danger)] rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="text-center py-8 text-[var(--color-text-muted)]">尚無使用者</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingUser ? '編輯使用者' : '新增使用者'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">姓名 *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">角色</label>
            <select value={formRole} onChange={(e) => setFormRole(e.target.value as 'admin' | 'user')} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="user">使用者</option>
              <option value="admin">管理員</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveUser} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} 儲存
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
