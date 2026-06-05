'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Loader2, Plus, Pencil, Trash2, List, Box } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Types ──
interface Rack {
  id: string
  name: string
  label: string
  row_name: string
  total_u: number
  sort_order: number
}

interface HwAsset {
  id: string
  name: string
  category_key: string
  model: string
  vendor: string
  ip_address: string
  location: string
  description: string
  is_active: boolean
  rack_u_start: number
  rack_u_size: number
}

// ── Color mapping by category_key ──
const DEVICE_TYPE_MAP: Record<string, { type: string; color: string }> = {
  server:    { type: '伺服器', color: '#3B82F6' },
  switch:    { type: '網路',   color: '#F59E0B' },
  router:    { type: '網路',   color: '#F59E0B' },
  firewall:  { type: '網路',   color: '#F59E0B' },
  network:   { type: '網路',   color: '#F59E0B' },
  storage:   { type: '儲存',   color: '#10B981' },
  nas:       { type: '儲存',   color: '#10B981' },
  san:       { type: '儲存',   color: '#10B981' },
  ups:       { type: '電源',   color: '#EF4444' },
  pdu:       { type: '電源',   color: '#EF4444' },
  power:     { type: '電源',   color: '#EF4444' },
}
const EMPTY_COLOR = '#374151'
const DEFAULT_DEVICE = { type: '其他', color: '#8B5CF6' }

function getDeviceColor(categoryKey: string) {
  return DEVICE_TYPE_MAP[categoryKey]?.color || DEFAULT_DEVICE.color
}

const LEGEND = [
  { label: '伺服器', color: '#3B82F6' },
  { label: '儲存',   color: '#10B981' },
  { label: '網路',   color: '#F59E0B' },
  { label: '電源',   color: '#EF4444' },
  { label: '其他',   color: '#8B5CF6' },
  { label: '空位',   color: EMPTY_COLOR },
]

// ── Rack Thumbnail (floor plan) ──
function RackThumb({ rack, devices, selected, onClick }: {
  rack: Rack; devices: HwAsset[]; selected: boolean; onClick: () => void
}) {
  const totalU = rack.total_u
  const usedU = devices.reduce((s, d) => s + (d.rack_u_size || 1), 0)
  const pct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0

  // Build U slots for thumbnail
  const slots = new Array(totalU).fill(null)
  devices.forEach((d) => {
    if (d.rack_u_start > 0) {
      for (let u = d.rack_u_start; u < d.rack_u_start + (d.rack_u_size || 1); u++) {
        if (u <= totalU) slots[u - 1] = d
      }
    }
  })

  // Group into visual bars (top-down, 2 rows per visual bar for compact view)
  const barCount = Math.ceil(totalU / 2)
  const bars: (string | null)[] = []
  for (let i = 0; i < barCount; i++) {
    const u1 = totalU - i * 2  // top-down
    const u2 = totalU - i * 2 - 1
    const d1 = u1 > 0 ? slots[u1 - 1] : null
    const d2 = u2 > 0 ? slots[u2 - 1] : null
    const d = d1 || d2
    bars.push(d ? getDeviceColor(d.category_key) : null)
  }

  const W = 180, H = 200
  const barH = Math.max(2, Math.min(6, (H - 70) / barCount))
  const barW = W - 40
  const startY = 55

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
        selected
          ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
          : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
      }`}
      style={{ width: W, background: 'var(--color-card)' }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Rack label */}
        <text x="12" y="22" fill="var(--color-text-muted)" fontSize="11" fontFamily="monospace">{rack.name}</text>
        <text x="12" y="42" fill="var(--color-text)" fontSize="14" fontWeight="bold">{rack.label || rack.name}</text>

        {/* Bars */}
        {bars.map((color, i) => (
          <rect
            key={i}
            x={20}
            y={startY + i * (barH + 1)}
            width={barW}
            height={barH}
            rx={1}
            fill={color || EMPTY_COLOR}
            opacity={color ? 0.85 : 0.25}
          />
        ))}

        {/* Usage text */}
        <text x="12" y={H - 12} fill="var(--color-text-muted)" fontSize="11">
          {usedU}U / {totalU}U ({pct}%)
        </text>
      </svg>
    </div>
  )
}

// ── Rack Detail Side View ──
function RackDetail({ rack, devices }: { rack: Rack; devices: HwAsset[] }) {
  const totalU = rack.total_u
  const U_H = 14  // pixels per U
  const RACK_W = 260
  const rackH = totalU * U_H
  const PAD_TOP = 30
  const PAD_BOTTOM = 40
  const svgH = rackH + PAD_TOP + PAD_BOTTOM

  // Sort devices by start_u descending (top of rack = higher U)
  const sorted = [...devices].sort((a, b) => b.rack_u_start - a.rack_u_start)

  // Build occupied map
  const occupied = new Set<number>()
  devices.forEach((d) => {
    for (let u = d.rack_u_start; u < d.rack_u_start + (d.rack_u_size || 1); u++) {
      occupied.add(u)
    }
  })

  const usedU = devices.reduce((s, d) => s + (d.rack_u_size || 1), 0)
  const pct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0

  return (
    <div className="flex flex-col items-center">
      <svg width={RACK_W + 80} height={svgH} viewBox={`0 0 ${RACK_W + 80} ${svgH}`}>
        {/* Rack frame */}
        <rect x={35} y={PAD_TOP} width={RACK_W} height={rackH} rx={4} fill="#1F2937" stroke="#4B5563" strokeWidth={1.5} />

        {/* U number labels (every 5U) */}
        {Array.from({ length: totalU }, (_, i) => i + 1).filter(u => u % 5 === 0 || u === 1 || u === totalU).map((u) => {
          const y = PAD_TOP + rackH - u * U_H + U_H / 2
          return (
            <text key={u} x={18} y={y + 4} fill="#6B7280" fontSize="9" textAnchor="end" fontFamily="monospace">
              {u}
            </text>
          )
        })}

        {/* Empty U slots (subtle lines) */}
        {Array.from({ length: totalU }, (_, i) => i + 1).map((u) => {
          if (occupied.has(u)) return null
          const y = PAD_TOP + rackH - u * U_H
          return (
            <rect key={`empty-${u}`} x={40} y={y + 1} width={RACK_W - 10} height={U_H - 2} rx={1} fill={EMPTY_COLOR} opacity={0.15} />
          )
        })}

        {/* Devices */}
        {sorted.map((d) => {
          if (d.rack_u_start <= 0) return null
          const y = PAD_TOP + rackH - (d.rack_u_start + (d.rack_u_size || 1) - 1) * U_H
          const h = (d.rack_u_size || 1) * U_H - 2
          const color = getDeviceColor(d.category_key)
          return (
            <g key={d.id}>
              <rect x={40} y={y + 1} width={RACK_W - 10} height={h} rx={3} fill={color} opacity={0.8} />
              {/* Device name */}
              {h >= 10 && (
                <text x={50} y={y + h / 2 + 4} fill="white" fontSize="11" fontWeight="500">
                  {d.name}
                </text>
              )}
              {/* Status dot */}
              <circle cx={RACK_W + 15} cy={y + h / 2 + 1} r={4} fill={d.is_active ? '#10B981' : '#6B7280'} />
            </g>
          )
        })}
      </svg>
      <div className="text-sm text-[var(--color-text-muted)] mt-1">
        {rack.name} · {rack.label} · {usedU}U used · {pct}% util
      </div>
    </div>
  )
}

// ── Device List View ──
function DeviceList({ rack, devices }: { rack: Rack; devices: HwAsset[] }) {
  const sorted = [...devices].sort((a, b) => b.rack_u_start - a.rack_u_start)
  return (
    <div className="w-full max-w-md">
      <h3 className="text-sm font-semibold mb-3">{rack.name} · {rack.label} — 設備清單</h3>
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
              <th className="text-left px-3 py-2 font-medium">U</th>
              <th className="text-left px-3 py-2 font-medium">設備</th>
              <th className="text-left px-3 py-2 font-medium">類別</th>
              <th className="text-left px-3 py-2 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 font-mono text-xs">
                  {d.rack_u_start > 0 ? `U${d.rack_u_start}${d.rack_u_size > 1 ? `-${d.rack_u_start + d.rack_u_size - 1}` : ''}` : '—'}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm mr-2" style={{ background: getDeviceColor(d.category_key) }} />
                  {d.name}
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">{d.category_key}</td>
                <td className="px-3 py-2">
                  {d.is_active
                    ? <span className="text-emerald-500 text-xs">● Active</span>
                    : <span className="text-gray-500 text-xs">● Inactive</span>
                  }
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="text-center py-4 text-[var(--color-text-muted)]">此機櫃無設備</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ──
export default function RackDiagramPage() {
  const [racks, setRacks] = useState<Rack[]>([])
  const [assets, setAssets] = useState<HwAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'rack' | 'list'>('rack')

  // Rack CRUD
  const [showRackModal, setShowRackModal] = useState(false)
  const [editingRack, setEditingRack] = useState<Rack | null>(null)
  const [rFormName, setRFormName] = useState('')
  const [rFormLabel, setRFormLabel] = useState('')
  const [rFormRow, setRFormRow] = useState('')
  const [rFormTotalU, setRFormTotalU] = useState(42)
  const [rFormSort, setRFormSort] = useState(0)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: rData }, { data: aData }] = await Promise.all([
      supabase.from('racks').select('*').order('sort_order').order('name'),
      supabase.from('hardware_assets').select('id, name, category_key, model, vendor, ip_address, location, description, is_active, rack_u_start, rack_u_size'),
    ])
    if (rData) setRacks(rData)
    if (aData) setAssets(aData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Group assets by location → rack.name
  const assetsByRack = useMemo(() => {
    const map = new Map<string, HwAsset[]>()
    assets.forEach((a) => {
      if (!a.location) return
      const loc = a.location.trim()
      if (!map.has(loc)) map.set(loc, [])
      map.get(loc)!.push(a)
    })
    return map
  }, [assets])

  // Group racks by row_name
  const racksByRow = useMemo(() => {
    const map = new Map<string, Rack[]>()
    racks.forEach((r) => {
      const row = r.row_name || '未分類'
      if (!map.has(row)) map.set(row, [])
      map.get(row)!.push(r)
    })
    return map
  }, [racks])

  const selectedRack = racks.find((r) => r.id === selectedRackId) || null
  const selectedDevices = selectedRack ? (assetsByRack.get(selectedRack.name) || []) : []

  // Auto-select first rack
  useEffect(() => {
    if (!selectedRackId && racks.length > 0) setSelectedRackId(racks[0].id)
  }, [racks, selectedRackId])

  // ── Rack CRUD ──
  function openNewRack() {
    setEditingRack(null)
    setRFormName(''); setRFormLabel(''); setRFormRow(''); setRFormTotalU(42); setRFormSort(0)
    setShowRackModal(true)
  }

  function openEditRack(r: Rack) {
    setEditingRack(r)
    setRFormName(r.name); setRFormLabel(r.label); setRFormRow(r.row_name); setRFormTotalU(r.total_u); setRFormSort(r.sort_order)
    setShowRackModal(true)
  }

  async function saveRack() {
    if (!rFormName.trim()) { alert('請輸入機櫃編號'); return }
    setSaving(true)
    const payload = { name: rFormName.trim(), label: rFormLabel.trim(), row_name: rFormRow.trim(), total_u: rFormTotalU, sort_order: rFormSort }
    if (editingRack) {
      await supabase.from('racks').update(payload).eq('id', editingRack.id)
    } else {
      await supabase.from('racks').insert(payload)
    }
    setSaving(false)
    setShowRackModal(false)
    fetchData()
  }

  async function removeRack(id: string) {
    if (!confirm('確定刪除此機櫃？（不影響硬體資產）')) return
    await supabase.from('racks').delete().eq('id', id)
    if (selectedRackId === id) setSelectedRackId(null)
    fetchData()
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">機房機櫃圖</h1>
        <button onClick={openNewRack} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增機櫃
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: l.color, opacity: l.label === '空位' ? 0.3 : 0.85 }} />
            <span className="text-xs text-[var(--color-text-muted)]">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6" style={{ minHeight: 500 }}>
        {/* Left: Floor Plan */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3">機房平面圖</h2>
          {racks.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              尚無機櫃，請點擊「新增機櫃」
            </div>
          ) : (
            <div className="space-y-4">
              {[...racksByRow.entries()].map(([rowName, rowRacks]) => (
                <div key={rowName}>
                  {racksByRow.size > 1 && (
                    <p className="text-xs text-[var(--color-text-dim)] mb-2 uppercase tracking-wider font-semibold">{rowName} 列</p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {rowRacks.map((rack) => (
                      <div key={rack.id} className="relative group">
                        <RackThumb
                          rack={rack}
                          devices={assetsByRack.get(rack.name) || []}
                          selected={selectedRackId === rack.id}
                          onClick={() => setSelectedRackId(rack.id)}
                        />
                        {/* Edit/Delete overlay */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openEditRack(rack) }} className="p-1 bg-black/50 rounded hover:bg-black/70">
                            <Pencil className="w-3 h-3 text-white" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeRack(rack.id) }} className="p-1 bg-black/50 rounded hover:bg-red-600/70">
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedRack && (
          <div className="w-[380px] shrink-0">
            {/* View toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setViewMode('rack')}
                className={`px-3 py-1.5 text-sm rounded-lg border flex items-center gap-1.5 transition-colors ${
                  viewMode === 'rack'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'
                }`}
              >
                <Box className="w-3.5 h-3.5" /> 機櫃視圖
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded-lg border flex items-center gap-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'
                }`}
              >
                <List className="w-3.5 h-3.5" /> 設備清單
              </button>
            </div>

            {viewMode === 'rack' ? (
              <RackDetail rack={selectedRack} devices={selectedDevices} />
            ) : (
              <DeviceList rack={selectedRack} devices={selectedDevices} />
            )}
          </div>
        )}
      </div>

      {/* Rack CRUD Modal */}
      <Modal open={showRackModal} onClose={() => setShowRackModal(false)} title={editingRack ? '編輯機櫃' : '新增機櫃'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">機櫃編號 *</label>
              <input value={rFormName} onChange={(e) => setRFormName(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono" placeholder="A-01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">名稱</label>
              <input value={rFormLabel} onChange={(e) => setRFormLabel(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="Web Tier" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">列名</label>
              <input value={rFormRow} onChange={(e) => setRFormRow(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="A" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">總 U 數</label>
              <input type="number" value={rFormTotalU} onChange={(e) => setRFormTotalU(Number(e.target.value))} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" min={1} max={60} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">排序</label>
              <input type="number" value={rFormSort} onChange={(e) => setRFormSort(Number(e.target.value))} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            硬體資產的「位置」欄位需填入機櫃編號（如 A-01），即可自動顯示在機櫃圖中。
            <br />設備的 U 位置請在「硬體管理」中設定 rack_u_start / rack_u_size。
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowRackModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveRack} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              儲存
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
