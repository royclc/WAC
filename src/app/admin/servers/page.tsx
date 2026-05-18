'use client'

import React, { useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Upload, Pencil, Trash2, Search, HardDrive, Server, Database, ChevronDown, ChevronRight } from 'lucide-react'

type HardwareCategory = 'x86_server' | 'storage'
type HardwareModel = string

const CATEGORY_LABELS: Record<HardwareCategory, string> = {
  x86_server: 'x86伺服器',
  storage: '儲存裝置',
}

const CATEGORY_MODELS: Record<HardwareCategory, string[]> = {
  x86_server: ['HPE 380', 'HPE 360'],
  storage: ['NetApp', '磁帶機'],
}

const VENDOR_OPTIONS = ['HPE', 'NetApp', '宏華', '其他']

interface HardwareAsset {
  id: string
  name: string
  category: HardwareCategory
  model: string
  vendor: string
  ip_address: string
  location: string
  description: string
  is_active: boolean
}

const DEMO_HARDWARE: HardwareAsset[] = [
  { id: 'h1', name: 'Web Server 01', category: 'x86_server', model: 'HPE 380', vendor: 'HPE', ip_address: '192.168.1.10', location: '機房A', description: '主要網頁伺服器', is_active: true },
  { id: 'h2', name: 'DB Server 01', category: 'x86_server', model: 'HPE 380', vendor: 'HPE', ip_address: '192.168.1.20', location: '機房A', description: '資料庫伺服器', is_active: true },
  { id: 'h3', name: 'AP Server 01', category: 'x86_server', model: 'HPE 360', vendor: 'HPE', ip_address: '192.168.1.30', location: '機房B', description: '應用程式伺服器', is_active: true },
  { id: 'h4', name: 'AP Server 02', category: 'x86_server', model: 'HPE 360', vendor: 'HPE', ip_address: '192.168.1.31', location: '機房B', description: '備援應用伺服器', is_active: true },
  { id: 'h5', name: 'NetApp FAS01', category: 'storage', model: 'NetApp', vendor: 'NetApp', ip_address: '192.168.1.50', location: '機房A', description: '主要儲存設備', is_active: true },
  { id: 'h6', name: '備份磁帶機 01', category: 'storage', model: '磁帶機', vendor: 'HPE', ip_address: '192.168.1.60', location: '機房A', description: '磁帶備份裝置', is_active: true },
]

export default function ServersPage() {
  const [assets, setAssets] = useState<HardwareAsset[]>(DEMO_HARDWARE)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | HardwareCategory>('all')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState<HardwareAsset | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['x86_server', 'storage']))
  const [importText, setImportText] = useState('')

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<HardwareCategory>('x86_server')
  const [formModel, setFormModel] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formIp, setFormIp] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const filtered = assets.filter((a) => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.ip_address.includes(search)) return false
    return true
  })

  const grouped = {
    x86_server: filtered.filter((a) => a.category === 'x86_server'),
    storage: filtered.filter((a) => a.category === 'storage'),
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openNew() {
    setEditingAsset(null)
    setFormName(''); setFormCategory('x86_server'); setFormModel(CATEGORY_MODELS.x86_server[0]); setFormVendor('HPE'); setFormIp(''); setFormLocation(''); setFormDesc('')
    setShowModal(true)
  }

  function openEdit(asset: HardwareAsset) {
    setEditingAsset(asset)
    setFormName(asset.name); setFormCategory(asset.category); setFormModel(asset.model); setFormVendor(asset.vendor); setFormIp(asset.ip_address); setFormLocation(asset.location); setFormDesc(asset.description)
    setShowModal(true)
  }

  function saveAsset() {
    if (!formName) return
    const newAsset: HardwareAsset = {
      id: editingAsset?.id || crypto.randomUUID(),
      name: formName, category: formCategory, model: formModel, vendor: formVendor,
      ip_address: formIp, location: formLocation, description: formDesc, is_active: true,
    }
    if (editingAsset) {
      setAssets(assets.map((a) => (a.id === editingAsset.id ? newAsset : a)))
    } else {
      setAssets([...assets, newAsset])
    }
    setShowModal(false)
  }

  function deleteAsset(id: string) { setAssets(assets.filter((a) => a.id !== id)) }

  function handleImport() {
    const lines = importText.trim().split('\n').filter((l) => l.trim())
    const newAssets: HardwareAsset[] = lines.map((line) => {
      const parts = line.split(',').map((s) => s.trim())
      const cat: HardwareCategory = parts[1] === 'storage' ? 'storage' : 'x86_server'
      return {
        id: crypto.randomUUID(), name: parts[0] || '', category: cat,
        model: parts[2] || '', vendor: parts[3] || '', ip_address: parts[4] || '',
        location: parts[5] || '', description: parts[6] || '', is_active: true,
      }
    }).filter((a) => a.name)
    setAssets([...assets, ...newAssets])
    setShowImportModal(false); setImportText('')
  }

  const x86Count = assets.filter((a) => a.category === 'x86_server').length
  const storageCount = assets.filter((a) => a.category === 'storage').length

  const CategoryIcon = ({ cat }: { cat: HardwareCategory }) => {
    return cat === 'x86_server' ? <Server className="w-4 h-4" /> : <Database className="w-4 h-4" />
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">硬體管理</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1">
            <Upload className="w-4 h-4" /> 匯入
          </button>
          <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增硬體
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-2xl font-bold">{assets.length}</div>
          <div className="text-sm text-[var(--color-text-muted)]">總硬體數</div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--color-primary)]">{x86Count}</div>
          <div className="text-sm text-[var(--color-text-muted)]">x86伺服器</div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-600">{storageCount}</div>
          <div className="text-sm text-[var(--color-text-muted)]">儲存裝置</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          {[{ k: 'all', l: '全部' }, { k: 'x86_server', l: 'x86伺服器' }, { k: 'storage', l: '儲存裝置' }].map(({ k, l }) => (
            <button key={k} onClick={() => setFilterCategory(k as 'all' | HardwareCategory)}
              className={`px-3 py-1.5 text-sm ${filterCategory === k ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-hover)]'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋名稱或 IP..." className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-border)] rounded-lg" />
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
              <th className="text-left px-4 py-3 font-medium">名稱</th>
              <th className="text-left px-4 py-3 font-medium">型號</th>
              <th className="text-left px-4 py-3 font-medium">廠商</th>
              <th className="text-left px-4 py-3 font-medium">IP 位址</th>
              <th className="text-left px-4 py-3 font-medium">位置</th>
              <th className="text-left px-4 py-3 font-medium">說明</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([catKey, items]) => {
              if (filterCategory !== 'all' && filterCategory !== catKey) return null
              if (items.length === 0) return null
              const cat = catKey as HardwareCategory
              return (
                <React.Fragment key={catKey}>
                  <tr>
                    <td colSpan={7} className="p-0">
                      <button onClick={() => toggleGroup(catKey)}
                        className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium transition-colors ${cat === 'x86_server' ? 'bg-[var(--color-primary-dim)] hover:bg-[var(--color-badge-blue)] text-[var(--color-badge-blue-text)]' : 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-300'}`}>
                        {expandedGroups.has(catKey) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <CategoryIcon cat={cat} />
                        {CATEGORY_LABELS[cat]}
                        <span className="text-xs opacity-60 ml-1">({items.length})</span>
                      </button>
                    </td>
                  </tr>
                  {expandedGroups.has(catKey) && items.map((asset) => (
                    <tr key={asset.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]">
                      <td className="px-4 py-3 pl-10 font-medium">
                        <CategoryIcon cat={asset.category} />{' '}{asset.name}
                      </td>
                      <td className="px-4 py-3 text-sm">{asset.model}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">{asset.vendor}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{asset.ip_address}</td>
                      <td className="px-4 py-3">{asset.location}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{asset.description}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(asset)} className="p-1 hover:bg-[var(--color-hover)] rounded mr-1"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteAsset(asset.id)} className="p-1 hover:bg-[var(--color-danger-dim)] text-[var(--color-danger)] rounded"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-[var(--color-text-muted)]">無符合條件的硬體</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingAsset ? '編輯硬體' : '新增硬體'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">類別 *</label>
            <select value={formCategory} onChange={(e) => { const c = e.target.value as HardwareCategory; setFormCategory(c); setFormModel(CATEGORY_MODELS[c][0]) }}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">型號 *</label>
            <select value={formModel} onChange={(e) => setFormModel(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {CATEGORY_MODELS[formCategory].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">廠商</label>
            <select value={formVendor} onChange={(e) => setFormVendor(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="">請選擇</option>
              {VENDOR_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">名稱 *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">IP 位址</label>
              <input value={formIp} onChange={(e) => setFormIp(e.target.value)} placeholder="192.168.1.1" className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">位置</label>
              <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveAsset} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">儲存</button>
          </div>
        </div>
      </Modal>

      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title="匯入硬體清單">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            每行一筆：<code className="text-xs bg-[var(--color-bg-elevated)] px-1 rounded">名稱,類別(x86_server/storage),型號,廠商,IP,位置,說明</code>
          </p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6}
            placeholder={`Web Server 03,x86_server,HPE 380,HPE,192.168.1.12,機房A,備援伺服器`}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono text-xs" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={handleImport} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">匯入</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
