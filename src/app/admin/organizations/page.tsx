'use client'

import React, { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { supabase } from '@/lib/supabase'
import {
  Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight,
  Shield, Lock, Globe, Cable, Wifi, Loader2,
} from 'lucide-react'

// ── Types ──

type UnitType = 'headquarters' | 'branch' | 'office'

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  headquarters: '總局',
  branch: '分局',
  office: '稽徵所',
}

interface AutoDevice {
  id: string
  name: string
  zone: 'internal' | 'external'
  device_type: string
  vendor: string
  quantity: number
}

// 設備數量 map key: `${zone}_${device_type}`
type DeviceQtyMap = Record<string, number>

interface UnitCircuit {
  id: string
  circuit_number: string
  bandwidth: string
  ip_address: string
}

interface OrgUnit {
  id: string
  name: string
  type: UnitType
  devices: AutoDevice[]
  circuits: UnitCircuit[]
  created_at: string
}

const ZONE_LABELS = { internal: '內網', external: '外網' }

// 總局設備類型
const HQ_DEVICE_TYPES = ['防火牆', '核心交換器', '主機交換器', '邊界交換器', '聚合交換器']
// 分局/稽徵所設備類型
const BRANCH_DEVICE_TYPES = ['防火牆', '前端交換器', '聚合交換器']

function getDefaultQtyMap(unitType: UnitType): DeviceQtyMap {
  const types = unitType === 'headquarters' ? HQ_DEVICE_TYPES : BRANCH_DEVICE_TYPES
  const map: DeviceQtyMap = {}
  const zones: Array<'internal' | 'external'> = ['internal', 'external']
  zones.forEach((zone) => {
    types.forEach((dt) => {
      map[`${zone}_${dt}`] = unitType === 'headquarters' ? 2 : 1
    })
  })
  return map
}

function generateDevices(unitName: string, unitType: UnitType, qtyMap?: DeviceQtyMap): AutoDevice[] {
  const types = unitType === 'headquarters' ? HQ_DEVICE_TYPES : BRANCH_DEVICE_TYPES
  const zones: Array<'internal' | 'external'> = ['internal', 'external']
  const devices: AutoDevice[] = []
  zones.forEach((zone) => {
    types.forEach((dt) => {
      const qty = qtyMap?.[`${zone}_${dt}`] ?? 1
      if (qty > 0) {
        devices.push({
          id: crypto.randomUUID(),
          name: `${unitName}${ZONE_LABELS[zone]}${dt}`,
          zone,
          device_type: dt,
          vendor: '宏華',
          quantity: qty,
        })
      }
    })
  })
  return devices
}

// ── Component ──

export default function OrganizationsPage() {
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<UnitType>('branch')
  const [formDeviceQty, setFormDeviceQty] = useState<DeviceQtyMap>(() => getDefaultQtyMap('branch'))
  const [formCircuits, setFormCircuits] = useState<Array<{ circuit_number: string; bandwidth: string; ip_address: string }>>([])

  // Edit circuit modal
  const [showCircuitModal, setShowCircuitModal] = useState(false)
  const [editCircuitUnitId, setEditCircuitUnitId] = useState<string | null>(null)
  const [circuitFormNumber, setCircuitFormNumber] = useState('')
  const [circuitFormBandwidth, setCircuitFormBandwidth] = useState('')
  const [circuitFormIp, setCircuitFormIp] = useState('')

  // ── Data fetching ──

  const fetchOrganizations = useCallback(async () => {
    const [orgsRes, devicesRes, circuitsRes] = await Promise.all([
      supabase.from('organizations').select('*').order('name'),
      supabase.from('org_devices').select('*'),
      supabase.from('org_circuits').select('*'),
    ])

    if (orgsRes.error) { console.error('Failed to fetch organizations:', orgsRes.error); return }
    if (devicesRes.error) { console.error('Failed to fetch devices:', devicesRes.error); return }
    if (circuitsRes.error) { console.error('Failed to fetch circuits:', circuitsRes.error); return }

    const orgs = orgsRes.data ?? []
    const devices = devicesRes.data ?? []
    const circuits = circuitsRes.data ?? []

    const combined: OrgUnit[] = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      type: org.type as UnitType,
      created_at: org.created_at?.slice(0, 10) ?? '',
      devices: devices
        .filter((d) => d.org_id === org.id)
        .map((d) => ({
          id: d.id,
          name: d.name,
          zone: d.zone as 'internal' | 'external',
          device_type: d.device_type,
          vendor: d.vendor,
          quantity: d.quantity,
        })),
      circuits: circuits
        .filter((c) => c.org_id === org.id)
        .map((c) => ({
          id: c.id,
          circuit_number: c.circuit_number,
          bandwidth: c.bandwidth,
          ip_address: c.ip_address,
        })),
    }))

    setUnits(combined)
  }, [])

  useEffect(() => {
    fetchOrganizations().finally(() => setLoading(false))
  }, [fetchOrganizations])

  // ── UI helpers ──

  function toggleExpand(id: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openAdd() {
    setEditingId(null)
    setFormName('')
    setFormType('branch')
    setFormDeviceQty(getDefaultQtyMap('branch'))
    setFormCircuits([{ circuit_number: '', bandwidth: '', ip_address: '' }])
    setShowModal(true)
  }

  function openEdit(unit: OrgUnit) {
    setEditingId(unit.id)
    setFormName(unit.name)
    setFormType(unit.type)
    // Build qty map from existing devices
    const qtyMap = getDefaultQtyMap(unit.type)
    Object.keys(qtyMap).forEach((k) => { qtyMap[k] = 0 })
    unit.devices.forEach((d) => {
      const key = `${d.zone}_${d.device_type}`
      qtyMap[key] = d.quantity || 1
    })
    setFormDeviceQty(qtyMap)
    setFormCircuits(unit.circuits.map((c) => ({ circuit_number: c.circuit_number, bandwidth: c.bandwidth, ip_address: c.ip_address })))
    setShowModal(true)
  }

  function addCircuitRow() {
    setFormCircuits([...formCircuits, { circuit_number: '', bandwidth: '', ip_address: '' }])
  }

  function removeCircuitRow(idx: number) {
    setFormCircuits(formCircuits.filter((_, i) => i !== idx))
  }

  function updateCircuitRow(idx: number, field: string, value: string) {
    setFormCircuits(formCircuits.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  // ── Mutations ──

  async function save() {
    if (!formName.trim()) return
    setSaving(true)

    try {
      const name = formName.trim()
      const validCircuits = formCircuits
        .filter((c) => c.circuit_number.trim())
        .map((c) => ({
          circuit_number: c.circuit_number.trim(),
          bandwidth: c.bandwidth.trim(),
          ip_address: c.ip_address.trim(),
        }))

      const devices = generateDevices(name, formType, formDeviceQty)

      if (editingId) {
        // Update organization
        const { error: orgErr } = await supabase
          .from('organizations')
          .update({ name, type: formType })
          .eq('id', editingId)
        if (orgErr) throw orgErr

        // Replace devices: delete existing, insert new
        const { error: delDevErr } = await supabase
          .from('org_devices')
          .delete()
          .eq('org_id', editingId)
        if (delDevErr) throw delDevErr

        if (devices.length > 0) {
          const { error: insDevErr } = await supabase
            .from('org_devices')
            .insert(devices.map((d) => ({
              org_id: editingId,
              name: d.name,
              zone: d.zone,
              device_type: d.device_type,
              vendor: d.vendor,
              quantity: d.quantity,
            })))
          if (insDevErr) throw insDevErr
        }

        // Replace circuits: delete existing, insert new
        const { error: delCirErr } = await supabase
          .from('org_circuits')
          .delete()
          .eq('org_id', editingId)
        if (delCirErr) throw delCirErr

        if (validCircuits.length > 0) {
          const { error: insCirErr } = await supabase
            .from('org_circuits')
            .insert(validCircuits.map((c) => ({
              org_id: editingId,
              circuit_number: c.circuit_number,
              bandwidth: c.bandwidth,
              ip_address: c.ip_address,
            })))
          if (insCirErr) throw insCirErr
        }
      } else {
        // Create new organization
        const { data: newOrg, error: orgErr } = await supabase
          .from('organizations')
          .insert({ name, type: formType })
          .select()
          .single()
        if (orgErr || !newOrg) throw orgErr ?? new Error('Failed to create organization')

        const orgId = newOrg.id

        // Insert devices
        if (devices.length > 0) {
          const { error: insDevErr } = await supabase
            .from('org_devices')
            .insert(devices.map((d) => ({
              org_id: orgId,
              name: d.name,
              zone: d.zone,
              device_type: d.device_type,
              vendor: d.vendor,
              quantity: d.quantity,
            })))
          if (insDevErr) throw insDevErr
        }

        // Insert circuits
        if (validCircuits.length > 0) {
          const { error: insCirErr } = await supabase
            .from('org_circuits')
            .insert(validCircuits.map((c) => ({
              org_id: orgId,
              circuit_number: c.circuit_number,
              bandwidth: c.bandwidth,
              ip_address: c.ip_address,
            })))
          if (insCirErr) throw insCirErr
        }

        // Auto-expand new unit
        setExpandedUnits((prev) => new Set([...prev, orgId]))
      }

      setShowModal(false)
      await fetchOrganizations()
    } catch (err) {
      console.error('Save failed:', err)
      alert('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  async function removeUnit(id: string) {
    if (!confirm('確定要刪除此單位？將同時移除所有設備與電路。')) return
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', id)
      if (error) throw error
      await fetchOrganizations()
    } catch (err) {
      console.error('Delete org failed:', err)
      alert('刪除失敗，請稍後再試')
    }
  }

  // Add single circuit to existing unit
  function openAddCircuit(unitId: string) {
    setEditCircuitUnitId(unitId)
    setCircuitFormNumber('')
    setCircuitFormBandwidth('')
    setCircuitFormIp('')
    setShowCircuitModal(true)
  }

  async function saveCircuit() {
    if (!editCircuitUnitId || !circuitFormNumber.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('org_circuits')
        .insert({
          org_id: editCircuitUnitId,
          circuit_number: circuitFormNumber.trim(),
          bandwidth: circuitFormBandwidth.trim(),
          ip_address: circuitFormIp.trim(),
        })
      if (error) throw error
      setShowCircuitModal(false)
      await fetchOrganizations()
    } catch (err) {
      console.error('Save circuit failed:', err)
      alert('新增電路失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  async function removeCircuit(unitId: string, circuitId: string) {
    try {
      const { error } = await supabase.from('org_circuits').delete().eq('id', circuitId)
      if (error) throw error
      await fetchOrganizations()
    } catch (err) {
      console.error('Delete circuit failed:', err)
    }
  }

  async function removeDevice(unitId: string, deviceId: string) {
    try {
      const { error } = await supabase.from('org_devices').delete().eq('id', deviceId)
      if (error) throw error
      await fetchOrganizations()
    } catch (err) {
      console.error('Delete device failed:', err)
    }
  }

  // ── Loading state ──

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

  const totalDevices = units.reduce((sum, u) => sum + u.devices.reduce((s, d) => s + (d.quantity || 1), 0), 0)
  const totalCircuits = units.reduce((sum, u) => sum + u.circuits.length, 0)

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">單位管理</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            管理分局、稽徵所，新增時自動建立內外網設備，並可同時設定電路
          </p>
        </div>
        <button onClick={openAdd}
          className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增單位
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-[var(--color-text-muted)]">單位數</span>
          </div>
          <div className="text-2xl font-bold">{units.length}</div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm text-[var(--color-text-muted)]">網路設備</span>
          </div>
          <div className="text-2xl font-bold">{totalDevices}</div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Cable className="w-4 h-4 text-[var(--color-success)]" />
            <span className="text-sm text-[var(--color-text-muted)]">電路總數</span>
          </div>
          <div className="text-2xl font-bold">{totalCircuits}</div>
        </div>
      </div>

      {/* Unit list */}
      <div className="space-y-4">
        {units.map((unit) => {
          const expanded = expandedUnits.has(unit.id)
          const internalDevices = unit.devices.filter((d) => d.zone === 'internal')
          const externalDevices = unit.devices.filter((d) => d.zone === 'external')
          return (
            <div key={unit.id} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
              {/* Unit header */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--color-hover)]" onClick={() => toggleExpand(unit.id)}>
                <div className="flex items-center gap-3">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <span className="font-semibold">{unit.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">
                      {UNIT_TYPE_LABELS[unit.type]}
                    </span>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary-dim)] text-[var(--color-badge-blue-text)]">
                      <Wifi className="w-3 h-3 inline mr-1" />{unit.devices.reduce((s, d) => s + (d.quantity || 1), 0)} 設備
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-badge-green)] text-[var(--color-badge-green-text)]">
                      <Cable className="w-3 h-3 inline mr-1" />{unit.circuits.length} 電路
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(unit)} className="p-1.5 hover:bg-[var(--color-primary-dim)] rounded text-[var(--color-primary)]" title="編輯">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeUnit(unit.id)} className="p-1.5 hover:bg-[var(--color-danger-dim)] rounded text-[var(--color-danger)]" title="刪除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div className="border-t border-[var(--color-border)]">
                  {/* Devices section */}
                  <div className="px-4 py-3">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[var(--color-primary)]" /> 網路設備
                      <span className="text-xs text-[var(--color-text-muted)]">（新增單位時自動建立）</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Internal */}
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Lock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span className="text-xs font-medium text-[var(--color-badge-blue-text)]">內網</span>
                        </div>
                        <div className="space-y-1">
                          {internalDevices.map((d) => (
                            <div key={d.id} className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-primary-dim)]/50 rounded text-sm">
                              <div className="flex items-center gap-2">
                                <span>{d.device_type}</span>
                                <span className="text-xs font-mono text-[var(--color-badge-blue-text)]">x{d.quantity || 1}</span>
                                <span className="text-xs text-[var(--color-text-muted)]">({d.vendor})</span>
                              </div>
                              <button onClick={() => removeDevice(unit.id, d.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)] p-0.5">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {internalDevices.length === 0 && <div className="text-xs text-[var(--color-text-muted)] px-3 py-1.5">無內網設備</div>}
                        </div>
                      </div>
                      {/* External */}
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Globe className="w-3.5 h-3.5 text-orange-600" />
                          <span className="text-xs font-medium text-[var(--color-warning)]">外網</span>
                        </div>
                        <div className="space-y-1">
                          {externalDevices.map((d) => (
                            <div key={d.id} className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-warning-dim)] rounded text-sm">
                              <div className="flex items-center gap-2">
                                <span>{d.device_type}</span>
                                <span className="text-xs font-mono text-[var(--color-warning)]">x{d.quantity || 1}</span>
                                <span className="text-xs text-[var(--color-text-muted)]">({d.vendor})</span>
                              </div>
                              <button onClick={() => removeDevice(unit.id, d.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)] p-0.5">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {externalDevices.length === 0 && <div className="text-xs text-[var(--color-text-muted)] px-3 py-1.5">無外網設備</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Circuits section */}
                  <div className="px-4 py-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Cable className="w-4 h-4 text-[var(--color-success)]" /> 電路
                      </h4>
                      <button onClick={() => openAddCircuit(unit.id)}
                        className="text-xs px-2 py-1 bg-[var(--color-badge-green)] text-[var(--color-badge-green-text)] rounded hover:bg-[var(--color-badge-green)] flex items-center gap-1">
                        <Plus className="w-3 h-3" /> 新增電路
                      </button>
                    </div>
                    {unit.circuits.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-[var(--color-text-muted)]">
                            <th className="text-left py-1 font-medium">電路編號</th>
                            <th className="text-left py-1 font-medium">頻寬 (Mb)</th>
                            <th className="text-left py-1 font-medium">IP Address</th>
                            <th className="text-right py-1 font-medium w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {unit.circuits.map((c) => (
                            <tr key={c.id} className="border-t border-[var(--color-border)]/50">
                              <td className="py-1.5 font-mono">{c.circuit_number}</td>
                              <td className="py-1.5">
                                <span className="text-xs px-2 py-0.5 bg-[var(--color-primary-dim)] text-[var(--color-badge-blue-text)] rounded">{c.bandwidth}</span>
                              </td>
                              <td className="py-1.5 text-[var(--color-text-muted)]">{c.ip_address || '-'}</td>
                              <td className="py-1.5 text-right">
                                <button onClick={() => removeCircuit(unit.id, c.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)] p-0.5">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-xs text-[var(--color-text-muted)] py-2">尚無電路</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {units.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>尚未建立任何單位</p>
            <button onClick={openAdd} className="mt-2 text-[var(--color-primary)] hover:underline text-sm">+ 新增第一個單位</button>
          </div>
        )}
      </div>

      {/* ── 新增/編輯單位 Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? '編輯單位' : '新增單位'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">單位名稱 *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              placeholder="例：d稽徵所" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">單位類型 *</label>
            <div className="flex gap-2">
              {Object.entries(UNIT_TYPE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => { setFormType(k as UnitType); setFormDeviceQty(getDefaultQtyMap(k as UnitType)) }}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${formType === k
                    ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)] text-[var(--color-badge-blue-text)] font-medium'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Device quantity inputs */}
          <div className="bg-[var(--color-table-header)] rounded-lg p-3">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> {editingId ? '設備數量設定' : '自動建立設備數量'}
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {(['internal', 'external'] as const).map((zone) => (
                <div key={zone}>
                  <div className="font-medium mb-2 flex items-center gap-1">
                    {zone === 'internal'
                      ? <><Lock className="w-3 h-3 text-[var(--color-primary)]" /><span className="text-[var(--color-badge-blue-text)]">內網</span></>
                      : <><Globe className="w-3 h-3 text-[var(--color-warning)]" /><span className="text-[var(--color-warning)]">外網</span></>
                    }
                  </div>
                  <div className="space-y-1.5">
                    {(formType === 'headquarters' ? HQ_DEVICE_TYPES : BRANCH_DEVICE_TYPES).map((dt) => {
                      const key = `${zone}_${dt}`
                      return (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <span className="text-[var(--color-text-muted)]">{dt}</span>
                          <input
                            type="number"
                            min={0}
                            value={formDeviceQty[key] ?? 1}
                            onChange={(e) => setFormDeviceQty({ ...formDeviceQty, [key]: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-16 px-2 py-1 border border-[var(--color-border)] rounded text-center text-sm"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Circuits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Cable className="w-4 h-4" /> 電路設定
              </label>
              <button onClick={addCircuitRow} className="text-xs px-2 py-1 bg-[var(--color-badge-green)] text-[var(--color-badge-green-text)] rounded hover:bg-[var(--color-badge-green)] flex items-center gap-1">
                <Plus className="w-3 h-3" /> 新增電路
              </button>
            </div>
            {formCircuits.length === 0 ? (
              <div className="text-xs text-[var(--color-text-muted)] py-2 text-center border border-dashed border-[var(--color-border)] rounded-lg">
                尚未新增電路，點擊上方按鈕新增
              </div>
            ) : (
              <div className="space-y-2">
                {formCircuits.map((c, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      value={c.circuit_number}
                      onChange={(e) => updateCircuitRow(idx, 'circuit_number', e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded text-sm"
                      placeholder="電路編號"
                    />
                    <input
                      value={c.bandwidth}
                      onChange={(e) => updateCircuitRow(idx, 'bandwidth', e.target.value)}
                      className="w-24 px-2 py-1.5 border border-[var(--color-border)] rounded text-sm"
                      placeholder="頻寬(Mb)"
                    />
                    <input
                      value={c.ip_address}
                      onChange={(e) => updateCircuitRow(idx, 'ip_address', e.target.value)}
                      className="w-32 px-2 py-1.5 border border-[var(--color-border)] rounded text-sm"
                      placeholder="IP Address"
                    />
                    <button onClick={() => removeCircuitRow(idx)} className="p-1 text-[var(--color-danger)] hover:text-[var(--color-danger)]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? '更新' : '新增'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 新增電路 Modal（已有單位追加） ── */}
      <Modal open={showCircuitModal} onClose={() => setShowCircuitModal(false)} title="新增電路">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">電路編號 *</label>
            <input value={circuitFormNumber} onChange={(e) => setCircuitFormNumber(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="e.g. XXXXD" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">頻寬 (Mb) *</label>
            <input value={circuitFormBandwidth} onChange={(e) => setCircuitFormBandwidth(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="e.g. 200 或 100/40" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IP Address</label>
            <input value={circuitFormIp} onChange={(e) => setCircuitFormIp(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="e.g. 192.168.1.1" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowCircuitModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveCircuit} disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              新增
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
