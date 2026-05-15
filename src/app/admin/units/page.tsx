'use client'

import React, { useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Upload, Pencil, Trash2, Search, Building2, ChevronRight, ChevronDown, Globe, Lock } from 'lucide-react'

type UnitCategory = 'headquarters' | 'branch'
type SubUnit = 'a_office' | 'b_branch' | 'c_office'
type NetworkZone = 'internal' | 'external'

const CATEGORY_LABELS: Record<UnitCategory, string> = {
  headquarters: '總局',
  branch: '分局稽徵所',
}

const SUB_UNIT_LABELS: Record<SubUnit, string> = {
  a_office: 'a稽徵所',
  b_branch: 'b分局',
  c_office: 'c稽徵所',
}

const ZONE_LABELS: Record<NetworkZone, string> = {
  internal: '內網',
  external: '外網',
}

const HQ_DEVICE_TYPES = ['防火牆', '核心交換器', '主機交換器', '邊界交換器', '聚合交換器']
const BRANCH_DEVICE_TYPES = ['防火牆', '前端交換器', '聚合交換器']

interface NetworkDevice {
  id: string
  name: string
  category: UnitCategory
  sub_unit: SubUnit | null
  zone: NetworkZone
  device_type: string
  quantity: number
  vendor: string
  description: string
  is_active: boolean
}

const DEMO_DEVICES: NetworkDevice[] = [
  // 總局 - 內網
  { id: 'hi1', name: '總局內網防火牆', category: 'headquarters', sub_unit: null, zone: 'internal', device_type: '防火牆', quantity: 2, vendor: '宏華', description: '內網主要防火牆', is_active: true },
  { id: 'hi2', name: '總局內網核心交換器', category: 'headquarters', sub_unit: null, zone: 'internal', device_type: '核心交換器', quantity: 2, vendor: '宏華', description: '內網核心交換', is_active: true },
  { id: 'hi3', name: '總局內網主機交換器', category: 'headquarters', sub_unit: null, zone: 'internal', device_type: '主機交換器', quantity: 6, vendor: '宏華', description: '主機區交換器', is_active: true },
  { id: 'hi4', name: '總局內網邊界交換器', category: 'headquarters', sub_unit: null, zone: 'internal', device_type: '邊界交換器', quantity: 2, vendor: '宏華', description: '內網邊界', is_active: true },
  { id: 'hi5', name: '總局內網聚合交換器', category: 'headquarters', sub_unit: null, zone: 'internal', device_type: '聚合交換器', quantity: 4, vendor: '宏華', description: '內網聚合', is_active: true },
  // 總局 - 外網
  { id: 'he1', name: '總局外網防火牆', category: 'headquarters', sub_unit: null, zone: 'external', device_type: '防火牆', quantity: 2, vendor: '宏華', description: '外網主要防火牆', is_active: true },
  { id: 'he2', name: '總局外網核心交換器', category: 'headquarters', sub_unit: null, zone: 'external', device_type: '核心交換器', quantity: 2, vendor: '宏華', description: '外網核心交換', is_active: true },
  { id: 'he3', name: '總局外網主機交換器', category: 'headquarters', sub_unit: null, zone: 'external', device_type: '主機交換器', quantity: 4, vendor: '宏華', description: '外網主機交換', is_active: true },
  { id: 'he4', name: '總局外網邊界交換器', category: 'headquarters', sub_unit: null, zone: 'external', device_type: '邊界交換器', quantity: 2, vendor: '宏華', description: '外網邊界', is_active: true },
  { id: 'he5', name: '總局外網聚合交換器', category: 'headquarters', sub_unit: null, zone: 'external', device_type: '聚合交換器', quantity: 2, vendor: '宏華', description: '外網聚合', is_active: true },
  // a稽徵所 - 內網
  { id: 'ai1', name: 'a稽徵所內網防火牆', category: 'branch', sub_unit: 'a_office', zone: 'internal', device_type: '防火牆', quantity: 1, vendor: '宏華', description: '內網防火牆', is_active: true },
  { id: 'ai2', name: 'a稽徵所內網前端交換器', category: 'branch', sub_unit: 'a_office', zone: 'internal', device_type: '前端交換器', quantity: 1, vendor: '宏華', description: '內網前端交換', is_active: true },
  { id: 'ai3', name: 'a稽徵所內網聚合交換器', category: 'branch', sub_unit: 'a_office', zone: 'internal', device_type: '聚合交換器', quantity: 1, vendor: '宏華', description: '內網聚合', is_active: true },
  // a稽徵所 - 外網
  { id: 'ae1', name: 'a稽徵所外網防火牆', category: 'branch', sub_unit: 'a_office', zone: 'external', device_type: '防火牆', quantity: 1, vendor: '宏華', description: '外網防火牆', is_active: true },
  { id: 'ae2', name: 'a稽徵所外網前端交換器', category: 'branch', sub_unit: 'a_office', zone: 'external', device_type: '前端交換器', quantity: 1, vendor: '宏華', description: '外網前端交換', is_active: true },
  { id: 'ae3', name: 'a稽徵所外網聚合交換器', category: 'branch', sub_unit: 'a_office', zone: 'external', device_type: '聚合交換器', quantity: 1, vendor: '宏華', description: '外網聚合', is_active: true },
  // b分局
  { id: 'bi1', name: 'b分局內網防火牆', category: 'branch', sub_unit: 'b_branch', zone: 'internal', device_type: '防火牆', quantity: 1, vendor: '宏華', description: '內網防火牆', is_active: true },
  { id: 'bi2', name: 'b分局內網前端交換器', category: 'branch', sub_unit: 'b_branch', zone: 'internal', device_type: '前端交換器', quantity: 1, vendor: '宏華', description: '內網前端交換', is_active: true },
  { id: 'bi3', name: 'b分局內網聚合交換器', category: 'branch', sub_unit: 'b_branch', zone: 'internal', device_type: '聚合交換器', quantity: 1, vendor: '宏華', description: '內網聚合', is_active: true },
  { id: 'be1', name: 'b分局外網防火牆', category: 'branch', sub_unit: 'b_branch', zone: 'external', device_type: '防火牆', quantity: 1, vendor: '宏華', description: '外網防火牆', is_active: true },
  { id: 'be2', name: 'b分局外網前端交換器', category: 'branch', sub_unit: 'b_branch', zone: 'external', device_type: '前端交換器', quantity: 1, vendor: '宏華', description: '外網前端交換', is_active: true },
  { id: 'be3', name: 'b分局外網聚合交換器', category: 'branch', sub_unit: 'b_branch', zone: 'external', device_type: '聚合交換器', quantity: 1, vendor: '宏華', description: '外網聚合', is_active: true },
  // c稽徵所
  { id: 'ci1', name: 'c稽徵所內網防火牆', category: 'branch', sub_unit: 'c_office', zone: 'internal', device_type: '防火牆', quantity: 1, vendor: '宏華', description: '內網防火牆', is_active: true },
  { id: 'ci2', name: 'c稽徵所內網前端交換器', category: 'branch', sub_unit: 'c_office', zone: 'internal', device_type: '前端交換器', quantity: 1, vendor: '宏華', description: '內網前端交換', is_active: true },
  { id: 'ci3', name: 'c稽徵所內網聚合交換器', category: 'branch', sub_unit: 'c_office', zone: 'internal', device_type: '聚合交換器', quantity: 1, vendor: '宏華', description: '內網聚合', is_active: true },
  { id: 'ce1', name: 'c稽徵所外網防火牆', category: 'branch', sub_unit: 'c_office', zone: 'external', device_type: '防火牆', quantity: 1, vendor: '宏華', description: '外網防火牆', is_active: true },
  { id: 'ce2', name: 'c稽徵所外網前端交換器', category: 'branch', sub_unit: 'c_office', zone: 'external', device_type: '前端交換器', quantity: 1, vendor: '宏華', description: '外網前端交換', is_active: true },
  { id: 'ce3', name: 'c稽徵所外網聚合交換器', category: 'branch', sub_unit: 'c_office', zone: 'external', device_type: '聚合交換器', quantity: 1, vendor: '宏華', description: '外網聚合', is_active: true },
]

export default function UnitsPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>(DEMO_DEVICES)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | UnitCategory>('all')
  const [filterSubUnit, setFilterSubUnit] = useState<'all' | SubUnit>('all')
  const [filterZone, setFilterZone] = useState<'all' | NetworkZone>('all')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingDevice, setEditingDevice] = useState<NetworkDevice | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['headquarters', 'a_office', 'b_branch', 'c_office']))
  const [importText, setImportText] = useState('')

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<UnitCategory>('headquarters')
  const [formSubUnit, setFormSubUnit] = useState<SubUnit | ''>('')
  const [formZone, setFormZone] = useState<NetworkZone>('internal')
  const [formDeviceType, setFormDeviceType] = useState('')
  const [formQuantity, setFormQuantity] = useState(1)
  const [formVendor, setFormVendor] = useState('宏華')
  const [formDesc, setFormDesc] = useState('')

  const filtered = devices.filter((d) => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (filterSubUnit !== 'all' && d.sub_unit !== filterSubUnit) return false
    if (filterZone !== 'all' && d.zone !== filterZone) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.device_type.includes(search)) return false
    return true
  })

  const grouped = {
    headquarters: filtered.filter((d) => d.category === 'headquarters'),
    a_office: filtered.filter((d) => d.sub_unit === 'a_office'),
    b_branch: filtered.filter((d) => d.sub_unit === 'b_branch'),
    c_office: filtered.filter((d) => d.sub_unit === 'c_office'),
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const availableDeviceTypes = formCategory === 'headquarters' ? HQ_DEVICE_TYPES : BRANCH_DEVICE_TYPES

  function openNew() {
    setEditingDevice(null)
    setFormName(''); setFormCategory('headquarters'); setFormSubUnit(''); setFormZone('internal'); setFormDeviceType(HQ_DEVICE_TYPES[0]); setFormQuantity(1); setFormVendor('宏華'); setFormDesc('')
    setShowModal(true)
  }

  function openEdit(device: NetworkDevice) {
    setEditingDevice(device)
    setFormName(device.name); setFormCategory(device.category); setFormSubUnit(device.sub_unit || ''); setFormZone(device.zone); setFormDeviceType(device.device_type); setFormQuantity(device.quantity); setFormVendor(device.vendor); setFormDesc(device.description)
    setShowModal(true)
  }

  function saveDevice() {
    if (!formName) return
    const newDevice: NetworkDevice = {
      id: editingDevice?.id || crypto.randomUUID(),
      name: formName,
      category: formCategory,
      sub_unit: formCategory === 'branch' ? (formSubUnit as SubUnit) || 'a_office' : null,
      zone: formZone,
      device_type: formDeviceType,
      quantity: formQuantity,
      vendor: formVendor,
      description: formDesc,
      is_active: true,
    }
    if (editingDevice) {
      setDevices(devices.map((d) => (d.id === editingDevice.id ? newDevice : d)))
    } else {
      setDevices([...devices, newDevice])
    }
    setShowModal(false)
  }

  function deleteDevice(id: string) { setDevices(devices.filter((d) => d.id !== id)) }

  function handleImport() {
    const lines = importText.trim().split('\n').filter((l) => l.trim())
    const newDevices: NetworkDevice[] = lines.map((line) => {
      const parts = line.split(',').map((s) => s.trim())
      const cat = parts[1] === 'branch' ? 'branch' : 'headquarters'
      const sub = cat === 'branch' ? (parts[2] as SubUnit || 'a_office') : null
      const zone: NetworkZone = parts[3] === 'external' ? 'external' : 'internal'
      return {
        id: crypto.randomUUID(), name: parts[0] || '', category: cat as UnitCategory,
        sub_unit: sub, zone, device_type: parts[4] || '', quantity: parseInt(parts[5]) || 1, vendor: parts[6] || '宏華', description: parts[7] || '', is_active: true,
      }
    }).filter((d) => d.name)
    setDevices([...devices, ...newDevices])
    setShowImportModal(false); setImportText('')
  }

  const hqCount = devices.filter((d) => d.category === 'headquarters').length
  const branchCount = devices.filter((d) => d.category === 'branch').length
  const internalCount = devices.filter((d) => d.zone === 'internal').length
  const externalCount = devices.filter((d) => d.zone === 'external').length

  function renderDeviceRow(device: NetworkDevice, indent: number) {
    return (
      <tr key={device.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
        <td className="px-4 py-3 font-medium" style={{ paddingLeft: `${indent}px` }}>{device.name}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${device.zone === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
            {device.zone === 'internal' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {ZONE_LABELS[device.zone]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">{device.device_type}</td>
        <td className="px-4 py-3 text-right">
          <span className="font-semibold text-[var(--color-primary)]">{device.quantity}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{device.vendor}</span>
        </td>
        <td className="px-4 py-3 text-[var(--color-text-muted)]">{device.description}</td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => openEdit(device)} className="p-1 hover:bg-gray-100 rounded mr-1"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => deleteDevice(device.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
        </td>
      </tr>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">網路管理</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <Upload className="w-4 h-4" /> 匯入
          </button>
          <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增設備
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-2xl font-bold">{devices.length}</div>
          <div className="text-sm text-[var(--color-text-muted)]">總設備數</div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-600">{hqCount}</div>
          <div className="text-sm text-[var(--color-text-muted)]">總局</div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{internalCount}</div>
          <div className="text-sm text-[var(--color-text-muted)]">內網設備</div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">{externalCount}</div>
          <div className="text-sm text-[var(--color-text-muted)]">外網設備</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          {[{ k: 'all', l: '全部' }, { k: 'headquarters', l: '總局' }, { k: 'branch', l: '分局稽徵所' }].map(({ k, l }) => (
            <button key={k} onClick={() => { setFilterCategory(k as 'all' | UnitCategory); setFilterSubUnit('all') }}
              className={`px-3 py-1.5 text-sm ${filterCategory === k ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
        {filterCategory === 'branch' && (
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button onClick={() => setFilterSubUnit('all')} className={`px-3 py-1.5 text-sm ${filterSubUnit === 'all' ? 'bg-green-600 text-white' : 'hover:bg-gray-50'}`}>全部</button>
            {Object.entries(SUB_UNIT_LABELS).map(([k, l]) => (
              <button key={k} onClick={() => setFilterSubUnit(k as SubUnit)} className={`px-3 py-1.5 text-sm ${filterSubUnit === k ? 'bg-green-600 text-white' : 'hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
        )}
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          {[{ k: 'all', l: '全部網路' }, { k: 'internal', l: '內網' }, { k: 'external', l: '外網' }].map(({ k, l }) => (
            <button key={k} onClick={() => setFilterZone(k as 'all' | NetworkZone)}
              className={`px-3 py-1.5 text-sm ${filterZone === k ? (k === 'internal' ? 'bg-blue-600 text-white' : k === 'external' ? 'bg-orange-500 text-white' : 'bg-gray-600 text-white') : 'hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋設備名稱或類型..." className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg" />
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-gray-50">
              <th className="text-left px-4 py-3 font-medium">名稱</th>
              <th className="text-left px-4 py-3 font-medium">網路</th>
              <th className="text-left px-4 py-3 font-medium">設備類型</th>
              <th className="text-right px-4 py-3 font-medium">數量</th>
              <th className="text-left px-4 py-3 font-medium">廠商</th>
              <th className="text-left px-4 py-3 font-medium">說明</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {(filterCategory === 'all' || filterCategory === 'headquarters') && filterSubUnit === 'all' && (
              <>
                <tr>
                  <td colSpan={7} className="p-0">
                    <button onClick={() => toggleGroup('headquarters')} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-purple-50 hover:bg-purple-100 transition-colors text-purple-800">
                      {expandedGroups.has('headquarters') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Building2 className="w-4 h-4" /> 總局
                      <span className="text-xs opacity-60 ml-1">({grouped.headquarters.length})</span>
                    </button>
                  </td>
                </tr>
                {expandedGroups.has('headquarters') && grouped.headquarters.map((d) => renderDeviceRow(d, 40))}
              </>
            )}

            {(filterCategory === 'all' || filterCategory === 'branch') && (
              <>
                {filterCategory === 'all' && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="px-4 py-2.5 text-sm font-medium bg-green-50 text-green-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> 分局稽徵所
                        <span className="text-xs opacity-60 ml-1">({branchCount})</span>
                      </div>
                    </td>
                  </tr>
                )}
                {Object.entries(SUB_UNIT_LABELS).map(([subKey, subLabel]) => {
                  const items = grouped[subKey as keyof typeof grouped]
                  if (filterSubUnit !== 'all' && filterSubUnit !== subKey) return null
                  if (items.length === 0 && filterCategory !== 'all') return null
                  return (
                    <React.Fragment key={subKey}>
                      <tr>
                        <td colSpan={7} className="p-0">
                          <button onClick={() => toggleGroup(subKey)} className="flex items-center gap-2 w-full px-4 pl-8 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-colors">
                            {expandedGroups.has(subKey) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {subLabel}
                            <span className="text-xs text-[var(--color-text-muted)] ml-1">({items.length})</span>
                          </button>
                        </td>
                      </tr>
                      {expandedGroups.has(subKey) && items.map((d) => renderDeviceRow(d, 56))}
                    </React.Fragment>
                  )
                })}
              </>
            )}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-[var(--color-text-muted)]">無符合條件的設備</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingDevice ? '編輯設備' : '新增設備'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">類別 *</label>
            <select value={formCategory} onChange={(e) => { setFormCategory(e.target.value as UnitCategory); if (e.target.value === 'headquarters') { setFormSubUnit(''); setFormDeviceType(HQ_DEVICE_TYPES[0]) } else { setFormDeviceType(BRANCH_DEVICE_TYPES[0]) } }}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {formCategory === 'branch' && (
            <div>
              <label className="block text-sm font-medium mb-1">所屬單位 *</label>
              <select value={formSubUnit} onChange={(e) => setFormSubUnit(e.target.value as SubUnit)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                <option value="">請選擇</option>
                {Object.entries(SUB_UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">內/外網 *</label>
            <div className="flex gap-2">
              {Object.entries(ZONE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setFormZone(k as NetworkZone)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${formZone === k ? (k === 'internal' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-orange-50 border-orange-300 text-orange-700') : 'border-[var(--color-border)] hover:bg-gray-50'}`}>
                  {k === 'internal' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">設備類型 *</label>
            <select value={formDeviceType} onChange={(e) => setFormDeviceType(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {availableDeviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">數量 *</label>
            <input type="number" min={1} value={formQuantity} onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">廠商</label>
            <input value={formVendor} onChange={(e) => setFormVendor(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">名稱 *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={saveDevice} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">儲存</button>
          </div>
        </div>
      </Modal>

      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title="匯入網路設備清單">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            每行一筆：<code className="text-xs bg-gray-100 px-1 rounded">名稱,類別(headquarters/branch),子單位(a_office/b_branch/c_office),網路(internal/external),設備類型,廠商,說明</code>
          </p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6}
            placeholder={`總局內網防火牆2,headquarters,,internal,防火牆,備援防火牆\na稽徵所外網前端交換器2,branch,a_office,external,前端交換器,備援交換器`}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono text-xs" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={handleImport} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">匯入</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
