'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Search, Upload, Download, Cable } from 'lucide-react'

interface Circuit {
  id: string
  unit: string
  circuit_number: string
  bandwidth: string      // e.g. "200", "100/40"
  ip_address: string
  description: string
}

const UNITS = ['總局', 'a稽徵所', 'b分局', 'c稽徵所']

const DEMO_CIRCUITS: Circuit[] = [
  { id: '1', unit: '總局', circuit_number: 'xxxxd', bandwidth: '200', ip_address: '', description: '' },
  { id: '2', unit: '總局', circuit_number: 'Xxxdx', bandwidth: '200', ip_address: '', description: '' },
  { id: '3', unit: '總局', circuit_number: 'Xx3', bandwidth: '100', ip_address: '', description: '' },
  { id: '4', unit: '總局', circuit_number: 'Xxr', bandwidth: '100/40', ip_address: '', description: '' },
  { id: '5', unit: 'b分局', circuit_number: 'Xe3', bandwidth: '50', ip_address: '', description: '' },
  { id: '6', unit: 'b分局', circuit_number: 'Xee', bandwidth: '60', ip_address: '', description: '' },
  { id: '7', unit: 'b分局', circuit_number: 'Xxssa', bandwidth: '70', ip_address: '', description: '' },
  { id: '8', unit: 'a稽徵所', circuit_number: 'Xd', bandwidth: '80', ip_address: '', description: '' },
  { id: '9', unit: 'a稽徵所', circuit_number: 'Xd', bandwidth: '90', ip_address: '', description: '' },
  { id: '10', unit: 'a稽徵所', circuit_number: 'Xxbb', bandwidth: '80', ip_address: '', description: '' },
  { id: '11', unit: 'c稽徵所', circuit_number: 'asdfaf', bandwidth: '70', ip_address: '', description: '' },
  { id: '12', unit: 'c稽徵所', circuit_number: 'asdfa', bandwidth: '50', ip_address: '', description: '' },
  { id: '13', unit: 'c稽徵所', circuit_number: 'bb', bandwidth: '60', ip_address: '', description: '' },
]

export default function CircuitManagementPage() {
  const [circuits, setCircuits] = useState<Circuit[]>(DEMO_CIRCUITS)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterUnit, setFilterUnit] = useState<string>('all')

  const [formUnit, setFormUnit] = useState(UNITS[0])
  const [formCircuitNumber, setFormCircuitNumber] = useState('')
  const [formBandwidth, setFormBandwidth] = useState('')
  const [formIpAddress, setFormIpAddress] = useState('')
  const [formDescription, setFormDescription] = useState('')

  function openAdd() {
    setEditingId(null)
    setFormUnit(UNITS[0])
    setFormCircuitNumber('')
    setFormBandwidth('')
    setFormIpAddress('')
    setFormDescription('')
    setShowModal(true)
  }

  function openEdit(c: Circuit) {
    setEditingId(c.id)
    setFormUnit(c.unit)
    setFormCircuitNumber(c.circuit_number)
    setFormBandwidth(c.bandwidth)
    setFormIpAddress(c.ip_address)
    setFormDescription(c.description)
    setShowModal(true)
  }

  function save() {
    if (!formCircuitNumber.trim() || !formBandwidth.trim()) return
    if (editingId) {
      setCircuits(circuits.map((c) =>
        c.id === editingId
          ? { ...c, unit: formUnit, circuit_number: formCircuitNumber.trim(), bandwidth: formBandwidth.trim(), ip_address: formIpAddress.trim(), description: formDescription.trim() }
          : c
      ))
    } else {
      setCircuits([...circuits, {
        id: crypto.randomUUID(),
        unit: formUnit,
        circuit_number: formCircuitNumber.trim(),
        bandwidth: formBandwidth.trim(),
        ip_address: formIpAddress.trim(),
        description: formDescription.trim(),
      }])
    }
    setShowModal(false)
  }

  function remove(id: string) {
    if (confirm('確定要刪除此線路？')) {
      setCircuits(circuits.filter((c) => c.id !== id))
    }
  }

  const filtered = circuits.filter((c) => {
    const matchUnit = filterUnit === 'all' || c.unit === filterUnit
    const matchSearch = !searchTerm ||
      c.circuit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.unit.includes(searchTerm) ||
      c.bandwidth.includes(searchTerm)
    return matchUnit && matchSearch
  })

  // Group by unit for display
  const grouped = UNITS.map((unit) => ({
    unit,
    circuits: filtered.filter((c) => c.unit === unit),
  })).filter((g) => g.circuits.length > 0)

  function exportCSV() {
    const header = '單位,電路編號,頻寬(Mb),IP位址,說明'
    const rows = circuits.map((c) => `${c.unit},${c.circuit_number},${c.bandwidth},${c.ip_address},${c.description}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '線路清單.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      const newCircuits: Circuit[] = []
      lines.slice(1).forEach((line) => {
        const parts = line.split(',').map((p) => p.trim())
        if (parts.length >= 2) {
          newCircuits.push({
            id: crypto.randomUUID(),
            unit: parts[0] || '總局',
            circuit_number: parts[1] || '',
            bandwidth: parts[2] || '',
            ip_address: parts[3] || '',
            description: parts[4] || '',
          })
        }
      })
      if (newCircuits.length > 0) {
        setCircuits((prev) => [...prev, ...newCircuits])
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">線路管理</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">管理各單位電路編號與頻寬資訊，共 {circuits.length} 條線路</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1">
            <Download className="w-4 h-4" /> 匯出
          </button>
          <label className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1 cursor-pointer">
            <Upload className="w-4 h-4" /> 匯入
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
          </label>
          <button onClick={openAdd}
            className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增線路
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="搜尋電路編號、單位..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
          />
        </div>
        <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
          <option value="all">所有單位</option>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
              <th className="text-left px-4 py-3 font-medium w-12">序號</th>
              <th className="text-left px-4 py-3 font-medium">單位</th>
              <th className="text-left px-4 py-3 font-medium">電路編號</th>
              <th className="text-left px-4 py-3 font-medium">頻寬 (Mb)</th>
              <th className="text-left px-4 py-3 font-medium">IP 位址</th>
              <th className="text-left px-4 py-3 font-medium">說明</th>
              <th className="text-center px-4 py-3 font-medium w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ unit, circuits: unitCircuits }) =>
              unitCircuits.map((c, i) => (
                <tr key={c.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                  {i === 0 && (
                    <>
                      <td className="px-4 py-2.5 text-center font-medium border-r border-[var(--color-border)]" rowSpan={unitCircuits.length}>
                        {UNITS.indexOf(unit) + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium border-r border-[var(--color-border)]" rowSpan={unitCircuits.length}>
                        <div className="flex items-center gap-2">
                          <Cable className="w-4 h-4 text-[var(--color-primary)]" />
                          {unit}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2.5 font-mono">{c.circuit_number}</td>
                  <td className="px-4 py-2.5">
                    <span className="bg-[var(--color-primary-dim)] text-[var(--color-badge-blue-text)] px-2 py-0.5 rounded text-xs font-medium">{c.bandwidth}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{c.ip_address || '-'}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{c.description || '-'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-[var(--color-primary-dim)] rounded text-[var(--color-primary)]">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-[var(--color-danger-dim)] rounded text-[var(--color-danger)]">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-[var(--color-text-muted)]">沒有符合條件的線路</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? '編輯線路' : '新增線路'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">單位 *</label>
            <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">電路編號 *</label>
            <input value={formCircuitNumber} onChange={(e) => setFormCircuitNumber(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="e.g. XXXXD" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">頻寬 (Mb) *</label>
            <input value={formBandwidth} onChange={(e) => setFormBandwidth(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="e.g. 200 或 100/40" />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">上下載不同頻寬可用 / 分隔，如 100/40</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IP 位址</label>
            <input value={formIpAddress} onChange={(e) => setFormIpAddress(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="e.g. 192.168.1.1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={save} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
              {editingId ? '更新' : '新增'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
