'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
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
  WEEKDAYS,
} from '@/lib/calendar-utils'
import type { AssetType } from '@/types/database'

interface DowntimeEvent {
  id: string
  asset_type: string
  asset_id: string
  asset_name: string
  event_type: 'downtime' | 'maintenance' | 'other'
  plan_type: string | null
  title: string
  description: string
  start_time: string
  end_time: string
}

interface AssetOption {
  id: string
  name: string
  ip_address: string
  group?: string
  category?: string
}

interface AvailabilityCalendarProps {
  assetType: AssetType
  typeName: string
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  downtime: '斷線',
  maintenance: '維護',
  other: '其他',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  downtime: '#EF4444',
  maintenance: '#F59E0B',
  other: '#6B7280',
}

type EventPlanType = 'planned' | 'unplanned'

const PLAN_TYPE_LABELS: Record<EventPlanType, string> = {
  planned: '計畫性',
  unplanned: '非計畫性',
}

const PLAN_TYPE_COLORS: Record<EventPlanType, string> = {
  planned: '#F59E0B',
  unplanned: '#EF4444',
}

export default function AvailabilityCalendar({ assetType, typeName }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<DowntimeEvent[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allAssets, setAllAssets] = useState<AssetOption[]>([])

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formAsset, setFormAsset] = useState('')
  const [formType, setFormType] = useState<'downtime' | 'maintenance' | 'other'>('downtime')
  const [formPlanType, setFormPlanType] = useState<EventPlanType>('unplanned')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')

  // ── Fetch assets ──
  const fetchAssets = useCallback(async () => {
    if (assetType === 'server') {
      // Fetch hardware_assets + hardware_categories for group label
      const [{ data: assets }, { data: cats }] = await Promise.all([
        supabase
          .from('hardware_assets')
          .select('id, name, category_key, ip_address, is_active')
          .eq('is_active', true),
        supabase
          .from('hardware_categories')
          .select('key, label')
          .order('sort_order'),
      ])

      const catMap = new Map((cats || []).map((c) => [c.key, c.label]))

      setAllAssets(
        (assets || []).map((a) => ({
          id: a.id,
          name: a.name,
          ip_address: a.ip_address || '',
          group: catMap.get(a.category_key) || a.category_key,
          category: a.category_key,
        }))
      )
    } else {
      // Network: fetch org_devices joined with organizations
      const [{ data: devices }, { data: orgs }] = await Promise.all([
        supabase.from('org_devices').select('id, org_id, name, zone, device_type, vendor, quantity'),
        supabase.from('organizations').select('id, name'),
      ])

      const orgMap = new Map((orgs || []).map((o) => [o.id, o.name]))

      setAllAssets(
        (devices || []).map((d) => ({
          id: d.id,
          name: d.name,
          ip_address: '',
          group: `${orgMap.get(d.org_id) || '未知'}-${d.zone === 'internal' ? '內網' : '外網'}`,
        }))
      )
    }
  }, [assetType])

  // ── Fetch events ──
  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('downtime_events')
      .select('id, asset_type, asset_id, asset_name, event_type, plan_type, title, description, start_time, end_time')
      .eq('asset_type', assetType)

    if (data) {
      setEvents(data as DowntimeEvent[])
    }
  }, [assetType])

  // ── Init ──
  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      await Promise.all([fetchAssets(), fetchEvents()])
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [fetchAssets, fetchEvents])

  // 硬體可用率只計算 x86 伺服器
  const assets = assetType === 'server' ? allAssets.filter((a) => a.category === 'x86_server') : allAssets
  const days = getCalendarDays(currentMonth)

  function getEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => {
      const start = e.start_time.slice(0, 10)
      const end = e.end_time.slice(0, 10)
      return dateStr >= start && dateStr <= end
    })
  }

  // Monthly stats
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const totalHours = daysInMonth * 24

    const assetStats = assets.map((asset) => {
      const assetEvents = events.filter((e) => e.asset_id === asset.id)
      let plannedMinutes = 0
      let unplannedMinutes = 0

      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 1)

      assetEvents.forEach((e) => {
        const eStart = new Date(e.start_time)
        const eEnd = new Date(e.end_time)
        const effectiveStart = eStart < monthStart ? monthStart : eStart
        const effectiveEnd = eEnd > monthEnd ? monthEnd : eEnd
        if (effectiveEnd > effectiveStart) {
          const mins = (effectiveEnd.getTime() - effectiveStart.getTime()) / 60000
          if (e.plan_type === 'planned') plannedMinutes += mins
          else unplannedMinutes += mins
        }
      })

      const plannedHours = Math.round((plannedMinutes / 60) * 100) / 100
      const unplannedHours = Math.round((unplannedMinutes / 60) * 100) / 100
      const downtimeHours = Math.round((plannedHours + unplannedHours) * 100) / 100
      const pct = totalHours > 0 ? Math.round(((totalHours - unplannedHours) / totalHours) * 10000) / 100 : 100

      return { asset, plannedHours, unplannedHours, downtimeHours, totalHours, pct, eventCount: assetEvents.length }
    })

    return assetStats
  }, [currentMonth, events, assets])

  function openNewEvent(date?: Date) {
    setEditingId(null)
    setFormAsset(assets[0]?.id || '')
    setFormType('downtime')
    setFormPlanType('unplanned')
    setFormTitle('')
    setFormDesc('')
    const d = date || new Date()
    setFormStart(`${format(d, 'yyyy-MM-dd')}T00:00`)
    setFormEnd(`${format(d, 'yyyy-MM-dd')}T01:00`)
    setShowModal(true)
  }

  function openEditEvent(e: DowntimeEvent) {
    setEditingId(e.id)
    setFormAsset(e.asset_id)
    setFormType(e.event_type)
    setFormPlanType((e.plan_type as EventPlanType) || 'unplanned')
    setFormTitle(e.title)
    setFormDesc(e.description)
    setFormStart(e.start_time.includes('T') ? e.start_time.slice(0, 16) : e.start_time)
    setFormEnd(e.end_time.includes('T') ? e.end_time.slice(0, 16) : e.end_time)
    setShowModal(true)
  }

  async function saveEvent() {
    if (!formAsset || !formTitle || !formStart || !formEnd) return
    const asset = allAssets.find((a) => a.id === formAsset)
    setSaving(true)

    if (editingId) {
      const { error } = await supabase.from('downtime_events').update({
        asset_id: formAsset,
        asset_name: asset?.name || '',
        event_type: formType,
        plan_type: formPlanType,
        title: formTitle,
        description: formDesc,
        start_time: formStart,
        end_time: formEnd,
      }).eq('id', editingId)
      setSaving(false)
      if (!error) { await fetchEvents(); setShowModal(false) }
    } else {
      const { error } = await supabase.from('downtime_events').insert({
        asset_type: assetType,
        asset_id: formAsset,
        asset_name: asset?.name || '',
        event_type: formType,
        plan_type: formPlanType,
        title: formTitle,
        description: formDesc,
        start_time: formStart,
        end_time: formEnd,
      })
      setSaving(false)
      if (!error) { await fetchEvents(); setShowModal(false) }
    }
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase.from('downtime_events').delete().eq('id', id)
    if (!error) {
      await fetchEvents()
    }
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-[var(--color-text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        載入中...
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{typeName}可用率月曆</h1>
          <button
            onClick={() => openNewEvent(selectedDate || undefined)}
            className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1"
          >
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
              <h2 className="text-lg font-semibold">{formatMonthTitle(currentMonth)}</h2>
              <YearMonthPicker currentDate={currentMonth} onChange={setCurrentMonth} />
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[var(--color-hover)] rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={`text-center text-sm font-medium py-3 ${i === 0 ? 'text-[var(--color-weekend-sun)]' : i === 6 ? 'text-[var(--color-weekend-sat)]' : 'text-[var(--color-text-muted)]'}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              const dayEvents = getEventsForDay(date)
              const inMonth = isSameMonth(date, currentMonth)
              const today = isToday(date)
              const selected = selectedDate && isSameDay(date, selectedDate)
              const hasUnplanned = dayEvents.some((e) => e.plan_type === 'unplanned')
              const dayOfWeek = date.getDay()

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(prev => prev && isSameDay(prev, date) ? null : date)}
                  className={`min-h-[90px] border-b border-r border-[var(--color-border)] p-1.5 cursor-pointer transition-colors ${
                    !inMonth ? 'bg-[var(--color-bg-elevated)]' : hasUnplanned ? 'bg-[var(--color-badge-red)]/50' : dayEvents.length > 0 ? 'bg-[var(--color-warning)]/10' : 'hover:bg-[var(--color-primary-dim)]'
                  } ${selected ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-[var(--color-primary)] text-white font-bold' : ''} ${!inMonth ? 'text-[var(--color-text-dim)]' : ''} ${dayOfWeek === 0 ? 'text-[var(--color-weekend-sun)]' : dayOfWeek === 6 ? 'text-[var(--color-weekend-sat)]' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <AlertTriangle className={`w-4 h-4 ${hasUnplanned ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`} />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="text-xs px-1 py-0.5 rounded truncate text-white" style={{ backgroundColor: PLAN_TYPE_COLORS[(e.plan_type as EventPlanType) || 'unplanned'] }}>
                        {e.asset_name}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-[var(--color-text-muted)] px-1">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly availability stats */}
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h3 className="font-semibold">{formatMonthTitle(currentMonth)} — 可用率統計</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                <th className="text-left px-4 py-3 font-medium">設備名稱</th>
                {assets.some((a) => a.group) && <th className="text-left px-4 py-3 font-medium">單位</th>}
                <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數 (hrs)</th>
                <th className="text-right px-4 py-3 font-medium">計畫性停止<br/>服務時間 (hrs)</th>
                <th className="text-right px-4 py-3 font-medium">非計畫性停止<br/>服務時間 (hrs)</th>
                <th className="text-right px-4 py-3 font-medium">停止服務<br/>時數 (hrs)</th>
                <th className="text-right px-4 py-3 font-medium">可用率</th>
              </tr>
            </thead>
            <tbody>
              {monthStats.map(({ asset, totalHours, plannedHours, unplannedHours, downtimeHours, pct }) => (
                <tr key={asset.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{asset.name}</div>
                    {asset.ip_address && <div className="text-xs text-[var(--color-text-muted)]">{asset.ip_address}</div>}
                  </td>
                  {assets.some((a) => a.group) && <td className="px-4 py-3 text-sm">{asset.group || '-'}</td>}
                  <td className="text-right px-4 py-3">{totalHours}</td>
                  <td className="text-right px-4 py-3 text-[var(--color-warning)]">{plannedHours}</td>
                  <td className="text-right px-4 py-3 text-[var(--color-danger)]">{unplannedHours}</td>
                  <td className="text-right px-4 py-3 font-semibold">{downtimeHours}</td>
                  <td className="text-right px-4 py-3">
                    <span className={`font-semibold ${pct >= 99.9 ? 'text-[var(--color-badge-green-text)]' : pct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quarterly event list */}
        {(() => {
          // Quarter boundaries use the 26th of each month
          function getQuarterRange(refDate: Date): { start: Date; end: Date; rocYear: number; quarter: number } {
            const y = refDate.getFullYear()
            const m = refDate.getMonth() // 0-based
            const d = refDate.getDate()

            // Determine which quarter the refDate falls in
            // Q1: 12/26 (prev year) ~ 3/25, Q2: 3/26 ~ 6/25, Q3: 6/26 ~ 9/25, Q4: 9/26 ~ 12/25
            let quarter: number
            let start: Date
            let end: Date

            // Use month + day to determine quarter
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

            // ROC year is based on the end date's year
            const rocYear = end.getFullYear() - 1911

            return { start, end, rocYear, quarter }
          }

          const { start: qStart, end: qEnd, rocYear, quarter } = getQuarterRange(currentMonth)

          const quarterEvents = events.filter((e) => {
            const eStart = new Date(e.start_time)
            const eEnd = new Date(e.end_time)
            return eStart <= qEnd && eEnd >= qStart
          })

          function formatROCDateTime(dtStr: string) {
            const d = new Date(dtStr)
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            const dd = String(d.getDate()).padStart(2, '0')
            const hh = String(d.getHours()).padStart(2, '0')
            const min = String(d.getMinutes()).padStart(2, '0')
            return `${mm}/${dd} ${hh}:${min}`
          }

          return (
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-[var(--color-border)]">
                <h3 className="font-semibold">{rocYear}年第{quarter}季 — 計畫性與非計畫性事件列表</h3>
              </div>
              {quarterEvents.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">本季無事件記錄</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                      <th className="text-left px-4 py-3 font-medium">事件性質</th>
                      <th className="text-left px-4 py-3 font-medium">事件類型</th>
                      <th className="text-left px-4 py-3 font-medium">設備</th>
                      <th className="text-left px-4 py-3 font-medium">開始時間</th>
                      <th className="text-left px-4 py-3 font-medium">結束時間</th>
                      <th className="text-right px-4 py-3 font-medium">停止服務<br/>時數 (hrs)</th>
                      <th className="text-left px-4 py-3 font-medium">說明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterEvents.map((e) => {
                      const stopHours = Number(((new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000).toFixed(2))
                      return (
                      <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PLAN_TYPE_COLORS[(e.plan_type as EventPlanType) || 'unplanned'] }}>
                            {PLAN_TYPE_LABELS[(e.plan_type as EventPlanType) || 'unplanned']}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: EVENT_TYPE_COLORS[e.event_type] }}>
                            {EVENT_TYPE_LABELS[e.event_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{e.asset_name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.start_time)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.end_time)}</td>
                        <td className="text-right px-4 py-3 font-semibold">{stopHours}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{e.description || '-'}</td>
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

      {/* Day detail sidebar */}
      {selectedDate && (
        <div className="w-80 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 h-fit sticky top-6">
          <h3 className="font-semibold mb-3">{format(selectedDate, 'yyyy/MM/dd')}</h3>
          {selectedDayEvents.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-badge-green-text)]">
              <CheckCircle className="w-4 h-4" /> 當日無事件
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-1">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PLAN_TYPE_COLORS[(e.plan_type as EventPlanType) || 'unplanned'] }}>
                        {PLAN_TYPE_LABELS[(e.plan_type as EventPlanType) || 'unplanned']}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: EVENT_TYPE_COLORS[e.event_type] }}>
                        {EVENT_TYPE_LABELS[e.event_type]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditEvent(e)} className="text-[var(--color-primary)] hover:underline text-xs">編輯</button>
                      <button onClick={() => deleteEvent(e.id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-xs">刪除</button>
                    </div>
                  </div>
                  <div className="font-medium text-sm mt-1">{e.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">{e.asset_name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {format(new Date(e.start_time), 'yyyy/MM/dd HH:mm')} ~ {format(new Date(e.end_time), 'yyyy/MM/dd HH:mm')}
                  </div>
                  {e.description && <div className="text-xs text-[var(--color-text-muted)] mt-1">{e.description}</div>}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => openNewEvent(selectedDate)}
            className="w-full mt-3 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]"
          >
            + 新增事件
          </button>
        </div>
      )}

      {/* New Event Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? '編輯事件' : '新增斷線/維護事件'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">設備 *</label>
            <select value={formAsset} onChange={(e) => setFormAsset(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {allAssets.some((a) => a.group) ? (
                Object.entries(
                  allAssets.reduce((acc, a) => {
                    const g = a.group || '其他'
                    if (!acc[g]) acc[g] = []
                    acc[g].push(a)
                    return acc
                  }, {} as Record<string, AssetOption[]>)
                ).map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map((a) => <option key={a.id} value={a.id}>{a.name}{a.ip_address ? ` (${a.ip_address})` : ''}</option>)}
                  </optgroup>
                ))
              ) : (
                allAssets.map((a) => <option key={a.id} value={a.id}>{a.name}{a.ip_address ? ` (${a.ip_address})` : ''}</option>)
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">事件類型</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value as 'downtime' | 'maintenance' | 'other')} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveEvent} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? '更新' : '儲存'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
