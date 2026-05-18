'use client'

import React, { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { supabase } from '@/lib/supabase'
import { Plus, Upload, Pencil, Trash2, Search, Building2, ChevronRight, ChevronDown, Globe, Lock, Loader2 } from 'lucide-react'

type NetworkZone = 'internal' | 'external'

const ZONE_LABELS: Record<NetworkZone, string> = {
  internal: '內網',
  external: '外網',
}

const HQ_DEVICE_TYPES = ['防火牆', '核心交換器', '主機交換器', '邊界交換器', '聚合交換器']
const BRANCH_DEVICE_TYPES = ['防火牆', '前端交換器', '聚合交換器']

interface Organization {
  id: string
  name: string
  type: 'headquarters' | 'branch' | 'office'
}

interface NetworkDevice {
  id: string
  name: string
  org_id: string
  org_name: string
  zone: NetworkZone
  device_type: string
  quantity: number
  vendor: string
}

export default function UnitsPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'headquarters' | 'branch'>('all')
  const [filterOrgId, setFilterOrgId] = useState<string>('all')
  const [filterZone, setFilterZone] = useState<'all' | NetworkZone>('all')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingDevice, setEditingDevice] = useState<NetworkDevice | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [importText, setImportText] = useState('')

  const [formName, setFormName] = useState('')
  const [formOrgId, setFormOrgId] = useState('')
  const [formZone, setFormZone] = useState<NetworkZone>('internal')
  const [formDeviceType, setFormDeviceType] = useState('')
  const [formQuantity, setFormQuantity] = useState(1)
  const [formVendor, setFormVendor] = useState('宏華')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [orgRes, devRes] = await Promise.all([
      supabase.from('organizations').select('id, name, type').order('name'),
      supabase.from('org_devices').select('id, org_id, name, zone, device_type, vendor, quantity, organizations(name, type)').order('name'),
    ])
    if (orgRes.data) {
      setOrganizations(orgRes.data as Organization[])
      setExpandedGroups((prev) => {
        if (prev.size > 0) return prev
        return new Set(orgRes.data.map((o: Organization) => o.id))
      })
    }
    if (devRes.data) {
      const mapped: NetworkDevice[] = (devRes.data as any[]).map((d) => ({
        id: d.id,
        name: d.name,
        org_id: d.org_id,
        org_name: (d.organizations as any)?.name ?? '',
        zone: d.zone as NetworkZone,
        device_type: d.device_type,
        quantity: d.quantity,
        vendor: d.vendor ?? '',
      }))
      setDevices(mapped)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // derive org type lookup
  const orgTypeMap = new Map(organizations.map((o) => [o.id, o.type]))

  const filtered = devices.filter((d) => {
    if (filterCategory !== 'all') {
      const orgType = orgTypeMap.get(d.org_id)
      if (filterCategory === 'headquarters' && orgType !== 'headquarters') return false
      if (filterCategory === 'branch' && orgType === 'headquarters') return false
    }
    if (filterOrgId !== 'all' && d.org_id !== filterOrgId) return false
    if (filterZone !== 'all' && d.zone !== filterZone) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.device_type.includes(search)) return false
    return true
  })

  // group by org_name, ordered by organizations order
  const orgOrder = organizations.map((o) => o.id)
  const grouped: { orgId: string; orgName: string; orgType: string; items: NetworkDevice[] }[] = []
  for (const org of organizations) {
    const items = filtered.filter((d) => d.org_id === org.id)
    if (items.length > 0 || filterCategory === 'all') {
      grouped.push({ orgId: org.id, orgName: org.name, orgType: org.type, items })
    }
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedOrg = organizations.find((o) => o.id === formOrgId)
  const isHqOrg = selectedOrg?.type === 'headquarters'
  const availableDeviceTypes = isHqOrg ? HQ_DEVICE_TYPES : BRANCH_DEVICE_TYPES

  function openNew() {
    setEditingDevice(null)
    setFormName(''); setFormOrgId(organizations[0]?.id ?? ''); setFormZone('internal'); setFormDeviceType(HQ_DEVICE_TYPES[0]); setFormQuantity(1); setFormVendor('宏華')
    setShowModal(true)
  }

  function openEdit(device: NetworkDevice) {
    setEditingDevice(device)
    setFormName(device.name); setFormOrgId(device.org_id); setFormZone(device.zone); setFormDeviceType(device.device_type); setFormQuantity(device.quantity); setFormVendor(device.vendor)
    setShowModal(true)
  }

  async function saveDevice() {
    if (!formName || !formOrgId) return
    setSaving(true)
    const payload = {
      name: formName,
      org_id: formOrgId,
      zone: formZone,
      device_type: formDeviceType,
      quantity: formQuantity,
      vendor: formVendor,
    }
    if (editingDevice) {
      await supabase.from('org_devices').update(payload).eq('id', editingDevice.id)
    } else {
      await supabase.from('org_devices').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  async function deleteDevice(id: string) {
    await supabase.from('org_devices').delete().eq('id', id)
    fetchData()
  }

  async function handleImport() {
    const lines = importText.trim().split('\n').filter((l) => l.trim())
    const orgNameMap = new Map(organizations.map((o) => [o.name, o.id]))
    const rows = lines.map((line) => {
      const parts = line.split(',').map((s) => s.trim())
      const orgId = orgNameMap.get(parts[1] ?? '') ?? ''
      const zone: NetworkZone = parts[2] === 'external' ? 'external' : 'internal'
      return {
        name: parts[0] || '',
        org_id: orgId,
        zone,
        device_type: parts[3] || '',
        quantity: parseInt(parts[4]) || 1,
        vendor: parts[5] || '宏華',
      }
    }).filter((d) => d.name && d.org_id)
    if (rows.length > 0) {
      setSaving(true)
      await supabase.from('org_devices').insert(rows)
      setSaving(false)
      fetchData()
    }
    setShowImportModal(false)
    setImportText('')
  }

  // stats
  const hqCount = devices.filter((d) => orgTypeMap.get(d.org_id) === 'headquarters').length
  const branchCount = devices.length - hqCount
  const internalCount = devices.filter((d) => d.zone === 'internal').length
  const externalCount = devices.filter((d) => d.zone === 'external').length

  // filtered orgs for sub-unit filter
  const branchOrgs = organizations.filter((o) => o.type === 'branch' || o.type === 'office')

  function renderDeviceRow(device: NetworkDevice, indent: number) {
    return (
      <tr key={device.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]">
        <td className="px-4 py-3 font-medium" style={{ paddingLeft: `${indent}px` }}>{device.name}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${device.zone === 'internal' ? 'bg-[var(--color-badge-blue)] text-[var(--color-badge-blue-text)]' : 'bg-[var(--color-badge-yellow)] text-[var(--color-warning)]'}`}>
            {device.zone === 'internal' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {ZONE_LABELS[device.zone]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">{device.device_type}</td>
        <td className="px-4 py-3 text-right">
          <span className="font-semibold text-[var(--color-primary)]">{device.quantity}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">{device.vendor}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <button onClick={() => openEdit(device)} className="p-1 hover:bg-[var(--color-hover)] rounded mr-1"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => deleteDevice(device.id)} className="p-1 hover:bg-[var(--color-danger-dim)] text-[var(--color-danger)] rounded"><Trash2 className="w-4 h-4" /></button>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          <span className="ml-2 text-[var(--color-text-muted)]">載入中...</span>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">網路管理</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1">
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
          <div className="text-2xl font-bold text-[var(--color-primary)]">{internalCount}</div>
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
            <button key={k} onClick={() => { setFilterCategory(k as 'all' | 'headquarters' | 'branch'); setFilterOrgId('all') }}
              className={`px-3 py-1.5 text-sm ${filterCategory === k ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-hover)]'}`}>
              {l}
            </button>
          ))}
        </div>
        {filterCategory === 'branch' && branchOrgs.length > 0 && (
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button onClick={() => setFilterOrgId('all')} className={`px-3 py-1.5 text-sm ${filterOrgId === 'all' ? 'bg-[var(--color-success)] text-white' : 'hover:bg-[var(--color-hover)]'}`}>全部</button>
            {branchOrgs.map((org) => (
              <button key={org.id} onClick={() => setFilterOrgId(org.id)} className={`px-3 py-1.5 text-sm ${filterOrgId === org.id ? 'bg-[var(--color-success)] text-white' : 'hover:bg-[var(--color-hover)]'}`}>{org.name}</button>
            ))}
          </div>
        )}
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          {[{ k: 'all', l: '全部網路' }, { k: 'internal', l: '內網' }, { k: 'external', l: '外網' }].map(({ k, l }) => (
            <button key={k} onClick={() => setFilterZone(k as 'all' | NetworkZone)}
              className={`px-3 py-1.5 text-sm ${filterZone === k ? (k === 'internal' ? 'bg-[var(--color-primary)] text-white' : k === 'external' ? 'bg-[var(--color-warning)] text-white' : 'bg-[var(--color-border)] text-white') : 'hover:bg-[var(--color-hover)]'}`}>
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
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
              <th className="text-left px-4 py-3 font-medium">名稱</th>
              <th className="text-left px-4 py-3 font-medium">網路</th>
              <th className="text-left px-4 py-3 font-medium">設備類型</th>
              <th className="text-right px-4 py-3 font-medium">數量</th>
              <th className="text-left px-4 py-3 font-medium">廠商</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) => {
              const isHq = group.orgType === 'headquarters'
              // Apply category filter to groups
              if (filterCategory === 'headquarters' && !isHq) return null
              if (filterCategory === 'branch' && isHq) return null
              if (filterOrgId !== 'all' && group.orgId !== filterOrgId) return null
              if (group.items.length === 0) return null

              return (
                <React.Fragment key={group.orgId}>
                  <tr>
                    <td colSpan={6} className="p-0">
                      <button onClick={() => toggleGroup(group.orgId)}
                        className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium transition-colors ${isHq ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-300' : 'bg-[var(--color-table-header)] hover:bg-[var(--color-hover)]'}`}>
                        {expandedGroups.has(group.orgId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Building2 className="w-4 h-4" /> {group.orgName}
                        <span className="text-xs opacity-60 ml-1">({group.items.length})</span>
                      </button>
                    </td>
                  </tr>
                  {expandedGroups.has(group.orgId) && group.items.map((d) => renderDeviceRow(d, isHq ? 40 : 56))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-[var(--color-text-muted)]">無符合條件的設備</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingDevice ? '編輯設備' : '新增設備'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">所屬單位 *</label>
            <select value={formOrgId} onChange={(e) => {
              setFormOrgId(e.target.value)
              const org = organizations.find((o) => o.id === e.target.value)
              const isHq = org?.type === 'headquarters'
              setFormDeviceType(isHq ? HQ_DEVICE_TYPES[0] : BRANCH_DEVICE_TYPES[0])
            }}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="">請選擇</option>
              {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">內/外網 *</label>
            <div className="flex gap-2">
              {Object.entries(ZONE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setFormZone(k as NetworkZone)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${formZone === k ? (k === 'internal' ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)] text-[var(--color-badge-blue-text)]' : 'bg-[var(--color-warning-dim)] border-[var(--color-warning)] text-[var(--color-warning)]') : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'}`}>
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
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveDevice} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              儲存
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title="匯入網路設備清單">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            每行一筆：<code className="text-xs bg-[var(--color-bg-elevated)] px-1 rounded">名稱,所屬單位名稱,網路(internal/external),設備類型,數量,廠商</code>
          </p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6}
            placeholder={`總局內網防火牆2,總局,internal,防火牆,2,宏華\na稽徵所外網前端交換器2,a稽徵所,external,前端交換器,1,宏華`}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono text-xs" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={handleImport} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              匯入
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
