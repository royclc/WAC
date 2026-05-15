'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import Modal from './Modal'
import YearMonthPicker from './YearMonthPicker'
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
  asset_id: string
  asset_name: string
  event_type: 'downtime' | 'maintenance' | 'other'
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

// Demo assets — hardware (server page shows all, but availability only counts x86)
const DEMO_SERVER_ASSETS: AssetOption[] = [
  { id: 'h1', name: 'Web Server 01', ip_address: '192.168.1.10', group: 'x86伺服器', category: 'x86_server' },
  { id: 'h2', name: 'DB Server 01', ip_address: '192.168.1.20', group: 'x86伺服器', category: 'x86_server' },
  { id: 'h3', name: 'AP Server 01', ip_address: '192.168.1.30', group: 'x86伺服器', category: 'x86_server' },
  { id: 'h4', name: 'AP Server 02', ip_address: '192.168.1.31', group: 'x86伺服器', category: 'x86_server' },
  { id: 'h5', name: 'NetApp FAS01', ip_address: '192.168.1.50', group: '儲存裝置', category: 'storage' },
  { id: 'h6', name: '備份磁帶機 01', ip_address: '192.168.1.60', group: '儲存裝置', category: 'storage' },
]

const DEMO_NETWORK_ASSETS: AssetOption[] = [
  // 總局 - 內網
  { id: 'hi1', name: '總局內網防火牆', ip_address: '', group: '總局-內網' },
  { id: 'hi2', name: '總局內網核心交換器', ip_address: '', group: '總局-內網' },
  { id: 'hi3', name: '總局內網主機交換器', ip_address: '', group: '總局-內網' },
  { id: 'hi4', name: '總局內網邊界交換器', ip_address: '', group: '總局-內網' },
  { id: 'hi5', name: '總局內網聚合交換器', ip_address: '', group: '總局-內網' },
  // 總局 - 外網
  { id: 'he1', name: '總局外網防火牆', ip_address: '', group: '總局-外網' },
  { id: 'he2', name: '總局外網核心交換器', ip_address: '', group: '總局-外網' },
  { id: 'he3', name: '總局外網主機交換器', ip_address: '', group: '總局-外網' },
  { id: 'he4', name: '總局外網邊界交換器', ip_address: '', group: '總局-外網' },
  { id: 'he5', name: '總局外網聚合交換器', ip_address: '', group: '總局-外網' },
  // a稽徵所
  { id: 'ai1', name: 'a稽徵所內網防火牆', ip_address: '', group: 'a稽徵所-內網' },
  { id: 'ai2', name: 'a稽徵所內網前端交換器', ip_address: '', group: 'a稽徵所-內網' },
  { id: 'ai3', name: 'a稽徵所內網聚合交換器', ip_address: '', group: 'a稽徵所-內網' },
  { id: 'ae1', name: 'a稽徵所外網防火牆', ip_address: '', group: 'a稽徵所-外網' },
  { id: 'ae2', name: 'a稽徵所外網前端交換器', ip_address: '', group: 'a稽徵所-外網' },
  { id: 'ae3', name: 'a稽徵所外網聚合交換器', ip_address: '', group: 'a稽徵所-外網' },
  // b分局
  { id: 'bi1', name: 'b分局內網防火牆', ip_address: '', group: 'b分局-內網' },
  { id: 'bi2', name: 'b分局內網前端交換器', ip_address: '', group: 'b分局-內網' },
  { id: 'bi3', name: 'b分局內網聚合交換器', ip_address: '', group: 'b分局-內網' },
  { id: 'be1', name: 'b分局外網防火牆', ip_address: '', group: 'b分局-外網' },
  { id: 'be2', name: 'b分局外網前端交換器', ip_address: '', group: 'b分局-外網' },
  { id: 'be3', name: 'b分局外網聚合交換器', ip_address: '', group: 'b分局-外網' },
  // c稽徵所
  { id: 'ci1', name: 'c稽徵所內網防火牆', ip_address: '', group: 'c稽徵所-內網' },
  { id: 'ci2', name: 'c稽徵所內網前端交換器', ip_address: '', group: 'c稽徵所-內網' },
  { id: 'ci3', name: 'c稽徵所內網聚合交換器', ip_address: '', group: 'c稽徵所-內網' },
  { id: 'ce1', name: 'c稽徵所外網防火牆', ip_address: '', group: 'c稽徵所-外網' },
  { id: 'ce2', name: 'c稽徵所外網前端交換器', ip_address: '', group: 'c稽徵所-外網' },
  { id: 'ce3', name: 'c稽徵所外網聚合交換器', ip_address: '', group: 'c稽徵所-外網' },
]

export default function AvailabilityCalendar({ assetType, typeName }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<DowntimeEvent[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Form state
  const [formAsset, setFormAsset] = useState('')
  const [formType, setFormType] = useState<'downtime' | 'maintenance' | 'other'>('downtime')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')

  const allAssets = assetType === 'server' ? DEMO_SERVER_ASSETS : DEMO_NETWORK_ASSETS
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
      let downtimeMinutes = 0

      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 1)

      assetEvents.forEach((e) => {
        const eStart = new Date(e.start_time)
        const eEnd = new Date(e.end_time)
        const effectiveStart = eStart < monthStart ? monthStart : eStart
        const effectiveEnd = eEnd > monthEnd ? monthEnd : eEnd
        if (effectiveEnd > effectiveStart) {
          downtimeMinutes += (effectiveEnd.getTime() - effectiveStart.getTime()) / 60000
        }
      })

      const downtimeHours = Math.round((downtimeMinutes / 60) * 100) / 100
      const uptimeHours = Math.round((totalHours - downtimeHours) * 100) / 100
      const pct = totalHours > 0 ? Math.round(((totalHours - downtimeHours) / totalHours) * 10000) / 100 : 100

      return { asset, downtimeHours, uptimeHours, totalHours, pct, eventCount: assetEvents.length }
    })

    return assetStats
  }, [currentMonth, events, assets])

  function openNewEvent(date?: Date) {
    setFormAsset(assets[0]?.id || '')
    setFormType('downtime')
    setFormTitle('')
    setFormDesc('')
    const d = date || new Date()
    setFormStart(`${format(d, 'yyyy-MM-dd')}T00:00`)
    setFormEnd(`${format(d, 'yyyy-MM-dd')}T01:00`)
    setShowModal(true)
  }

  function saveEvent() {
    if (!formAsset || !formTitle || !formStart || !formEnd) return
    const asset = assets.find((a) => a.id === formAsset)
    const newEvent: DowntimeEvent = {
      id: crypto.randomUUID(),
      asset_id: formAsset,
      asset_name: asset?.name || '',
      event_type: formType,
      title: formTitle,
      description: formDesc,
      start_time: formStart,
      end_time: formEnd,
    }
    setEvents([...events, newEvent])
    setShowModal(false)
  }

  function deleteEvent(id: string) {
    setEvents(events.filter((e) => e.id !== id))
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : []

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
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{formatMonthTitle(currentMonth)}</h2>
              <YearMonthPicker currentDate={currentMonth} onChange={setCurrentMonth} />
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={`text-center text-sm font-medium py-3 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-[var(--color-text-muted)]'}`}>
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
              const hasDowntime = dayEvents.some((e) => e.event_type === 'downtime')
              const dayOfWeek = date.getDay()

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-[90px] border-b border-r border-[var(--color-border)] p-1.5 cursor-pointer transition-colors ${
                    !inMonth ? 'bg-gray-50' : hasDowntime ? 'bg-red-50/50' : 'hover:bg-blue-50/30'
                  } ${selected ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-[var(--color-primary)] text-white font-bold' : ''} ${!inMonth ? 'text-gray-300' : ''} ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <AlertTriangle className={`w-4 h-4 ${hasDowntime ? 'text-red-500' : 'text-amber-500'}`} />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className="text-xs px-1 py-0.5 rounded truncate text-white" style={{ backgroundColor: EVENT_TYPE_COLORS[e.event_type] }}>
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
              <tr className="border-b border-[var(--color-border)] bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">設備名稱</th>
                {assets.some((a) => a.group) && <th className="text-left px-4 py-3 font-medium">單位</th>}
                <th className="text-right px-4 py-3 font-medium">總時數</th>
                <th className="text-right px-4 py-3 font-medium">斷線時數</th>
                <th className="text-right px-4 py-3 font-medium">運作時數</th>
                <th className="text-right px-4 py-3 font-medium">可用率</th>
                <th className="text-right px-4 py-3 font-medium">事件數</th>
              </tr>
            </thead>
            <tbody>
              {monthStats.map(({ asset, totalHours, downtimeHours, uptimeHours, pct, eventCount }) => (
                <tr key={asset.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{asset.name}</div>
                    {asset.ip_address && <div className="text-xs text-[var(--color-text-muted)]">{asset.ip_address}</div>}
                  </td>
                  {assets.some((a) => a.group) && <td className="px-4 py-3 text-sm">{asset.group || '-'}</td>}
                  <td className="text-right px-4 py-3">{totalHours}h</td>
                  <td className="text-right px-4 py-3 text-red-600">{downtimeHours}h</td>
                  <td className="text-right px-4 py-3 text-green-600">{uptimeHours}h</td>
                  <td className="text-right px-4 py-3">
                    <span className={`font-semibold ${pct >= 99.9 ? 'text-green-600' : pct >= 99 ? 'text-amber-600' : 'text-red-600'}`}>
                      {pct}%
                    </span>
                  </td>
                  <td className="text-right px-4 py-3">{eventCount}</td>
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
                    <tr className="border-b border-[var(--color-border)] bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">事件類型</th>
                      <th className="text-left px-4 py-3 font-medium">設備</th>
                      <th className="text-left px-4 py-3 font-medium">開始時間</th>
                      <th className="text-left px-4 py-3 font-medium">結束時間</th>
                      <th className="text-left px-4 py-3 font-medium">說明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterEvents.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: EVENT_TYPE_COLORS[e.event_type] }}>
                            {EVENT_TYPE_LABELS[e.event_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{e.asset_name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.start_time)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatROCDateTime(e.end_time)}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{e.description || '-'}</td>
                      </tr>
                    ))}
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
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> 當日無斷線事件
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: EVENT_TYPE_COLORS[e.event_type] }}>
                      {EVENT_TYPE_LABELS[e.event_type]}
                    </span>
                    <button onClick={() => deleteEvent(e.id)} className="text-[var(--color-text-muted)] hover:text-red-500 text-xs">刪除</button>
                  </div>
                  <div className="font-medium text-sm mt-1">{e.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">{e.asset_name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {e.start_time.replace('T', ' ')} ~ {e.end_time.replace('T', ' ')}
                  </div>
                  {e.description && <div className="text-xs text-[var(--color-text-muted)] mt-1">{e.description}</div>}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => openNewEvent(selectedDate)}
            className="w-full mt-3 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
          >
            + 新增事件
          </button>
        </div>
      )}

      {/* New Event Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="新增斷線/維護事件">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">設備 *</label>
            <select value={formAsset} onChange={(e) => setFormAsset(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {assets.some((a) => a.group) ? (
                Object.entries(
                  assets.reduce((acc, a) => {
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
                assets.map((a) => <option key={a.id} value={a.id}>{a.name}{a.ip_address ? ` (${a.ip_address})` : ''}</option>)
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
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={saveEvent} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">儲存</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
