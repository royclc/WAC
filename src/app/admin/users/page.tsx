'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Shield, User } from 'lucide-react'
import type { UserRole } from '@/types/database'

interface LocalUser {
  id: string
  email: string
  name: string
  role: UserRole
  department: string
  is_active: boolean
}

const DEMO_USERS: LocalUser[] = [
  { id: '1', email: 'admin@mac.local', name: '管理員', role: 'admin', department: '資訊室', is_active: true },
  { id: '2', email: 'wang@mac.local', name: '王小明', role: 'user', department: '資訊室', is_active: true },
  { id: '3', email: 'chen@mac.local', name: '陳美麗', role: 'user', department: '資訊室', is_active: true },
  { id: '4', email: 'lin@mac.local', name: '林志偉', role: 'user', department: '網路組', is_active: true },
  { id: '5', email: 'chang@mac.local', name: '張雅琪', role: 'user', department: '網路組', is_active: true },
  { id: '6', email: 'lee@mac.local', name: '李大同', role: 'user', department: '系統組', is_active: true },
]

export default function UsersPage() {
  const [users, setUsers] = useState<LocalUser[]>(DEMO_USERS)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<LocalUser | null>(null)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('user')
  const [formDept, setFormDept] = useState('')
  const [formPassword, setFormPassword] = useState('')

  function openNew() {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('user')
    setFormDept('')
    setFormPassword('')
    setShowModal(true)
  }

  function openEdit(user: LocalUser) {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(user.role)
    setFormDept(user.department)
    setFormPassword('')
    setShowModal(true)
  }

  function saveUser() {
    if (!formName || !formEmail) return
    const newUser: LocalUser = {
      id: editingUser?.id || crypto.randomUUID(),
      email: formEmail,
      name: formName,
      role: formRole,
      department: formDept,
      is_active: true,
    }
    if (editingUser) {
      setUsers(users.map((u) => (u.id === editingUser.id ? newUser : u)))
    } else {
      setUsers([...users, newUser])
    }
    setShowModal(false)
  }

  function deleteUser(id: string) {
    setUsers(users.filter((u) => u.id !== id))
  }

  function toggleActive(id: string) {
    setUsers(users.map((u) => (u.id === id ? { ...u, is_active: !u.is_active } : u)))
  }

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
            <tr className="border-b border-[var(--color-border)] bg-gray-50">
              <th className="text-left px-4 py-3 font-medium">姓名</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">角色</th>
              <th className="text-left px-4 py-3 font-medium">部門</th>
              <th className="text-left px-4 py-3 font-medium">狀態</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={`border-b border-[var(--color-border)] hover:bg-gray-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{user.email}</td>
                <td className="px-4 py-3">
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      <Shield className="w-3 h-3" /> 管理員
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      <User className="w-3 h-3" /> 使用者
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{user.department}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(user.id)}
                    className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {user.is_active ? '啟用' : '停用'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(user)} className="p-1 hover:bg-gray-100 rounded mr-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteUser(user.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            <label className="block text-sm font-medium mb-1">{editingUser ? '新密碼（留空不變）' : '密碼 *'}</label>
            <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">角色</label>
            <select value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="user">使用者</option>
              <option value="admin">管理員</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">部門</label>
            <input value={formDept} onChange={(e) => setFormDept(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={saveUser} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">儲存</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
