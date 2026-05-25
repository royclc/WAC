'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Search, Server, Loader2, Download, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface VmInstance {
  id: string
  network_zone: string
  hostname: string
  ip_address: string
  os_name: string
  os_version: string
  area: string
  service_group: string
  service_name: string
  software: string
  cpu_cores: number
  ram_gb: number
  disk1_gb: string
  disk2_gb: string
  disk3_gb: string
  note: string
  is_owner_vm: boolean
}

const NETWORK_ZONES = ['內網', '中繼', '外網']
const OS_OPTIONS = ['Windows', 'RedHat', 'Rocky Linux', '其他']
const OS_VERSION_MAP: Record<string, string[]> = {
  'Windows': ['Server 2019', 'Server 2022'],
  'RedHat': ['9.4', '9.3', '9.2', '8.10', '8.9'],
  'Rocky Linux': ['9.4', '9.3', '9.2', '8.10', '8.9'],
}
const AREAS = ['管理區', '資源區']
const SERVICE_GROUPS = ['組態', '監控', '管理', '備份', '傳檔', '其他']
const CPU_OPTIONS = Array.from({ length: 64 }, (_, i) => i + 1)
const RAM_OPTIONS = [2, 4, 8, 12, 16, 24, 32, 64, 128]
const DISK_OPTIONS = ['', '50', '100', '150', '200', '250', '300', '其他']

export default function VmManagementPage() {
  const [vms, setVms] = useState<VmInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterZone, setFilterZone] = useState('all')

  // Form state
  const [formZone, setFormZone] = useState('內網')
  const [formHostname, setFormHostname] = useState('')
  const [formIp, setFormIp] = useState('')
  const [formOs, setFormOs] = useState('Windows')
  const [formOsVersion, setFormOsVersion] = useState('Server 2022')
  const [formOsVersionCustom, setFormOsVersionCustom] = useState('')
  const [formArea, setFormArea] = useState('管理區')
  const [formServiceGroup, setFormServiceGroup] = useState('管理')
  const [formServiceGroupCustom, setFormServiceGroupCustom] = useState('')
  const [formServiceName, setFormServiceName] = useState('')
  const [formSoftware, setFormSoftware] = useState('')
  const [formCpu, setFormCpu] = useState(4)
  const [formRam, setFormRam] = useState(8)
  const [formDisk1, setFormDisk1] = useState('')
  const [formDisk1Custom, setFormDisk1Custom] = useState('')
  const [formDisk2, setFormDisk2] = useState('')
  const [formDisk2Custom, setFormDisk2Custom] = useState('')
  const [formDisk3, setFormDisk3] = useState('')
  const [formDisk3Custom, setFormDisk3Custom] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formIsOwnerVm, setFormIsOwnerVm] = useState(false)
  const [filterOwnerVm, setFilterOwnerVm] = useState(false)

  const fetchVms = useCallback(async () => {
    const { data } = await supabase.from('vm_instances').select('*').order('network_zone, hostname')
    if (data) setVms(data as VmInstance[])
  }, [])

  useEffect(() => {
    fetchVms().finally(() => setLoading(false))
  }, [fetchVms])

  function resetForm() {
    setFormZone('內網'); setFormHostname(''); setFormIp('')
    setFormOs('Windows'); setFormOsVersion('Server 2022'); setFormOsVersionCustom('')
    setFormArea('管理區'); setFormServiceGroup('管理'); setFormServiceGroupCustom('')
    setFormServiceName(''); setFormSoftware('')
    setFormCpu(4); setFormRam(8)
    setFormDisk1(''); setFormDisk1Custom('')
    setFormDisk2(''); setFormDisk2Custom('')
    setFormDisk3(''); setFormDisk3Custom('')
    setFormNote('')
    setFormIsOwnerVm(false)
  }

  function openAdd() {
    setEditingId(null)
    resetForm()
    setShowModal(true)
  }

  function openEdit(vm: VmInstance) {
    setEditingId(vm.id)
    setFormZone(vm.network_zone)
    setFormHostname(vm.hostname)
    setFormIp(vm.ip_address)
    setFormOs(vm.os_name)
    // OS version
    const versions = OS_VERSION_MAP[vm.os_name]
    if (versions && versions.includes(vm.os_version)) {
      setFormOsVersion(vm.os_version); setFormOsVersionCustom('')
    } else if (vm.os_name === '其他') {
      setFormOsVersion(''); setFormOsVersionCustom(vm.os_version)
    } else {
      setFormOsVersion('其他'); setFormOsVersionCustom(vm.os_version)
    }
    setFormArea(vm.area)
    // Service group
    if (SERVICE_GROUPS.includes(vm.service_group) && vm.service_group !== '其他') {
      setFormServiceGroup(vm.service_group); setFormServiceGroupCustom('')
    } else {
      setFormServiceGroup('其他'); setFormServiceGroupCustom(vm.service_group)
    }
    setFormServiceName(vm.service_name)
    setFormSoftware(vm.software)
    setFormCpu(vm.cpu_cores)
    setFormRam(vm.ram_gb)
    // Disks
    parseDisk(vm.disk1_gb, setFormDisk1, setFormDisk1Custom)
    parseDisk(vm.disk2_gb, setFormDisk2, setFormDisk2Custom)
    parseDisk(vm.disk3_gb, setFormDisk3, setFormDisk3Custom)
    setFormNote(vm.note)
    setFormIsOwnerVm(vm.is_owner_vm || false)
    setShowModal(true)
  }

  function parseDisk(val: string, setSelect: (v: string) => void, setCustom: (v: string) => void) {
    if (!val) { setSelect(''); setCustom('') }
    else if (['50', '100', '150', '200', '250', '300'].includes(val)) { setSelect(val); setCustom('') }
    else { setSelect('其他'); setCustom(val) }
  }

  function getDiskValue(select: string, custom: string): string {
    if (select === '其他') return custom.trim()
    return select
  }

  function getOsVersion(): string {
    if (formOs === '其他') return formOsVersionCustom.trim()
    if (formOsVersion === '其他') return formOsVersionCustom.trim()
    return formOsVersion
  }

  function getServiceGroup(): string {
    if (formServiceGroup === '其他') return formServiceGroupCustom.trim() || '其他'
    return formServiceGroup
  }

  async function save() {
    if (!formHostname.trim()) return

    // hostname 唯一值檢查
    const hQuery = supabase.from('vm_instances').select('id').eq('hostname', formHostname.trim())
    if (editingId) hQuery.neq('id', editingId)
    const { data: hDup } = await hQuery.limit(1)
    if (hDup && hDup.length > 0) { alert(`主機名稱「${formHostname.trim()}」已存在`); return }

    // ip_address 唯一值檢查（非空時）
    if (formIp.trim()) {
      const ipQuery = supabase.from('vm_instances').select('id').eq('ip_address', formIp.trim())
      if (editingId) ipQuery.neq('id', editingId)
      const { data: ipDup } = await ipQuery.limit(1)
      if (ipDup && ipDup.length > 0) { alert(`IP 位址「${formIp.trim()}」已存在`); return }
    }

    setSaving(true)
    const payload = {
      network_zone: formZone,
      hostname: formHostname.trim(),
      ip_address: formIp.trim(),
      os_name: formOs,
      os_version: getOsVersion(),
      area: formArea,
      service_group: getServiceGroup(),
      service_name: formServiceName.trim(),
      software: formSoftware.trim(),
      cpu_cores: formCpu,
      ram_gb: formRam,
      disk1_gb: getDiskValue(formDisk1, formDisk1Custom),
      disk2_gb: getDiskValue(formDisk2, formDisk2Custom),
      disk3_gb: getDiskValue(formDisk3, formDisk3Custom),
      note: formNote.trim(),
      is_owner_vm: formIsOwnerVm,
    }
    if (editingId) {
      await supabase.from('vm_instances').update(payload).eq('id', editingId)
    } else {
      await supabase.from('vm_instances').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchVms()
  }

  async function remove(id: string) {
    if (!confirm('確定要刪除此 VM？')) return
    await supabase.from('vm_instances').delete().eq('id', id)
    fetchVms()
  }

  function exportCSV() {
    const header = '網段,主機名稱,IP Address,OS名稱,OS版本,區域,服務群組,服務名稱,安裝軟體,CPU(core),RAM(GB),磁碟1(GB),磁碟2(GB),磁碟3(GB),附註,業主VM'
    const rows = vms.map((v) =>
      `${v.network_zone},${v.hostname},${v.ip_address},${v.os_name},${v.os_version},${v.area},${v.service_group},${v.service_name},${v.software},${v.cpu_cores},${v.ram_gb},${v.disk1_gb},${v.disk2_gb},${v.disk3_gb},${v.note},${v.is_owner_vm ? '是' : '否'}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'VM清單.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      const rows = lines.slice(1).map((line) => {
        const p = line.split(',').map((s) => s.trim())
        return {
          network_zone: p[0] || '內網', hostname: p[1] || '', ip_address: p[2] || '',
          os_name: p[3] || '', os_version: p[4] || '', area: p[5] || '',
          service_group: p[6] || '', service_name: p[7] || '', software: p[8] || '',
          cpu_cores: parseInt(p[9]) || 4, ram_gb: parseInt(p[10]) || 8,
          disk1_gb: p[11] || '', disk2_gb: p[12] || '', disk3_gb: p[13] || '', note: p[14] || '',
        }
      }).filter((r) => r.hostname)
      if (rows.length > 0) {
        await supabase.from('vm_instances').insert(rows)
        fetchVms()
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const filtered = vms.filter((v) => {
    const matchZone = filterZone === 'all' || v.network_zone === filterZone
    const matchOwner = !filterOwnerVm || v.is_owner_vm
    const term = searchTerm.toLowerCase()
    const matchSearch = !term ||
      v.hostname.toLowerCase().includes(term) ||
      v.ip_address.includes(term) ||
      v.service_name.toLowerCase().includes(term) ||
      v.os_name.toLowerCase().includes(term)
    return matchZone && matchOwner && matchSearch
  })

  if (loading) return <AppShell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /><span className="ml-2 text-[var(--color-text-muted)]">載入中...</span></div></AppShell>

  // DiskSelect rendered inline to avoid re-mount on re-render
  const renderDiskSelect = (label: string, value: string, custom: string, onChange: (v: string) => void, onCustomChange: (v: string) => void) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex gap-2">
        <select value={value} onChange={(e) => { onChange(e.target.value); if (e.target.value !== '其他') onCustomChange('') }}
          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
          {DISK_OPTIONS.map((d) => <option key={d} value={d}>{d || '(空)'}</option>)}
        </select>
        {value === '其他' && (
          <input value={custom} onChange={(e) => onCustomChange(e.target.value)}
            className="w-24 px-2 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="GB" />
        )}
      </div>
    </div>
  )

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">VM 虛擬機管理</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">管理虛擬機清單，共 {vms.length} 台</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1">
            <Download className="w-4 h-4" /> 匯出
          </button>
          <label className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1 cursor-pointer">
            <Upload className="w-4 h-4" /> 匯入
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
          </label>
          <button onClick={openAdd} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增 VM
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input type="text" placeholder="搜尋主機名稱、IP、服務..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
        </div>
        <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
          <option value="all">所有網段</option>
          {NETWORK_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm cursor-pointer hover:bg-[var(--color-hover)]">
          <input type="checkbox" checked={filterOwnerVm} onChange={(e) => setFilterOwnerVm(e.target.checked)} className="rounded border-gray-300" />
          業主VM
        </label>
      </div>

      {/* Summary cards - clickable filter */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {NETWORK_ZONES.map((zone) => {
          const count = vms.filter((v) => v.network_zone === zone).length
          const colors: Record<string, string> = { '內網': 'text-blue-500', '中繼': 'text-amber-500', '外網': 'text-red-500' }
          const active = filterZone === zone
          return (
            <div key={zone}
              onClick={() => setFilterZone(active ? 'all' : zone)}
              className={`bg-[var(--color-card)] border-2 rounded-xl p-4 cursor-pointer transition-all ${
                active ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <Server className={`w-4 h-4 ${colors[zone]}`} />
                <span className="text-sm text-[var(--color-text-muted)]">{zone}</span>
                {active && <span className="text-xs ml-auto text-[var(--color-primary)]">篩選中</span>}
              </div>
              <div className="text-2xl font-bold">{count}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
              <th className="text-left px-3 py-3 font-medium">網段</th>
              <th className="text-left px-3 py-3 font-medium">主機名稱</th>
              <th className="text-left px-3 py-3 font-medium">IP Address</th>
              <th className="text-left px-3 py-3 font-medium">OS</th>
              <th className="text-left px-3 py-3 font-medium">區域</th>
              <th className="text-left px-3 py-3 font-medium">服務群組</th>
              <th className="text-left px-3 py-3 font-medium">服務名稱</th>
              <th className="text-left px-3 py-3 font-medium">CPU</th>
              <th className="text-left px-3 py-3 font-medium">RAM</th>
              <th className="text-left px-3 py-3 font-medium">磁碟</th>
              <th className="text-center px-3 py-3 font-medium w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const zoneColor: Record<string, string> = {
                '內網': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                '中繼': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                '外網': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
              }
              const disks = [v.disk1_gb, v.disk2_gb, v.disk3_gb].filter(Boolean).join(' / ')
              return (
                <tr key={v.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${zoneColor[v.network_zone] || ''}`}>{v.network_zone}</span>
                  </td>
                  <td className="px-3 py-2.5 font-medium">{v.hostname}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{v.ip_address || '-'}</td>
                  <td className="px-3 py-2.5 text-xs">{v.os_name} {v.os_version}</td>
                  <td className="px-3 py-2.5 text-xs">{v.area}</td>
                  <td className="px-3 py-2.5 text-xs">{v.service_group}</td>
                  <td className="px-3 py-2.5 text-xs">{v.service_name || '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-center">{v.cpu_cores}</td>
                  <td className="px-3 py-2.5 text-xs text-center">{v.ram_gb}</td>
                  <td className="px-3 py-2.5 text-xs">{disks || '-'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-[var(--color-primary-dim)] rounded text-[var(--color-primary)]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(v.id)} className="p-1.5 hover:bg-[var(--color-danger-dim)] rounded text-[var(--color-danger)]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="text-center py-8 text-[var(--color-text-muted)]">
                {vms.length === 0 ? '尚未建立任何 VM' : '沒有符合條件的 VM'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? '編輯 VM' : '新增 VM'} width="max-w-3xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* 網段 */}
          <div>
            <label className="block text-sm font-medium mb-1">網段 *</label>
            <div className="flex gap-2">
              {NETWORK_ZONES.map((z) => (
                <button key={z} onClick={() => setFormZone(z)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${formZone === z
                    ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)] text-[var(--color-badge-blue-text)] font-medium'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'}`}>
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* 主機名稱 + IP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">主機名稱 *</label>
              <input value={formHostname} onChange={(e) => setFormHostname(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IP Address</label>
              <input value={formIp} onChange={(e) => setFormIp(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="e.g. 192.168.1.100" />
            </div>
          </div>

          {/* OS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">OS 名稱</label>
              <select value={formOs} onChange={(e) => {
                const os = e.target.value
                setFormOs(os)
                const vers = OS_VERSION_MAP[os]
                if (vers) { setFormOsVersion(vers[0]); setFormOsVersionCustom('') }
                else { setFormOsVersion(''); setFormOsVersionCustom('') }
              }} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                {OS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">OS 版本</label>
              {formOs !== '其他' && OS_VERSION_MAP[formOs] ? (
                <select value={formOsVersion} onChange={(e) => setFormOsVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                  {OS_VERSION_MAP[formOs].map((v) => <option key={v} value={v}>{v}</option>)}
                  <option value="其他">其他</option>
                </select>
              ) : (
                <input value={formOsVersionCustom} onChange={(e) => setFormOsVersionCustom(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="手動輸入版本" />
              )}
              {formOs !== '其他' && formOsVersion === '其他' && (
                <input value={formOsVersionCustom} onChange={(e) => setFormOsVersionCustom(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm mt-2" placeholder="手動輸入版本" />
              )}
            </div>
          </div>

          {/* 區域 + 服務群組 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">區域</label>
              <select value={formArea} onChange={(e) => setFormArea(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">服務群組</label>
              <select value={formServiceGroup} onChange={(e) => { setFormServiceGroup(e.target.value); if (e.target.value !== '其他') setFormServiceGroupCustom('') }}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                {SERVICE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {formServiceGroup === '其他' && (
                <input value={formServiceGroupCustom} onChange={(e) => setFormServiceGroupCustom(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm mt-2" placeholder="手動輸入群組" />
              )}
            </div>
          </div>

          {/* 服務名稱 + 安裝軟體 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">服務名稱</label>
              <input value={formServiceName} onChange={(e) => setFormServiceName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">安裝軟體</label>
              <input value={formSoftware} onChange={(e) => setFormSoftware(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
            </div>
          </div>

          {/* CPU + RAM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">CPU (core)</label>
              <select value={formCpu} onChange={(e) => setFormCpu(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                {CPU_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">RAM (GB)</label>
              <select value={formRam} onChange={(e) => setFormRam(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                {RAM_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* 磁碟 */}
          <div className="grid grid-cols-3 gap-3">
            {renderDiskSelect('磁碟1 (GB)', formDisk1, formDisk1Custom, setFormDisk1, setFormDisk1Custom)}
            {renderDiskSelect('磁碟2 (GB)', formDisk2, formDisk2Custom, setFormDisk2, setFormDisk2Custom)}
            {renderDiskSelect('磁碟3 (GB)', formDisk3, formDisk3Custom, setFormDisk3, setFormDisk3Custom)}
          </div>

          {/* 業主VM */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={formIsOwnerVm} onChange={(e) => setFormIsOwnerVm(e.target.checked)} className="rounded border-gray-300" />
            <span className="font-medium">是否為業主VM</span>
          </label>

          {/* 附註 */}
          <div>
            <label className="block text-sm font-medium mb-1">附註</label>
            <textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            {editingId && (
              <button onClick={() => { remove(editingId); setShowModal(false) }} disabled={saving}
                className="px-4 py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger-dim)] flex items-center gap-1 disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> 刪除
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? '更新' : '新增'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
