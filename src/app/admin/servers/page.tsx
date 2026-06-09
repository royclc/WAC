'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Upload, Pencil, Trash2, Search, HardDrive, Server, Database, ChevronDown, ChevronRight, Settings, Tag, Loader2, Wifi, Shield, Zap, Monitor, Cable, Router, Cpu, MemoryStick, Box, type LucideIcon } from 'lucide-react'

const ICON_OPTIONS: { key: string; icon: LucideIcon; label: string }[] = [
  { key: 'server', icon: Server, label: '伺服器' },
  { key: 'hard-drive', icon: HardDrive, label: '硬碟' },
  { key: 'database', icon: Database, label: '資料庫' },
  { key: 'monitor', icon: Monitor, label: '螢幕' },
  { key: 'wifi', icon: Wifi, label: '無線' },
  { key: 'router', icon: Router, label: '路由器' },
  { key: 'cable', icon: Cable, label: '線路' },
  { key: 'shield', icon: Shield, label: '安全' },
  { key: 'zap', icon: Zap, label: '電源' },
  { key: 'cpu', icon: Cpu, label: 'CPU' },
  { key: 'memory-stick', icon: MemoryStick, label: '記憶體' },
  { key: 'box', icon: Box, label: '設備' },
]

function getIconComponent(iconKey: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.key === iconKey)?.icon || HardDrive
}

// ── Category / Model 管理 ──

interface CategoryDef {
  id: string
  key: string
  label: string
  icon: string
  models: ModelDef[]
}

interface ModelDef {
  id: string
  name: string
}

interface RackOption {
  id: string
  name: string
  label: string
  total_u: number
}

interface HardwareAsset {
  id: string
  name: string
  category: string
  model: string
  vendor: string
  ip_address: string
  remote_ip: string
  location: string
  description: string
  is_active: boolean
  rack_u_start: number
  rack_u_size: number
}

type PageTab = 'assets' | 'categories'

export default function ServersPage() {
  const [pageTab, setPageTab] = useState<PageTab>('assets')
  const [categories, setCategories] = useState<CategoryDef[]>([])
  const [assets, setAssets] = useState<HardwareAsset[]>([])
  const [rackOptions, setRackOptions] = useState<RackOption[]>([])
  const [vendorOptions, setVendorOptions] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState<HardwareAsset | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [importText, setImportText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formIp, setFormIp] = useState('')
  const [formRemoteIp, setFormRemoteIp] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formUStart, setFormUStart] = useState(0)
  const [formUSize, setFormUSize] = useState(1)
  const [formDesc, setFormDesc] = useState('')

  // Category/Model management state
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<CategoryDef | null>(null)
  const [catFormLabel, setCatFormLabel] = useState('')
  const [catFormKey, setCatFormKey] = useState('')
  const [catFormIcon, setCatFormIcon] = useState('server')

  const [showModelModal, setShowModelModal] = useState(false)
  const [editingModel, setEditingModel] = useState<{ catId: string; model: ModelDef } | null>(null)
  const [modelFormName, setModelFormName] = useState('')
  const [modelTargetCatId, setModelTargetCatId] = useState('')

  // ── Data fetching ──

  const fetchCategories = useCallback(async () => {
    const { data: cats } = await supabase
      .from('hardware_categories')
      .select('id, key, label, icon, sort_order')
      .order('sort_order')

    if (!cats) return []

    const { data: models } = await supabase
      .from('hardware_models')
      .select('id, category_id, name')

    const mapped: CategoryDef[] = cats.map((c) => ({
      id: c.id,
      key: c.key,
      label: c.label,
      icon: c.icon || 'hard-drive',
      models: (models || []).filter((m) => m.category_id === c.id).map((m) => ({ id: m.id, name: m.name })),
    }))

    setCategories(mapped)
    setExpandedGroups((prev) => {
      if (prev.size === 0) return new Set(mapped.map((c) => c.key))
      return prev
    })
    return mapped
  }, [])

  const fetchAssets = useCallback(async () => {
    const { data } = await supabase
      .from('hardware_assets')
      .select('id, name, category_key, model, vendor, ip_address, remote_ip, location, description, is_active, rack_u_start, rack_u_size')

    if (data) {
      setAssets(data.map((a) => ({ ...a, category: a.category_key, remote_ip: a.remote_ip || '', rack_u_start: a.rack_u_start || 0, rack_u_size: a.rack_u_size || 1 })))
    }
  }, [])

  const fetchRacks = useCallback(async () => {
    const { data } = await supabase.from('racks').select('id, name, label, total_u').order('sort_order').order('name')
    if (data) setRackOptions(data)
  }, [])

  const fetchVendors = useCallback(async () => {
    const { data } = await supabase.from('vendors').select('name').order('name')
    if (data) setVendorOptions(data.map((v) => v.name))
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchCategories(), fetchAssets(), fetchVendors(), fetchRacks()])
      setLoading(false)
    }
    init()
  }, [fetchCategories, fetchAssets, fetchVendors, fetchRacks])

  // Helper: get models for a category key
  function getModelsForCategory(catKey: string): string[] {
    const cat = categories.find((c) => c.key === catKey)
    return cat ? cat.models.map((m) => m.name) : []
  }

  // Helper: get category label
  function getCategoryLabel(catKey: string): string {
    const cat = categories.find((c) => c.key === catKey)
    return cat?.label || catKey
  }

  const filtered = assets.filter((a) => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.ip_address.includes(search)) return false
    return true
  })

  const grouped: Record<string, HardwareAsset[]> = {}
  categories.forEach((cat) => { grouped[cat.key] = filtered.filter((a) => a.category === cat.key) })

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
    const firstCat = categories[0]
    setFormName(''); setFormCategory(firstCat?.key || ''); setFormModel(firstCat?.models[0]?.name || ''); setFormVendor(vendorOptions[0] || ''); setFormIp(''); setFormRemoteIp(''); setFormLocation(''); setFormUStart(0); setFormUSize(1); setFormDesc('')
    setShowModal(true)
  }

  function openEdit(asset: HardwareAsset) {
    setEditingAsset(asset)
    setFormName(asset.name); setFormCategory(asset.category); setFormModel(asset.model); setFormVendor(asset.vendor); setFormIp(asset.ip_address); setFormRemoteIp(asset.remote_ip || ''); setFormLocation(asset.location); setFormUStart(asset.rack_u_start || 0); setFormUSize(asset.rack_u_size || 1); setFormDesc(asset.description)
    setShowModal(true)
  }

  async function saveAsset() {
    if (!formName) return
    setSaving(true)
    const payload = {
      name: formName, category_key: formCategory, model: formModel, vendor: formVendor,
      ip_address: formIp, remote_ip: formRemoteIp, location: formLocation, rack_u_start: formUStart, rack_u_size: formUSize,
      description: formDesc, is_active: true,
    }
    if (editingAsset) {
      await supabase.from('hardware_assets').update(payload).eq('id', editingAsset.id)
    } else {
      await supabase.from('hardware_assets').insert(payload)
    }
    await fetchAssets()
    setSaving(false)
    setShowModal(false)
  }

  async function deleteAsset(id: string) {
    await supabase.from('hardware_assets').delete().eq('id', id)
    await fetchAssets()
  }

  async function handleImport() {
    const lines = importText.trim().split('\n').filter((l) => l.trim())
    const newAssets = lines.map((line) => {
      const parts = line.split(',').map((s) => s.trim())
      return {
        name: parts[0] || '', category_key: parts[1] || categories[0]?.key || '',
        model: parts[2] || '', vendor: parts[3] || '', ip_address: parts[4] || '',
        location: parts[5] || '', description: parts[6] || '', is_active: true,
      }
    }).filter((a) => a.name)
    if (newAssets.length > 0) {
      setSaving(true)
      await supabase.from('hardware_assets').insert(newAssets)
      await fetchAssets()
      setSaving(false)
    }
    setShowImportModal(false); setImportText('')
  }

  // ── Category CRUD ──
  function openAddCategory() {
    setEditingCat(null)
    setCatFormLabel('')
    setCatFormKey('')
    setCatFormIcon('server')
    setShowCatModal(true)
  }

  function openEditCategory(cat: CategoryDef) {
    setEditingCat(cat)
    setCatFormLabel(cat.label)
    setCatFormKey(cat.key)
    setCatFormIcon(cat.icon || 'hard-drive')
    setShowCatModal(true)
  }

  async function saveCategory() {
    if (!catFormLabel.trim() || !catFormKey.trim()) return
    setSaving(true)
    if (editingCat) {
      await supabase.from('hardware_categories').update({ key: catFormKey.trim(), label: catFormLabel.trim(), icon: catFormIcon }).eq('id', editingCat.id)
      // Update assets that had old category key
      if (editingCat.key !== catFormKey.trim()) {
        await supabase.from('hardware_assets').update({ category_key: catFormKey.trim() }).eq('category_key', editingCat.key)
      }
    } else {
      const maxSort = categories.length > 0 ? Math.max(...categories.map((c, i) => i)) + 1 : 0
      await supabase.from('hardware_categories').insert({ key: catFormKey.trim(), label: catFormLabel.trim(), icon: catFormIcon, sort_order: maxSort })
    }
    await fetchCategories()
    await fetchAssets()
    setSaving(false)
    setShowCatModal(false)
  }

  async function deleteCategory(catId: string) {
    const cat = categories.find((c) => c.id === catId)
    if (!cat) return
    const assetCount = assets.filter((a) => a.category === cat.key).length
    if (assetCount > 0) {
      if (!confirm(`此類別下有 ${assetCount} 筆硬體資料，刪除類別後資料仍保留但分類將失效。確定刪除？`)) return
    }
    // Delete models under this category first
    await supabase.from('hardware_models').delete().eq('category_id', catId)
    await supabase.from('hardware_categories').delete().eq('id', catId)
    await fetchCategories()
  }

  // ── Model CRUD ──
  function openAddModel(catId: string) {
    setEditingModel(null)
    setModelTargetCatId(catId)
    setModelFormName('')
    setShowModelModal(true)
  }

  function openEditModel(catId: string, model: ModelDef) {
    setEditingModel({ catId, model })
    setModelTargetCatId(catId)
    setModelFormName(model.name)
    setShowModelModal(true)
  }

  async function saveModel() {
    if (!modelFormName.trim()) return
    setSaving(true)
    if (editingModel) {
      await supabase.from('hardware_models').update({ name: modelFormName.trim() }).eq('id', editingModel.model.id)
      // Update assets that used old model name
      if (editingModel.model.name !== modelFormName.trim()) {
        const cat = categories.find((c) => c.id === modelTargetCatId)
        if (cat) {
          await supabase.from('hardware_assets').update({ model: modelFormName.trim() }).eq('category_key', cat.key).eq('model', editingModel.model.name)
        }
      }
    } else {
      await supabase.from('hardware_models').insert({ category_id: modelTargetCatId, name: modelFormName.trim() })
    }
    await fetchCategories()
    await fetchAssets()
    setSaving(false)
    setShowModelModal(false)
  }

  async function deleteModel(catId: string, modelId: string) {
    await supabase.from('hardware_models').delete().eq('id', modelId)
    await fetchCategories()
  }

  const CategoryIcon = ({ catKey }: { catKey: string }) => {
    const cat = categories.find((c) => c.key === catKey)
    const Icon = getIconComponent(cat?.icon || 'hard-drive')
    return <Icon className="w-4 h-4" />
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          <span className="ml-2 text-[var(--color-text-muted)]">載入中…</span>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">硬體管理</h1>
        <div className="flex gap-2">
          {pageTab === 'assets' && (
            <>
              <button onClick={() => setShowImportModal(true)} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1">
                <Upload className="w-4 h-4" /> 匯入
              </button>
              <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
                <Plus className="w-4 h-4" /> 新增硬體
              </button>
            </>
          )}
        </div>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
        <button onClick={() => setPageTab('assets')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${pageTab === 'assets' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
          <HardDrive className="w-4 h-4 inline mr-1.5" />硬體清單
        </button>
        <button onClick={() => setPageTab('categories')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${pageTab === 'categories' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
          <Settings className="w-4 h-4 inline mr-1.5" />類別與型號管理
        </button>
      </div>

      {/* ════════════ Assets Tab ════════════ */}
      {pageTab === 'assets' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="text-2xl font-bold">{assets.length}</div>
              <div className="text-sm text-[var(--color-text-muted)]">總硬體數</div>
            </div>
            {categories.slice(0, 2).map((cat) => (
              <div key={cat.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
                <div className="text-2xl font-bold text-[var(--color-primary)]">{assets.filter((a) => a.category === cat.key).length}</div>
                <div className="text-sm text-[var(--color-text-muted)]">{cat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
              {[{ k: 'all', l: '全部' }, ...categories.map((c) => ({ k: c.key, l: c.label }))].map(({ k, l }) => (
                <button key={k} onClick={() => setFilterCategory(k)}
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
                  <th className="text-left px-4 py-3 font-medium">遠端管理IP</th>
                  <th className="text-left px-4 py-3 font-medium">位置</th>
                  <th className="text-left px-4 py-3 font-medium">說明</th>
                  <th className="text-right px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([catKey, items]) => {
                  if (filterCategory !== 'all' && filterCategory !== catKey) return null
                  if (items.length === 0) return null
                  const catIdx = categories.findIndex((c) => c.key === catKey)
                  return (
                    <React.Fragment key={catKey}>
                      <tr>
                        <td colSpan={8} className="p-0">
                          <button onClick={() => toggleGroup(catKey)}
                            className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium transition-colors ${catIdx % 2 === 0 ? 'bg-[var(--color-primary-dim)] hover:bg-[var(--color-badge-blue)] text-[var(--color-badge-blue-text)]' : 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-300'}`}>
                            {expandedGroups.has(catKey) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <CategoryIcon catKey={catKey} />
                            {getCategoryLabel(catKey)}
                            <span className="text-xs opacity-60 ml-1">({items.length})</span>
                          </button>
                        </td>
                      </tr>
                      {expandedGroups.has(catKey) && items.map((asset) => (
                        <tr key={asset.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]">
                          <td className="px-4 py-3 pl-10 font-medium">
                            <CategoryIcon catKey={asset.category} />{' '}{asset.name}
                          </td>
                          <td className="px-4 py-3 text-sm">{asset.model}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">{asset.vendor}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{asset.ip_address}</td>
                          <td className="px-4 py-3 font-mono text-xs">{asset.remote_ip || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {asset.location || '—'}
                            {asset.location && asset.rack_u_start > 0 && (
                              <span className="text-xs text-[var(--color-text-muted)] ml-1">
                                U{asset.rack_u_start}{asset.rack_u_size > 1 ? `-${asset.rack_u_start + asset.rack_u_size - 1}` : ''}
                              </span>
                            )}
                          </td>
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
        </>
      )}

      {/* ════════════ Categories Tab ════════════ */}
      {pageTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">管理硬體類別及其下的型號選項，修改後會即時反映在硬體清單中。</p>
            <button onClick={openAddCategory} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
              <Plus className="w-4 h-4" /> 新增類別
            </button>
          </div>

          {categories.length === 0 && (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>尚未建立任何類別</p>
            </div>
          )}

          {categories.map((cat) => (
            <div key={cat.id} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-table-header)]">
                <div className="flex items-center gap-3">
                  <CategoryIcon catKey={cat.key} />
                  <div>
                    <span className="font-semibold">{cat.label}</span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2 font-mono">({cat.key})</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary-dim)] text-[var(--color-badge-blue-text)]">
                    {assets.filter((a) => a.category === cat.key).length} 筆硬體
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditCategory(cat)} className="p-1.5 hover:bg-[var(--color-primary-dim)] rounded text-[var(--color-primary)]" title="編輯類別">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 hover:bg-[var(--color-danger-dim)] rounded text-[var(--color-danger)]" title="刪除類別">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Models list */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">型號列表</span>
                  <button onClick={() => openAddModel(cat.id)} className="text-xs px-2 py-1 bg-[var(--color-badge-green)] text-[var(--color-badge-green-text)] rounded hover:opacity-80 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> 新增型號
                  </button>
                </div>
                {cat.models.length === 0 ? (
                  <div className="text-xs text-[var(--color-text-muted)] py-3 text-center border border-dashed border-[var(--color-border)] rounded-lg">
                    尚無型號，點擊上方按鈕新增
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {cat.models.map((model) => (
                      <div key={model.id} className="flex items-center justify-between px-3 py-2 bg-[var(--color-hover)] rounded-lg group">
                        <span className="text-sm">{model.name}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModel(cat.id, model)} className="p-1 hover:bg-[var(--color-primary-dim)] rounded text-[var(--color-primary)]">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteModel(cat.id, model.id)} className="p-1 hover:bg-[var(--color-danger-dim)] rounded text-[var(--color-danger)]">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 新增/編輯硬體 Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingAsset ? '編輯硬體' : '新增硬體'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">類別 *</label>
            <select value={formCategory} onChange={(e) => { const c = e.target.value; setFormCategory(c); const models = getModelsForCategory(c); setFormModel(models[0] || '') }}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {categories.map((c) => <option key={c.id} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">型號 *</label>
            <select value={formModel} onChange={(e) => setFormModel(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {getModelsForCategory(formCategory).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">廠商</label>
            <select value={formVendor} onChange={(e) => setFormVendor(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="">請選擇</option>
              {vendorOptions.map((v) => <option key={v} value={v}>{v}</option>)}
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
              <label className="block text-sm font-medium mb-1">遠端管理IP</label>
              <input value={formRemoteIp} onChange={(e) => setFormRemoteIp(e.target.value)} placeholder="iLO / iDRAC IP" className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">機櫃位置</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <select value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                  <option value="">未指定</option>
                  {rackOptions.map((r) => <option key={r.id} value={r.name}>{r.name}{r.label ? ` (${r.label})` : ''}</option>)}
                </select>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">機櫃</p>
              </div>
              <div>
                <input type="number" value={formUStart || ''} onChange={(e) => setFormUStart(Number(e.target.value))} min={0} max={60} placeholder="0" className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">起始 U</p>
              </div>
              <div>
                <input type="number" value={formUSize} onChange={(e) => setFormUSize(Number(e.target.value))} min={1} max={20} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">佔用 U</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveAsset} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}儲存
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 匯入 Modal ── */}
      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title="匯入硬體清單">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            每行一筆：<code className="text-xs bg-[var(--color-bg-elevated)] px-1 rounded">名稱,類別key,型號,廠商,IP,位置,說明</code>
          </p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6}
            placeholder={`Web Server 03,x86_server,HPE 380,HPE,192.168.1.12,機房A,備援伺服器`}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono text-xs" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={handleImport} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}匯入
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 新增/編輯類別 Modal ── */}
      <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? '編輯類別' : '新增類別'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">類別名稱 *</label>
            <input value={catFormLabel} onChange={(e) => setCatFormLabel(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="例：x86伺服器" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">類別代碼 *</label>
            <input value={catFormKey} onChange={(e) => setCatFormKey(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono" placeholder="例：x86_server" />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">系統內部識別用，建議使用英文及底線</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">圖示</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <button key={opt.key} type="button" onClick={() => setCatFormIcon(opt.key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all w-16 ${
                      catFormIcon === opt.key
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                    }`} title={opt.label}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveCategory} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingCat ? '更新' : '新增'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 新增/編輯型號 Modal ── */}
      <Modal open={showModelModal} onClose={() => setShowModelModal(false)} title={editingModel ? '編輯型號' : '新增型號'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">型號名稱 *</label>
            <input value={modelFormName} onChange={(e) => setModelFormName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="例：HPE 380" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModelModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveModel} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingModel ? '更新' : '新增'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
