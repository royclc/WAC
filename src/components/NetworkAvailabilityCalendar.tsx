'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Plus, AlertTriangle, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import Modal from './Modal'
import YearMonthPicker from './YearMonthPicker'
import { supabase } from '@/lib/supabase'
import {
  getCalendarDays,
  formatMonthTitle,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  format,
  parseLocalDate,
  WEEKDAYS,
} from '@/lib/calendar-utils'

// ── Types ──

type EventPlanType = 'planned' | 'unplanned'

interface NetworkAsset {
  id: string
  name: string
  unit: string          // org name
  majorCategory: string // 總局, 分局稽徵所
  zone: 'internal' | 'external'
  deviceType: string    // 防火牆, 核心交換器, ...
  quantity: number      // 數量
}

interface Circuit {
  id: string
  unit: string
  circuit_number: string
  bandwidth: string
  ip_address: string
}

interface DowntimeEvent {
  id: string
  asset_id: string
  asset_name: string
  plan_type: EventPlanType
  title: string
  description: string
  start_time: string
  end_time: string
}

// 線路也可以產生事件
interface CircuitEvent {
  id: string
  circuit_id: string
  plan_type: EventPlanType
  title: string
  start_time: string
  end_time: string
}

const PLAN_TYPE_LABELS: Record<EventPlanType, string> = {
  planned: '計畫性',
  unplanned: '非計畫性',
}

const PLAN_TYPE_COLORS: Record<EventPlanType, string> = {
  planned: '#F59E0B',
  unplanned: '#EF4444',
}

const ZONE_LABELS = { internal: '內網', external: '外網' }

const EVENT_TYPE_OPTIONS = ['設備維護', '線路維護', '系統更新', '電力維護', '其他']

// ── Helpers ──

interface AssetStats {
  count: number
  hoursPerDevice: number
  totalHours: number
  plannedHours: number
  unplannedHours: number
  availabilityPct: number
  eventCount: number
}

function calcStats(
  assets: NetworkAsset[],
  events: DowntimeEvent[],
  monthStart: Date,
  monthEnd: Date,
  hoursPerDevice: number,
): AssetStats {
  const count = assets.reduce((sum, a) => sum + a.quantity, 0)
  const totalHours = hoursPerDevice * count
  let plannedMins = 0
  let unplannedMins = 0
  let eventCount = 0

  assets.forEach((asset) => {
    events.filter((e) => e.asset_id === asset.id).forEach((e) => {
      eventCount++
      const eStart = parseLocalDate(e.start_time)
      const eEnd = parseLocalDate(e.end_time)
      const s = eStart < monthStart ? monthStart : eStart
      const ed = eEnd > monthEnd ? monthEnd : eEnd
      if (ed > s) {
        const mins = (ed.getTime() - s.getTime()) / 60000
        if (e.plan_type === 'planned') plannedMins += mins
        else unplannedMins += mins
      }
    })
  })

  const plannedHours = Math.round((plannedMins / 60) * 100) / 100
  const unplannedHours = Math.round((unplannedMins / 60) * 100) / 100
  // 可用率 = (總時數 - 非計畫性時數) / 總時數 * 100%
  const availabilityPct = totalHours > 0
    ? Math.round(((totalHours - unplannedHours) / totalHours) * 10000) / 100
    : 100

  return { count, hoursPerDevice, totalHours, plannedHours, unplannedHours, availabilityPct, eventCount }
}

// ── Component ──

export default function NetworkAvailabilityCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<DowntimeEvent[]>([])
  const [circuitEvents, setCircuitEvents] = useState<CircuitEvent[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'deviceType' | 'unitDetail' | 'unitSummary'>('deviceType')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [networkAssets, setNetworkAssets] = useState<NetworkAsset[]>([])
  const [circuits, setCircuits] = useState<Circuit[]>([])

  const [editingIds, setEditingIds] = useState<string[]>([])  // batch edit: device event IDs
  const [editingCircuitIds, setEditingCircuitIds] = useState<string[]>([])  // batch edit: circuit event IDs
  const [formSelectMode, setFormSelectMode] = useState<'unit' | 'device' | 'circuit'>('unit')
  const [expandCircuits, setExpandCircuits] = useState(true)   // unit mode: circuits section
  const [expandDevices, setExpandDevices] = useState(true)     // unit mode: devices section
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set())  // device/circuit mode: per-unit collapse
  const [formSelectedUnit, setFormSelectedUnit] = useState('')
  const [formSelectedAssets, setFormSelectedAssets] = useState<string[]>([])
  const [formSelectedCircuits, setFormSelectedCircuits] = useState<string[]>([])  // selected circuit IDs
  const [formEventType, setFormEventType] = useState('設備維護')
  const [formPlanType, setFormPlanType] = useState<EventPlanType>('unplanned')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')

  // ── Derived values ──
  const UNITS = useMemo(() => [...new Set(networkAssets.map(a => a.unit))], [networkAssets])

  const days = getCalendarDays(currentMonth)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const hoursPerDevice = daysInMonth * 24
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 1)

  // ── Fetch from Supabase ──

  const fetchAssets = useCallback(async () => {
    const { data, error } = await supabase
      .from('org_devices')
      .select('*, organizations(name, type)')
    if (error) {
      console.error('Failed to fetch org_devices:', error)
      return
    }
    const mapped: NetworkAsset[] = (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      unit: d.organizations?.name || '',
      majorCategory: d.organizations?.type === 'headquarters' ? '總局' : '分局稽徵所',
      zone: d.zone as 'internal' | 'external',
      deviceType: d.device_type,
      quantity: d.quantity,
    }))
    setNetworkAssets(mapped)
  }, [])

  const fetchCircuits = useCallback(async () => {
    const { data, error } = await supabase
      .from('org_circuits')
      .select('*, organizations(name)')
    if (error) {
      console.error('Failed to fetch org_circuits:', error)
      return
    }
    const mapped: Circuit[] = (data || []).map((d: any) => ({
      id: d.id,
      unit: d.organizations?.name || '',
      circuit_number: d.circuit_number,
      bandwidth: d.bandwidth,
      ip_address: d.ip_address || '',
    }))
    setCircuits(mapped)
  }, [])

  const fetchDowntimeEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('downtime_events')
      .select('*')
      .eq('asset_type', 'network')
    if (error) {
      console.error('Failed to fetch downtime_events:', error)
      return
    }
    const mapped: DowntimeEvent[] = (data || []).map((d: any) => ({
      id: d.id,
      asset_id: d.asset_id,
      asset_name: d.asset_name,
      plan_type: d.plan_type as EventPlanType,
      title: d.title,
      description: d.description || '',
      start_time: d.start_time,
      end_time: d.end_time,
    }))
    setEvents(mapped)
  }, [])

  const fetchCircuitEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('circuit_events')
      .select('*')
    if (error) {
      console.error('Failed to fetch circuit_events:', error)
      return
    }
    const mapped: CircuitEvent[] = (data || []).map((d: any) => ({
      id: d.id,
      circuit_id: d.circuit_id,
      plan_type: d.plan_type as EventPlanType,
      title: d.title,
      start_time: d.start_time,
      end_time: d.end_time,
    }))
    setCircuitEvents(mapped)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchAssets(), fetchCircuits(), fetchDowntimeEvents(), fetchCircuitEvents()])
    setLoading(false)
  }, [fetchAssets, fetchCircuits, fetchDowntimeEvents, fetchCircuitEvents])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Event helpers ──

  function getEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => dateStr >= e.start_time.slice(0, 10) && dateStr <= e.end_time.slice(0, 10))
  }

  function getCircuitEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return circuitEvents.filter((e) => dateStr >= e.start_time.slice(0, 10) && dateStr <= e.end_time.slice(0, 10))
  }

  // ═══ Report 1: 設備類型彙總 (Image 3) ═══
  const deviceTypeReport = useMemo(() => {
    const hqZones: Array<{ zone: 'internal' | 'external'; label: string }> = [
      { zone: 'internal', label: '內網' },
      { zone: 'external', label: '外網' },
    ]
    const hqDeviceTypes = ['防火牆', '核心網路交換器', '主機網路交換器', '邊界網路交換器', '聚合網路交換器']
    const branchDeviceTypes = ['防火牆', '前端網路交換器', '聚合網路交換器']

    const rows: Array<{ label: string; stats: AssetStats }> = []

    // 總局 - 內外網各設備類型
    hqZones.forEach(({ zone, label: zoneLabel }) => {
      hqDeviceTypes.forEach((dt) => {
        const matched = networkAssets.filter((a) => a.majorCategory === '總局' && a.zone === zone && a.deviceType === dt)
        if (matched.length > 0) {
          rows.push({ label: `總局${zoneLabel}${dt}`, stats: calcStats(matched, events, monthStart, monthEnd, hoursPerDevice) })
        }
      })
    })

    // 分局稽徵所 - 各設備類型（內外網合計）
    branchDeviceTypes.forEach((dt) => {
      const matched = networkAssets.filter((a) => a.majorCategory === '分局稽徵所' && a.deviceType === dt)
      if (matched.length > 0) {
        rows.push({ label: `分局稽徵所${dt}`, stats: calcStats(matched, events, monthStart, monthEnd, hoursPerDevice) })
      }
    })

    return rows
  }, [currentMonth, events, hoursPerDevice, monthStart, monthEnd, networkAssets])

  // ═══ Report 2: 各單位設備明細 ═══
  const unitDetailReport = useMemo(() => {
    const units = UNITS
    return units.map((unit, idx) => {
      const unitAssets = networkAssets.filter((a) => a.unit === unit)
      const deviceRows = unitAssets.map((asset) => {
        const assetEvents = events.filter((e) => e.asset_id === asset.id)
        let plannedMins = 0
        let unplannedMins = 0
        assetEvents.forEach((e) => {
          const eStart = parseLocalDate(e.start_time)
          const eEnd = parseLocalDate(e.end_time)
          const s = eStart < monthStart ? monthStart : eStart
          const ed = eEnd > monthEnd ? monthEnd : eEnd
          if (ed > s) {
            const mins = (ed.getTime() - s.getTime()) / 60000
            if (e.plan_type === 'planned') plannedMins += mins
            else unplannedMins += mins
          }
        })
        const plannedHours = Math.round((plannedMins / 60) * 100) / 100
        const unplannedHours = Math.round((unplannedMins / 60) * 100) / 100
        const totalH = hoursPerDevice * asset.quantity
        const pct = totalH > 0
          ? Math.round(((totalH - unplannedHours) / totalH) * 10000) / 100
          : 100
        return { asset, plannedHours, unplannedHours, pct }
      })
      return { unit, seq: idx + 1, devices: deviceRows }
    })
  }, [currentMonth, events, hoursPerDevice, monthStart, monthEnd, networkAssets, UNITS])

  // ═══ Report 3: 各單位可用率彙總 — 依電路編號 ═══
  const circuitReport = useMemo(() => {
    const unitList = [...new Set(circuits.map(c => c.unit))]
    return unitList.map((unit, idx) => {
      const unitCircuits = circuits.filter((c) => c.unit === unit)
      const circuitRows = unitCircuits.map((circuit) => {
        const cEvents = circuitEvents.filter((e) => e.circuit_id === circuit.id)
        let plannedMins = 0
        let unplannedMins = 0
        cEvents.forEach((e) => {
          const eStart = parseLocalDate(e.start_time)
          const eEnd = parseLocalDate(e.end_time)
          const s = eStart < monthStart ? monthStart : eStart
          const ed = eEnd > monthEnd ? monthEnd : eEnd
          if (ed > s) {
            const mins = (ed.getTime() - s.getTime()) / 60000
            if (e.plan_type === 'planned') plannedMins += mins
            else unplannedMins += mins
          }
        })
        const plannedHours = Math.round((plannedMins / 60) * 100) / 100
        const unplannedHours = Math.round((unplannedMins / 60) * 100) / 100
        const pct = hoursPerDevice > 0
          ? Math.round(((hoursPerDevice - unplannedHours) / hoursPerDevice) * 10000) / 100
          : 100
        return { circuit, plannedHours, unplannedHours, pct }
      })
      return { unit, seq: idx + 1, circuits: circuitRows }
    })
  }, [currentMonth, circuitEvents, hoursPerDevice, monthStart, monthEnd, circuits])

  function openNewEvent(date?: Date) {
    setEditingIds([])
    setEditingCircuitIds([])
    setFormSelectMode('unit')
    setFormSelectedUnit('')
    setFormSelectedAssets([])
    setFormSelectedCircuits([])
    setExpandCircuits(true)
    setExpandDevices(true)
    setFormEventType('設備維護')
    setFormPlanType('unplanned')
    setFormTitle('')
    setFormDesc('')
    const d = date || new Date()
    setFormStart(`${format(d, 'yyyy-MM-dd')}T00:00`)
    setFormEnd(`${format(d, 'yyyy-MM-dd')}T01:00`)
    setShowModal(true)
  }

  // Open edit for a group of events (same unit + same event signature)
  function openEditEventGroup(deviceEvts: DowntimeEvent[], circuitEvts: CircuitEvent[], unitName: string) {
    setEditingIds(deviceEvts.map((e) => e.id))
    setEditingCircuitIds(circuitEvts.map((e) => e.id))
    const first: DowntimeEvent | CircuitEvent | undefined = deviceEvts[0] || circuitEvts[0]
    if (!first) return
    setFormSelectMode('unit')
    setFormSelectedUnit(unitName)
    setFormSelectedAssets(deviceEvts.map((e) => e.asset_id))
    setFormSelectedCircuits(circuitEvts.map((e) => e.circuit_id))
    setFormEventType(first.title)
    setFormPlanType(first.plan_type)
    setFormTitle(first.title)
    setFormDesc('description' in first ? first.description : '')
    setFormStart(format(parseLocalDate(first.start_time), "yyyy-MM-dd'T'HH:mm"))
    setFormEnd(format(parseLocalDate(first.end_time), "yyyy-MM-dd'T'HH:mm"))
    setShowModal(true)
  }

  async function saveEvent() {
    const hasAssets = formSelectedAssets.length > 0
    const hasCircuits = formSelectedCircuits.length > 0
    if (!hasAssets && !hasCircuits) return
    const effectiveTitle = formTitle || formEventType
    if (!effectiveTitle || !formStart || !formEnd) return
    setSaving(true)

    const isEditing = editingIds.length > 0 || editingCircuitIds.length > 0

    if (isEditing) {
      if (editingIds.length > 0) {
        const { error } = await supabase.from('downtime_events').delete().in('id', editingIds)
        if (error) { console.error(error); setSaving(false); return }
      }
      if (editingCircuitIds.length > 0) {
        const { error } = await supabase.from('circuit_events').delete().in('id', editingCircuitIds)
        if (error) { console.error(error); setSaving(false); return }
      }
    }

    if (hasAssets) {
      const rows = formSelectedAssets.map((assetId) => {
        const asset = networkAssets.find((a) => a.id === assetId)
        return {
          asset_type: 'network', asset_id: assetId, asset_name: asset?.name || '',
          event_type: formEventType, plan_type: formPlanType,
          title: effectiveTitle, description: formDesc, start_time: formStart, end_time: formEnd,
        }
      })
      const { error } = await supabase.from('downtime_events').insert(rows)
      if (error) { console.error(error); setSaving(false); return }
    }

    if (hasCircuits) {
      const cRows = formSelectedCircuits.map((cid) => ({
        circuit_id: cid, plan_type: formPlanType,
        title: formTitle, description: formDesc, start_time: formStart, end_time: formEnd,
      }))
      const { error } = await supabase.from('circuit_events').insert(cRows)
      if (error) { console.error(error); setSaving(false); return }
    }

    await Promise.all([fetchDowntimeEvents(), fetchCircuitEvents()])
    setSaving(false)
    setShowModal(false)
  }

  // Delete a group of device + circuit events
  async function deleteEventGroup(deviceIds: string[], circuitIds: string[]) {
    const total = deviceIds.length + circuitIds.length
    if (!window.confirm(`確定要刪除此事件？（共 ${total} 筆）`)) return
    if (deviceIds.length > 0) {
      const { error } = await supabase.from('downtime_events').delete().in('id', deviceIds)
      if (error) { console.error(error); return }
    }
    if (circuitIds.length > 0) {
      const { error } = await supabase.from('circuit_events').delete().in('id', circuitIds)
      if (error) { console.error(error); return }
    }
    await Promise.all([fetchDowntimeEvents(), fetchCircuitEvents()])
    setShowModal(false)
    setSelectedDate(null)
  }

  function handleUnitChange(unit: string) {
    setFormSelectedUnit(unit)
    if (unit) {
      setFormSelectedAssets(networkAssets.filter((a) => a.unit === unit).map((a) => a.id))
      setFormSelectedCircuits(circuits.filter((c) => c.unit === unit).map((c) => c.id))
    } else {
      setFormSelectedAssets([])
      setFormSelectedCircuits([])
    }
  }

  function toggleAsset(id: string) {
    setFormSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleCircuit(id: string) {
    setFormSelectedCircuits((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []
  const selectedDayCircuitEvents = selectedDate ? (() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return circuitEvents.filter((e) => dateStr >= e.start_time.slice(0, 10) && dateStr <= e.end_time.slice(0, 10))
  })() : []

  const monthTitle = formatMonthTitle(currentMonth)

  // ROC date range for header
  const rocYear = currentMonth.getFullYear() - 1911
  const rocMonth = currentMonth.getMonth() + 1

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--color-text-muted)]">載入資料中...</span>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">網路可用率月曆</h1>
          <button onClick={() => openNewEvent(selectedDate || undefined)}
            className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增事件
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--color-hover)] rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{monthTitle}</h2>
              <YearMonthPicker currentDate={currentMonth} onChange={setCurrentMonth} />
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--color-hover)] rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={`text-center text-sm font-medium py-3 ${i === 0 ? 'text-[var(--color-weekend-sun)]' : i === 6 ? 'text-[var(--color-weekend-sat)]' : 'text-[var(--color-text-muted)]'}`}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              const dayEvents = getEventsForDay(date)
              const dayCircuitEvts = getCircuitEventsForDay(date)
              const inMonth = isSameMonth(date, currentMonth)
              const today = isToday(date)
              const selected = selectedDate && isSameDay(date, selectedDate)
              const hasUnplanned = dayEvents.some((e) => e.plan_type === 'unplanned') || dayCircuitEvts.some((e) => e.plan_type === 'unplanned')
              const hasAnyEvent = dayEvents.length > 0 || dayCircuitEvts.length > 0
              const dow = date.getDay()
              return (
                <div key={idx} onClick={() => setSelectedDate(prev => prev && isSameDay(prev, date) ? null : date)}
                  className={`min-h-[90px] border-b border-r border-[var(--color-border)] p-1.5 cursor-pointer transition-colors ${!inMonth ? 'bg-[var(--color-day-outside)]' : hasUnplanned ? 'bg-[var(--color-danger-dim)]' : hasAnyEvent ? 'bg-[var(--color-warning-dim)]' : 'hover:bg-[var(--color-table-row-hover)]'} ${selected ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-[var(--color-primary)] text-white font-bold' : ''} ${!inMonth ? 'text-[var(--color-text-dim)]' : ''} ${dow === 0 ? 'text-[var(--color-weekend-sun)]' : dow === 6 ? 'text-[var(--color-weekend-sat)]' : ''}`}>{format(date, 'd')}</span>
                    {hasAnyEvent && <AlertTriangle className={`w-4 h-4 ${hasUnplanned ? 'text-[var(--color-weekend-sun)]' : 'text-[var(--color-warning)]'}`} />}
                  </div>
                  <div className="space-y-0.5">
                    {(() => {
                      // 以單位為主顯示，合併設備事件與線路事件
                      const unitMap = new Map<string, { planType: EventPlanType; devEvts: DowntimeEvent[]; cirEvts: CircuitEvent[] }>()
                      dayEvents.forEach((e) => {
                        const asset = networkAssets.find((a) => a.id === e.asset_id)
                        const unitName = asset?.unit || '未知'
                        if (!unitMap.has(unitName)) unitMap.set(unitName, { planType: e.plan_type, devEvts: [], cirEvts: [] })
                        const entry = unitMap.get(unitName)!
                        entry.devEvts.push(e)
                        if (e.plan_type === 'unplanned') entry.planType = 'unplanned'
                      })
                      dayCircuitEvts.forEach((e) => {
                        const circuit = circuits.find((c) => c.id === e.circuit_id)
                        const unitName = circuit?.unit || '未知'
                        if (!unitMap.has(unitName)) unitMap.set(unitName, { planType: e.plan_type, devEvts: [], cirEvts: [] })
                        const entry = unitMap.get(unitName)!
                        entry.cirEvts.push(e)
                        if (e.plan_type === 'unplanned') entry.planType = 'unplanned'
                      })
                      const unitEntries = [...unitMap.entries()]

                      function handleUnitClick(ev: React.MouseEvent, unitName: string, devEvts: DowntimeEvent[], cirEvts: CircuitEvent[]) {
                        ev.stopPropagation()
                        // 按 signature 分群，若只有一群直接開 Modal，多群開 sidebar
                        const nt = (t: string) => format(parseLocalDate(t), "yyyy-MM-dd'T'HH:mm")
                        const sigSet = new Set<string>()
                        devEvts.forEach((e) => sigSet.add(`${nt(e.start_time)}|${nt(e.end_time)}|${e.plan_type}`))
                        cirEvts.forEach((e) => sigSet.add(`${nt(e.start_time)}|${nt(e.end_time)}|${e.plan_type}`))
                        if (sigSet.size === 1) {
                          openEditEventGroup(devEvts, cirEvts, unitName)
                        } else {
                          setSelectedDate(date)
                        }
                      }

                      return (
                        <>
                          {unitEntries.slice(0, 2).map(([unit, { planType, devEvts, cirEvts }]) => (
                            <div key={unit} onClick={(ev) => handleUnitClick(ev, unit, devEvts, cirEvts)}
                              className="text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80" style={{ backgroundColor: PLAN_TYPE_COLORS[planType] }}>{unit}</div>
                          ))}
                          {unitEntries.length > 2 && <div className="text-xs text-[var(--color-text-muted)] px-1">+{unitEntries.length - 2}</div>}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══ Report Tabs ═══ */}
        <div className="flex gap-1 mb-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-1">
          {[
            { key: 'deviceType' as const, label: '設備類型彙總' },
            { key: 'unitDetail' as const, label: '各單位設備明細' },
            { key: 'unitSummary' as const, label: '各單位可用率彙總' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === key ? 'bg-[var(--color-primary)] text-white font-medium' : 'hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="text-xs text-[var(--color-text-muted)] mb-2 px-1">
          計算期間：{rocYear}年{rocMonth}月　｜　可用率 = (本月應服務總時數 − 非計畫性停止服務時間) / 本月應服務總時數 × 100%
        </div>

        {/* ═══ Tab 1: 設備類型彙總 ═══ */}
        {activeTab === 'deviceType' && (
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold">{monthTitle} — 設備類型彙總</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                  <th className="text-left px-4 py-3 font-medium">類別</th>
                  <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">計畫性停止服務<br/>時間累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">非計畫性停止服務<br/>時間累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">停止服務<br/>時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">可用率</th>
                </tr>
              </thead>
              <tbody>
                {deviceTypeReport.map(({ label, stats }) => (
                  <tr key={label} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-header)]">
                    <td className="px-4 py-3 font-medium">{label}</td>
                    <td className="text-right px-4 py-3 font-mono text-xs">{hoursPerDevice}*{stats.count}</td>
                    <td className="text-right px-4 py-3 text-[var(--color-warning)]">{stats.plannedHours}</td>
                    <td className="text-right px-4 py-3 text-[var(--color-danger)]">{stats.unplannedHours}</td>
                    <td className="text-right px-4 py-3 font-semibold">{Number((stats.plannedHours + stats.unplannedHours).toFixed(2))}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`font-semibold ${stats.availabilityPct >= 99.9 ? 'text-[var(--color-success)]' : stats.availabilityPct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                        {stats.availabilityPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Tab 2: 各單位設備明細 ═══ */}
        {activeTab === 'unitDetail' && (
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold">{monthTitle} — 各單位設備明細</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                  <th className="text-left px-4 py-3 font-medium w-12">序號</th>
                  <th className="text-left px-4 py-3 font-medium">單位</th>
                  <th className="text-left px-4 py-3 font-medium">設備名稱</th>
                  <th className="text-left px-4 py-3 font-medium">網路</th>
                  <th className="text-left px-4 py-3 font-medium">設備類型</th>
                  <th className="text-right px-4 py-3 font-medium">數量</th>
                  <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">計畫性停止<br/>服務時間 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">非計畫性停止<br/>服務時間 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">停止服務<br/>時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">可用率</th>
                </tr>
              </thead>
              <tbody>
                {unitDetailReport.map(({ unit, seq, devices }) => (
                  <React.Fragment key={unit}>
                    {devices.map((d, i) => (
                      <tr key={d.asset.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-header)]">
                        {i === 0 && (
                          <>
                            <td className="px-4 py-2.5 text-center font-medium" rowSpan={devices.length}>{seq}</td>
                            <td className="px-4 py-2.5 font-medium" rowSpan={devices.length}>{unit}</td>
                          </>
                        )}
                        <td className="px-4 py-2.5">{d.asset.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${d.asset.zone === 'internal' ? 'bg-[var(--color-badge-blue)] text-[var(--color-badge-blue-text)]' : 'bg-[var(--color-badge-yellow)] text-[var(--color-badge-yellow-text)]'}`}>
                            {ZONE_LABELS[d.asset.zone]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{d.asset.deviceType}</td>
                        <td className="text-right px-4 py-2.5 font-semibold">{d.asset.quantity}</td>
                        <td className="text-right px-4 py-2.5 font-mono text-xs">{d.asset.quantity > 1 ? `${hoursPerDevice}*${d.asset.quantity}` : hoursPerDevice}</td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-warning)]">{d.plannedHours}</td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-danger)]">{d.unplannedHours}</td>
                        <td className="text-right px-4 py-2.5 font-semibold">{Number((d.plannedHours + d.unplannedHours).toFixed(2))}</td>
                        <td className="text-right px-4 py-2.5">
                          <span className={`font-semibold ${d.pct >= 99.9 ? 'text-[var(--color-success)]' : d.pct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                            {d.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Tab 3: 各單位可用率彙總 — 依電路編號 ═══ */}
        {activeTab === 'unitSummary' && (
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold">{monthTitle} — 各單位可用率彙總</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">依單位電路編號分別計算</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                  <th className="text-left px-4 py-3 font-medium w-12">序號</th>
                  <th className="text-left px-4 py-3 font-medium">單位</th>
                  <th className="text-left px-4 py-3 font-medium">電路編號</th>
                  <th className="text-right px-4 py-3 font-medium">電路頻寬<br/>(Mb)</th>
                  <th className="text-left px-4 py-3 font-medium">IP Address</th>
                  <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">計畫性停止<br/>服務時間<br/>累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">非計畫性停止<br/>服務時間<br/>累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">停止服務<br/>時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">可用率</th>
                </tr>
              </thead>
              <tbody>
                {circuitReport.map(({ unit, seq, circuits: unitCircuits }) => (
                  <React.Fragment key={unit}>
                    {unitCircuits.map((row, i) => (
                      <tr key={row.circuit.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-header)]">
                        {i === 0 && (
                          <>
                            <td className="px-4 py-2.5 text-center font-medium border-r border-[var(--color-border)]" rowSpan={unitCircuits.length}>{seq}</td>
                            <td className="px-4 py-2.5 font-medium border-r border-[var(--color-border)]" rowSpan={unitCircuits.length}>{unit}</td>
                          </>
                        )}
                        <td className="px-4 py-2.5 font-mono">{row.circuit.circuit_number}</td>
                        <td className="text-right px-4 py-2.5">{row.circuit.bandwidth}</td>
                        <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{row.circuit.ip_address || ''}</td>
                        <td className="text-right px-4 py-2.5">{hoursPerDevice}</td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-warning)]">{row.plannedHours}</td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-danger)]">{row.unplannedHours}</td>
                        <td className="text-right px-4 py-2.5 font-semibold">{Number((row.plannedHours + row.unplannedHours).toFixed(2))}</td>
                        <td className="text-right px-4 py-2.5">
                          <span className={`font-semibold ${row.pct >= 99.9 ? 'text-[var(--color-success)]' : row.pct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                            {row.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quarterly event list */}
        {(() => {
          function getQuarterRange(refDate: Date): { start: Date; end: Date; rocYear: number; quarter: number } {
            const y = refDate.getFullYear()
            const m = refDate.getMonth()
            const d = refDate.getDate()

            let quarter: number
            let start: Date
            let end: Date

            if ((m === 11 && d >= 26) || m <= 1 || (m === 2 && d <= 25)) {
              quarter = 1
              const startYear = m === 11 ? y : y - 1
              start = new Date(startYear, 11, 26)
              end = new Date(startYear + 1, 2, 25, 23, 59, 59)
            } else if ((m === 2 && d >= 26) || m === 3 || m === 4 || (m === 5 && d <= 25)) {
              quarter = 2
              start = new Date(y, 2, 26)
              end = new Date(y, 5, 25, 23, 59, 59)
            } else if ((m === 5 && d >= 26) || m === 6 || m === 7 || (m === 8 && d <= 25)) {
              quarter = 3
              start = new Date(y, 5, 26)
              end = new Date(y, 8, 25, 23, 59, 59)
            } else {
              quarter = 4
              start = new Date(y, 8, 26)
              end = new Date(y, 11, 25, 23, 59, 59)
            }

            const rocYear2 = end.getFullYear() - 1911
            return { start, end, rocYear: rocYear2, quarter }
          }

          const { start: qStart, end: qEnd, rocYear: qRocYear, quarter } = getQuarterRange(currentMonth)

          // Device events in quarter
          const quarterDeviceEvents = events.filter((e) => {
            const eStart = parseLocalDate(e.start_time)
            const eEnd = parseLocalDate(e.end_time)
            return eStart <= qEnd && eEnd >= qStart
          })

          // Circuit events in quarter
          const quarterCircuitEvents = circuitEvents.filter((e) => {
            const eStart = parseLocalDate(e.start_time)
            const eEnd = parseLocalDate(e.end_time)
            return eStart <= qEnd && eEnd >= qStart
          })

          function formatROCDateTime(dtStr: string) {
            const dt = parseLocalDate(dtStr)
            const mm = String(dt.getMonth() + 1).padStart(2, '0')
            const dd = String(dt.getDate()).padStart(2, '0')
            const hh = String(dt.getHours()).padStart(2, '0')
            const min = String(dt.getMinutes()).padStart(2, '0')
            return `${mm}/${dd} ${hh}:${min}`
          }

          const hasEvents = quarterDeviceEvents.length > 0 || quarterCircuitEvents.length > 0

          return (
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-[var(--color-border)]">
                <h3 className="font-semibold">{qRocYear}年第{quarter}季 — 計畫性與非計畫性事件列表</h3>
              </div>
              {!hasEvents ? (
                <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">本季無事件記錄</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                      <th className="text-left px-4 py-3 font-medium">類型</th>
                      <th className="text-left px-4 py-3 font-medium">事件性質</th>
                      <th className="text-left px-4 py-3 font-medium">設備/線路名稱</th>
                      <th className="text-left px-4 py-3 font-medium">開始時間</th>
                      <th className="text-left px-4 py-3 font-medium">結束時間</th>
                      <th className="text-right px-4 py-3 font-medium">停止服務<br/>時數 (hrs)</th>
                      <th className="text-left px-4 py-3 font-medium">說明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterDeviceEvents.map((e) => {
                      const stopHours = Number(((parseLocalDate(e.end_time).getTime() - parseLocalDate(e.start_time).getTime()) / 3600000).toFixed(2))
                      return (
                      <tr key={`d-${e.id}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-header)]">
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-badge-blue)] text-[var(--color-badge-blue-text)]">設備</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PLAN_TYPE_COLORS[e.plan_type] }}>
                            {PLAN_TYPE_LABELS[e.plan_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{e.asset_name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.start_time)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.end_time)}</td>
                        <td className="text-right px-4 py-3 font-semibold">{stopHours}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{e.description || e.title || '-'}</td>
                      </tr>
                      )
                    })}
                    {quarterCircuitEvents.map((e) => {
                      const circuit = circuits.find((c) => c.id === e.circuit_id)
                      const stopHours = Number(((parseLocalDate(e.end_time).getTime() - parseLocalDate(e.start_time).getTime()) / 3600000).toFixed(2))
                      return (
                        <tr key={`c-${e.id}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-header)]">
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-badge-yellow)] text-[var(--color-badge-yellow-text)]">線路</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PLAN_TYPE_COLORS[e.plan_type] }}>
                              {PLAN_TYPE_LABELS[e.plan_type]}
                            </span>
                          </td>
                          <td className="px-4 py-3">{circuit ? `${circuit.unit} ${circuit.circuit_number}` : e.circuit_id}</td>
                          <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.start_time)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.end_time)}</td>
                          <td className="text-right px-4 py-3 font-semibold">{stopHours}</td>
                          <td className="px-4 py-3 text-[var(--color-text-muted)]">{e.title || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )
        })()}
      </div>

      {/* Day detail sidebar — grouped by unit + event signature */}
      {selectedDate && (
        <div className="w-80 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 h-fit sticky top-6">
          <h3 className="font-semibold mb-3">{format(selectedDate, 'yyyy/MM/dd')}</h3>
          {selectedDayEvents.length === 0 && selectedDayCircuitEvents.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-success)]">
              <CheckCircle className="w-4 h-4" /> 當日無事件
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                // Group by unit + normalized start/end + plan_type (不含 title，避免設備與線路 title 不同導致分群)
                interface UnitEventGroup { unit: string; deviceEvents: DowntimeEvent[]; circuitEvts: CircuitEvent[]; key: string }
                const groupMap = new Map<string, UnitEventGroup>()
                const normTime = (t: string) => format(parseLocalDate(t), "yyyy-MM-dd'T'HH:mm")

                selectedDayEvents.forEach((e) => {
                  const asset = networkAssets.find((a) => a.id === e.asset_id)
                  const unitName = asset?.unit || '未知'
                  const sig = `${unitName}|${normTime(e.start_time)}|${normTime(e.end_time)}|${e.plan_type}`
                  if (!groupMap.has(sig)) groupMap.set(sig, { unit: unitName, deviceEvents: [], circuitEvts: [], key: sig })
                  groupMap.get(sig)!.deviceEvents.push(e)
                })

                selectedDayCircuitEvents.forEach((e) => {
                  const circuit = circuits.find((c) => c.id === e.circuit_id)
                  const unitName = circuit?.unit || '未知'
                  const sig = `${unitName}|${normTime(e.start_time)}|${normTime(e.end_time)}|${e.plan_type}`
                  if (!groupMap.has(sig)) groupMap.set(sig, { unit: unitName, deviceEvents: [], circuitEvts: [], key: sig })
                  groupMap.get(sig)!.circuitEvts.push(e)
                })

                return [...groupMap.values()].map(({ unit, deviceEvents: devEvts, circuitEvts: cirEvts, key }) => {
                  const first: DowntimeEvent | CircuitEvent = devEvts[0] || cirEvts[0]
                  const deviceIds = devEvts.map((e) => e.id)
                  const circuitIds = cirEvts.map((e) => e.id)
                  const countParts: string[] = []
                  if (devEvts.length > 0) countParts.push(`${devEvts.length} 台設備`)
                  if (cirEvts.length > 0) countParts.push(`${cirEvts.length} 條線路`)
                  return (
                    <div key={key} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-[var(--color-table-header)] flex items-center justify-between">
                        <span className="text-sm font-semibold">{unit}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{countParts.join('、')}</span>
                      </div>
                      <div className="px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PLAN_TYPE_COLORS[first.plan_type] }}>
                            {PLAN_TYPE_LABELS[first.plan_type]}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => openEditEventGroup(devEvts, cirEvts, unit)} className="text-[var(--color-primary)] hover:underline text-xs">編輯</button>
                            <button onClick={() => deleteEventGroup(deviceIds, circuitIds)} className="text-[var(--color-text-muted)] hover:text-[var(--color-weekend-sun)] text-xs">刪除</button>
                          </div>
                        </div>
                        <div className="font-medium text-sm mt-1">{first.title}</div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-1">{format(parseLocalDate(first.start_time), 'yyyy/MM/dd HH:mm')} ~ {format(parseLocalDate(first.end_time), 'yyyy/MM/dd HH:mm')}</div>
                        {'description' in first && first.description && <div className="text-xs text-[var(--color-text-muted)] mt-1">{first.description}</div>}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
          <button onClick={() => openNewEvent(selectedDate)} className="w-full mt-3 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-table-header)]">+ 新增事件</button>
        </div>
      )}

      {/* New Event Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingIds.length > 0 || editingCircuitIds.length > 0 ? '編輯網路事件' : '新增網路事件'}>
        <div className="space-y-4">
          {/* 選擇方式 toggle */}
          <div>
            <label className="block text-sm font-medium mb-1">選擇方式</label>
            <div className="flex gap-2">
              {([['unit', '依單位'], ['device', '依設備'], ['circuit', '依線路']] as const).map(([k, v]) => (
                <button key={k} onClick={() => { setFormSelectMode(k); setFormSelectedUnit(''); setFormSelectedAssets([]); setFormSelectedCircuits([]); setExpandCircuits(true); setExpandDevices(true); setCollapsedUnits(new Set()) }}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${formSelectMode === k ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* ═══ 依單位模式 ═══ */}
          {formSelectMode === 'unit' && (
            <div>
              <label className="block text-sm font-medium mb-1">單位 *</label>
              <select value={formSelectedUnit} onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                <option value="">— 請選擇單位 —</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              {formSelectedUnit && (() => {
                const unitAssets = networkAssets.filter((a) => a.unit === formSelectedUnit)
                const unitCircs = circuits.filter((c) => c.unit === formSelectedUnit)
                const zones = [...new Set(unitAssets.map((a) => a.zone))] as Array<'internal' | 'external'>
                return (
                  <div className="mt-2 border border-[var(--color-border)] rounded-lg max-h-64 overflow-y-auto">
                    {/* 線路（上方） */}
                    {unitCircs.length > 0 && (
                      <div className="border-b border-[var(--color-border)]">
                        <button type="button" onClick={() => setExpandCircuits(!expandCircuits)}
                          className="w-full flex items-center gap-1 px-3 py-2 text-sm font-medium hover:bg-[var(--color-hover)] transition-colors">
                          {expandCircuits ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          線路 ({formSelectedCircuits.length}/{unitCircs.length})
                        </button>
                        {expandCircuits && (
                          <div className="px-3 pb-2 space-y-0.5">
                            {unitCircs.map((c) => (
                              <label key={c.id} className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-[var(--color-table-header)] rounded px-1">
                                <input type="checkbox" checked={formSelectedCircuits.includes(c.id)} onChange={() => toggleCircuit(c.id)} className="rounded border-gray-300" />
                                <span>{c.circuit_number}{c.bandwidth ? ` (${c.bandwidth})` : ''}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* 設備（下方） */}
                    <div>
                      <button type="button" onClick={() => setExpandDevices(!expandDevices)}
                        className="w-full flex items-center gap-1 px-3 py-2 text-sm font-medium hover:bg-[var(--color-hover)] transition-colors">
                        {expandDevices ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        設備 ({formSelectedAssets.length}/{unitAssets.length})
                      </button>
                      {expandDevices && (
                        <div className="px-3 pb-2 space-y-1">
                          {zones.map((zone) => (
                            <div key={zone}>
                              <div className="text-xs font-medium text-[var(--color-text-muted)] mb-1">{ZONE_LABELS[zone]}</div>
                              {unitAssets.filter((a) => a.zone === zone).map((a) => (
                                <label key={a.id} className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-[var(--color-table-header)] rounded px-1">
                                  <input type="checkbox" checked={formSelectedAssets.includes(a.id)} onChange={() => toggleAsset(a.id)} className="rounded border-gray-300" />
                                  <span>{a.name}</span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ═══ 依設備模式 ═══ */}
          {formSelectMode === 'device' && (
            <div>
              <div className="text-sm font-medium mb-1">設備 (已選 {formSelectedAssets.length})</div>
              <div className="border border-[var(--color-border)] rounded-lg max-h-64 overflow-y-auto">
                {UNITS.map((unit) => {
                  const unitAssets = networkAssets.filter((a) => a.unit === unit)
                  const zones = [...new Set(unitAssets.map((a) => a.zone))] as Array<'internal' | 'external'>
                  const isOpen = !collapsedUnits.has(`d-${unit}`)
                  const selectedCount = unitAssets.filter((a) => formSelectedAssets.includes(a.id)).length
                  return (
                    <div key={unit} className="border-b border-[var(--color-border)] last:border-b-0">
                      <button type="button" onClick={() => setCollapsedUnits(prev => { const s = new Set(prev); s.has(`d-${unit}`) ? s.delete(`d-${unit}`) : s.add(`d-${unit}`); return s })}
                        className="w-full flex items-center gap-1 px-3 py-2 text-sm font-semibold hover:bg-[var(--color-hover)] transition-colors">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {unit}
                        <span className="text-xs font-normal text-[var(--color-text-muted)] ml-auto">{selectedCount}/{unitAssets.length}</span>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-2 space-y-1">
                          {zones.map((zone) => (
                            <div key={zone}>
                              <div className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5 ml-1">{ZONE_LABELS[zone]}</div>
                              {unitAssets.filter((a) => a.zone === zone).map((a) => (
                                <label key={a.id} className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-[var(--color-table-header)] rounded px-1 ml-1">
                                  <input type="checkbox" checked={formSelectedAssets.includes(a.id)} onChange={() => toggleAsset(a.id)} className="rounded border-gray-300" />
                                  <span>{a.name}</span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══ 依線路模式 ═══ */}
          {formSelectMode === 'circuit' && (
            <div>
              <div className="text-sm font-medium mb-1">線路 (已選 {formSelectedCircuits.length})</div>
              <div className="border border-[var(--color-border)] rounded-lg max-h-64 overflow-y-auto">
                {[...new Set(circuits.map((c) => c.unit))].map((unit) => {
                  const unitCircs = circuits.filter((c) => c.unit === unit)
                  const isOpen = !collapsedUnits.has(`c-${unit}`)
                  const selectedCount = unitCircs.filter((c) => formSelectedCircuits.includes(c.id)).length
                  return (
                    <div key={unit} className="border-b border-[var(--color-border)] last:border-b-0">
                      <button type="button" onClick={() => setCollapsedUnits(prev => { const s = new Set(prev); s.has(`c-${unit}`) ? s.delete(`c-${unit}`) : s.add(`c-${unit}`); return s })}
                        className="w-full flex items-center gap-1 px-3 py-2 text-sm font-semibold hover:bg-[var(--color-hover)] transition-colors">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {unit}
                        <span className="text-xs font-normal text-[var(--color-text-muted)] ml-auto">{selectedCount}/{unitCircs.length}</span>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-2 space-y-0.5">
                          {unitCircs.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 py-0.5 text-sm cursor-pointer hover:bg-[var(--color-table-header)] rounded px-1 ml-1">
                              <input type="checkbox" checked={formSelectedCircuits.includes(c.id)} onChange={() => toggleCircuit(c.id)} className="rounded border-gray-300" />
                              <span>{c.circuit_number}{c.bandwidth ? ` (${c.bandwidth})` : ''}{c.ip_address ? ` — ${c.ip_address}` : ''}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 事件類型 */}
          <div>
            <label className="block text-sm font-medium mb-1">事件類型 *</label>
            <select value={formEventType} onChange={(e) => { const v = e.target.value; if (!formTitle || EVENT_TYPE_OPTIONS.includes(formTitle)) setFormTitle(v); setFormEventType(v) }}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {EVENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">事件性質 *</label>
            <div className="flex gap-2">
              {Object.entries(PLAN_TYPE_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setFormPlanType(k as EventPlanType)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${formPlanType === k ? (k === 'planned' ? 'bg-[var(--color-warning-dim)] border-[var(--color-warning)] text-[var(--color-warning)]' : 'bg-[var(--color-danger-dim)] border-[var(--color-danger)] text-[var(--color-danger)]') : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">事件標題 *</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex items-center gap-4 mb-1">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={formStart.endsWith('T00:00') && formEnd.endsWith('T23:59')} onChange={(e) => { if (e.target.checked) { const d = formStart.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'); setFormStart(`${d}T00:00`); setFormEnd(`${d}T23:59`) } }} className="rounded" />
              全天
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={formStart.endsWith('T08:30') && formEnd.endsWith('T12:00')} onChange={(e) => { if (e.target.checked) { const d = formStart.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'); setFormStart(`${d}T08:30`); setFormEnd(`${d}T12:00`) } }} className="rounded" />
              上午
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={formStart.endsWith('T13:30') && formEnd.endsWith('T17:30')} onChange={(e) => { if (e.target.checked) { const d = formStart.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'); setFormStart(`${d}T13:30`); setFormEnd(`${d}T17:30`) } }} className="rounded" />
              下午
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">開始時間 *</label>
              <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">結束時間 *</label>
              <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 pt-2">
            {(editingIds.length > 0 || editingCircuitIds.length > 0) && (
              <button onClick={() => deleteEventGroup(editingIds, editingCircuitIds.length > 0 ? editingCircuitIds : [])} disabled={saving} className="px-4 py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger-dim)] flex items-center gap-1 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 刪除
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-table-header)]">取消</button>
            <button onClick={saveEvent} disabled={(formSelectedAssets.length === 0 && formSelectedCircuits.length === 0) || saving}
              className={`px-4 py-2 text-sm rounded-lg flex items-center gap-1 ${(formSelectedAssets.length > 0 || formSelectedCircuits.length > 0) && !saving ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]' : 'bg-[var(--color-border)] text-[var(--color-text-dim)] cursor-not-allowed'}`}>
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {editingIds.length > 0 || editingCircuitIds.length > 0 ? '更新' : `儲存${(formSelectedAssets.length + formSelectedCircuits.length) > 1 ? ` (${formSelectedAssets.length + formSelectedCircuits.length} 筆)` : ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
