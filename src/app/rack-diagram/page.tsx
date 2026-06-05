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

  const sorted = [...devices].filter(d => d.rack_u_start > 0).sort((a, b) => b.rack_u_start - a.rack_u_start)

  // Build occupied set
  const occupied = new Set<number>()
  devices.forEach((d) => {
    for (let u = d.rack_u_start; u < d.rack_u_start + (d.rack_u_size || 1); u++) occupied.add(u)
  })

  const W = 185, H = 200
  const rackTop = 54, rackBottom = H - 28
  const rackHeight = rackBottom - rackTop
  const barX = 14, barW = W - 28
  const scale = rackHeight / totalU

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
        <text x="14" y="22" fill="var(--color-text-muted)" fontSize="11" fontFamily="monospace">{rack.name}</text>
        <text x="14" y="44" fill="var(--color-text)" fontSize="15" fontWeight="bold">{rack.label || rack.name}</text>

        {/* Rack inner panel */}
        <rect x={barX - 1} y={rackTop - 1} width={barW + 2} height={rackHeight + 2} rx={3} fill="var(--color-bg)" stroke="var(--color-border)" strokeWidth={0.5} />

        {/* Empty U grid lines */}
        {Array.from({ length: totalU }, (_, i) => i + 1).map((u) => {
          if (occupied.has(u)) return null
          const y = rackBottom - u * scale
          return (
            <line key={`g-${u}`} x1={barX + 1} y1={y + scale * 0.5} x2={barX + barW - 1} y2={y + scale * 0.5} stroke="var(--color-border)" strokeWidth={0.6} opacity={0.5} />
          )
        })}

        {/* Device bars */}
        {sorted.map((d) => {
          const uTop = d.rack_u_start + (d.rack_u_size || 1) - 1
          const y = rackBottom - uTop * scale
          const h = Math.max(3, (d.rack_u_size || 1) * scale - 1.5)
          const color = getDeviceColor(d.category_key)
          return (
            <rect key={d.id} x={barX + 1} y={y + 0.75} width={barW - 2} height={h} rx={1.5} fill={color} opacity={0.92} />
          )
        })}

        {/* Usage text */}
        <text x="14" y={H - 8} fill="var(--color-text-muted)" fontSize="11">
          {usedU}U / {totalU}U ({pct}%)
        </text>
      </svg>
    </div>
  )
}

// ── Rack Detail Side View (3D) ──
function RackDetail({ rack, devices }: { rack: Rack; devices: HwAsset[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const totalU = rack.total_u
  const U_H = 16
  const RACK_W = 260
  const RAIL_W = 16
  const D = 18  // 3D depth
  const rackH = totalU * U_H
  const PAD_TOP = 10
  const PAD_BOTTOM = 50
  const PAD_LEFT = 32
  const svgW = PAD_LEFT + RACK_W + D + 30
  const svgH = rackH + PAD_TOP + PAD_BOTTOM + D

  const sorted = [...devices].sort((a, b) => b.rack_u_start - a.rack_u_start)
  const occupied = new Set<number>()
  devices.forEach((d) => {
    for (let u = d.rack_u_start; u < d.rack_u_start + (d.rack_u_size || 1); u++) occupied.add(u)
  })
  const usedU = devices.reduce((s, d) => s + (d.rack_u_size || 1), 0)
  const pct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0

  const fX = PAD_LEFT
  const fY = PAD_TOP + D
  const devX = fX + RAIL_W + 2
  const devW = RACK_W - RAIL_W * 2 - 4

  function shade(hex: string, amt: number) {
    const n = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.max(0, (n >> 16) + amt))
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xFF) + amt))
    const b = Math.min(255, Math.max(0, (n & 0xFF) + amt))
    return `rgb(${r},${g},${b})`
  }

  const hoveredDev = devices.find((d) => d.id === hoveredId)
  const devTypeLabel = (key: string) => DEVICE_TYPE_MAP[key]?.type || '其他'

  return (
    <div className="flex flex-col items-center relative">
      <svg
        width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
        onMouseLeave={() => setHoveredId(null)}
      >
        <defs>
          <linearGradient id="rk-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1f2e" /><stop offset="100%" stopColor="#0f1219" />
          </linearGradient>
          <linearGradient id="rk-rail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a3f4b" /><stop offset="40%" stopColor="#6B7280" /><stop offset="100%" stopColor="#3a3f4b" />
          </linearGradient>
          <linearGradient id="rk-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a1d24" /><stop offset="100%" stopColor="#0d0f14" />
          </linearGradient>
          <filter id="devShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" /></filter>
        </defs>

        {/* ── 3D Top face ── */}
        <polygon points={`${fX},${fY} ${fX+D},${PAD_TOP} ${fX+RACK_W+D},${PAD_TOP} ${fX+RACK_W},${fY}`} fill="#2a2f3a" stroke="#4B5563" strokeWidth={0.5} />
        {/* ── 3D Right face ── */}
        <polygon points={`${fX+RACK_W},${fY} ${fX+RACK_W+D},${PAD_TOP} ${fX+RACK_W+D},${PAD_TOP+rackH} ${fX+RACK_W},${fY+rackH}`} fill="url(#rk-side)" stroke="#4B5563" strokeWidth={0.5} />
        {/* ── 3D Bottom face ── */}
        <polygon points={`${fX},${fY+rackH} ${fX+D},${fY+rackH-D+D} ${fX+RACK_W+D},${fY+rackH-D+D} ${fX+RACK_W},${fY+rackH}`} fill="#0a0c10" stroke="#374151" strokeWidth={0.5} />

        {/* ── Rack back panel ── */}
        <rect x={fX} y={fY} width={RACK_W} height={rackH} rx={2} fill="url(#rk-back)" stroke="#2d3340" strokeWidth={1.5} />

        {/* ── Inner depth shadow (left/right) ── */}
        <rect x={fX+RAIL_W} y={fY} width={4} height={rackH} fill="black" opacity={0.15} />
        <rect x={fX+RACK_W-RAIL_W-4} y={fY} width={4} height={rackH} fill="black" opacity={0.1} />

        {/* ── Rails ── */}
        <rect x={fX} y={fY} width={RAIL_W} height={rackH} fill="url(#rk-rail)" opacity={0.7} rx={1} />
        <rect x={fX+RACK_W-RAIL_W} y={fY} width={RAIL_W} height={rackH} fill="url(#rk-rail)" opacity={0.7} rx={1} />
        {/* Rail inner edge highlight */}
        <line x1={fX+RAIL_W} y1={fY} x2={fX+RAIL_W} y2={fY+rackH} stroke="#7f8694" strokeWidth={0.5} opacity={0.4} />
        <line x1={fX+RACK_W-RAIL_W} y1={fY} x2={fX+RACK_W-RAIL_W} y2={fY+rackH} stroke="#7f8694" strokeWidth={0.5} opacity={0.4} />

        {/* ── Screw holes ── */}
        {Array.from({ length: totalU }, (_, i) => i + 1).filter(u => u % 3 === 0).map((u) => {
          const cy = fY + rackH - u * U_H + U_H / 2
          return (
            <g key={`s-${u}`}>
              <circle cx={fX + RAIL_W / 2} cy={cy} r={2} fill="#13161c" stroke="#4B5563" strokeWidth={0.4} />
              <circle cx={fX + RACK_W - RAIL_W / 2} cy={cy} r={2} fill="#13161c" stroke="#4B5563" strokeWidth={0.4} />
            </g>
          )
        })}

        {/* ── U labels ── */}
        {Array.from({ length: totalU }, (_, i) => i + 1).filter(u => u % 5 === 0 || u === 1 || u === totalU).map((u) => (
          <text key={u} x={PAD_LEFT - 5} y={fY + rackH - u * U_H + U_H / 2 + 3.5} fill="#6B7280" fontSize="9" textAnchor="end" fontFamily="monospace">{u}</text>
        ))}

        {/* ── Empty slots ── */}
        {Array.from({ length: totalU }, (_, i) => i + 1).map((u) => {
          if (occupied.has(u)) return null
          const y = fY + rackH - u * U_H
          return <rect key={`e-${u}`} x={devX} y={y + 1} width={devW} height={U_H - 2} rx={1} fill="#171b24" opacity={0.6} />
        })}

        {/* ── Devices (3D blocks) ── */}
        {sorted.map((d) => {
          if (d.rack_u_start <= 0) return null
          const y = fY + rackH - (d.rack_u_start + (d.rack_u_size || 1) - 1) * U_H
          const h = (d.rack_u_size || 1) * U_H - 2
          const c = getDeviceColor(d.category_key)
          const gid = `dg-${d.id}`
          const isHover = hoveredId === d.id
          const dd = 6 // device 3D depth

          return (
            <g
              key={d.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                setHoveredId(d.id)
                const rect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect()
                setTooltipPos({ x: e.clientX - rect.left, y: y - 10 })
              }}
              onMouseLeave={() => setHoveredId(null)}
            >
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={shade(c, 50)} />
                  <stop offset="45%" stopColor={c} />
                  <stop offset="100%" stopColor={shade(c, -50)} />
                </linearGradient>
              </defs>

              {/* Device 3D top face */}
              <polygon
                points={`${devX},${y+1} ${devX+dd},${y+1-dd} ${devX+devW+dd},${y+1-dd} ${devX+devW},${y+1}`}
                fill={shade(c, 30)} opacity={0.7}
              />
              {/* Device 3D right face */}
              <polygon
                points={`${devX+devW},${y+1} ${devX+devW+dd},${y+1-dd} ${devX+devW+dd},${y+1-dd+h} ${devX+devW},${y+1+h}`}
                fill={shade(c, -60)} opacity={0.7}
              />

              {/* Device front face */}
              <rect x={devX} y={y + 1} width={devW} height={h} rx={2} fill={`url(#${gid})`}
                filter={isHover ? 'url(#devShadow)' : undefined}
                stroke={isHover ? '#ffffff' : 'rgba(255,255,255,0.08)'}
                strokeWidth={isHover ? 1.5 : 0.5}
              />

              {/* Top highlight strip */}
              <rect x={devX + 2} y={y + 2} width={devW - 4} height={Math.max(2, h * 0.15)} rx={1} fill="white" opacity={0.15} />

              {/* Bottom edge shadow */}
              <rect x={devX} y={y + h - 1} width={devW} height={2} rx={1} fill="black" opacity={0.25} />

              {/* Left handle */}
              <rect x={devX + 4} y={y + 1 + h * 0.25} width={3} height={h * 0.5} rx={1.5} fill="white" opacity={0.18} />
              {/* Right handle */}
              <rect x={devX + devW - 7} y={y + 1 + h * 0.25} width={3} height={h * 0.5} rx={1.5} fill="white" opacity={0.18} />

              {/* Device name */}
              {h >= 12 && (
                <text x={devX + 14} y={y + h / 2 + 4} fill="white" fontSize="11" fontWeight="600" filter="url(#devShadow)">
                  {d.name}
                </text>
              )}

              {/* Status LED */}
              <circle cx={devX + devW - 14} cy={y + h / 2 + 1} r={3.5} fill={d.is_active ? '#10B981' : '#6B7280'} />
              {d.is_active && (
                <circle cx={devX + devW - 14} cy={y + h / 2 + 1} r={5} fill="#10B981" opacity={0.3}>
                  <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          )
        })}

        {/* ── Rack feet ── */}
        <rect x={fX + 2} y={fY + rackH + 1} width={20} height={6} rx={2} fill="#2a2f38" stroke="#374151" strokeWidth={0.5} />
        <rect x={fX + RACK_W - 22} y={fY + rackH + 1} width={20} height={6} rx={2} fill="#2a2f38" stroke="#374151" strokeWidth={0.5} />
      </svg>

      {/* ── Tooltip ── */}
      {hoveredDev && (
        <div
          className="absolute pointer-events-none z-10 bg-gray-900/95 border border-gray-600 rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
          style={{ left: tooltipPos.x + 20, top: tooltipPos.y, maxWidth: 260 }}
        >
          <div className="font-bold text-white mb-1">{hoveredDev.name}</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-gray-300">
            <span className="text-gray-500">類型</span><span>{devTypeLabel(hoveredDev.category_key)}</span>
            <span className="text-gray-500">型號</span><span>{hoveredDev.model || '—'}</span>
            <span className="text-gray-500">廠商</span><span>{hoveredDev.vendor || '—'}</span>
            {hoveredDev.ip_address && <><span className="text-gray-500">IP</span><span className="font-mono">{hoveredDev.ip_address}</span></>}
            <span className="text-gray-500">位置</span><span>U{hoveredDev.rack_u_start}{hoveredDev.rack_u_size > 1 ? `-${hoveredDev.rack_u_start + hoveredDev.rack_u_size - 1}` : ''} ({hoveredDev.rack_u_size}U)</span>
            {hoveredDev.description && <><span className="text-gray-500">說明</span><span>{hoveredDev.description}</span></>}
            <span className="text-gray-500">狀態</span><span>{hoveredDev.is_active ? '🟢 Active' : '⚪ Inactive'}</span>
          </div>
        </div>
      )}

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
