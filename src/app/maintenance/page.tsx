'use client'

import { useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import YearMonthPicker from '@/components/YearMonthPicker'
import { ChevronLeft, ChevronRight, Plus, Wrench, Trash2, CheckCircle } from 'lucide-react'
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

type MaintenanceCategory = 'hvac' | 'fire' | 'electrical' | 'generator' | 'server' | 'network'

const CATEGORIES: Record<MaintenanceCategory, { label: string; color: string }> = {
  hvac:       { label: '空調', color: '#3B82F6' },
  fire:       { label: '消防', color: '#EF4444' },
  electrical: { label: '機電', color: '#F59E0B' },
  generator:  { label: '發電機', color: '#8B5CF6' },
  server:     { label: '伺服器', color: '#10B981' },
  network:    { label: '網路設備', color: '#06B6D4' },
}

interface MaintenanceEvent {
  id: string
  category: MaintenanceCategory
  title: string
  description: string
  event_date: string
  contractor: string
  is_completed: boolean
}

const DEMO_EVENTS: MaintenanceEvent[] = [
  { id: '1', category: 'hvac', title: '冷氣主機年度保養', description: '更換冷媒、清洗濾網', event_date: format(new Date(), 'yyyy-MM-dd'), contractor: '大金空調', is_completed: false },
  { id: '2', category: 'fire', title: '消防設備檢查', description: '滅火器、偵煙器檢測', event_date: format(new Date(), 'yyyy-MM-dd'), contractor: '永安消防', is_completed: true },
  { id: '3', category: 'generator', title: '發電機月保養', description: '試運轉、油量檢查', event_date: format(new Date(new Date().setDate(new Date().getDate() + 3)), 'yyyy-MM-dd'), contractor: '台電機電', is_completed: false },
]

export default function MaintenancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<MaintenanceEvent[]>(DEMO_EVENTS)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState<MaintenanceCategory | 'all'>('all')

  // Form state
  const [formCategory, setFormCategory] = useState<MaintenanceCategory>('hvac')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formContractor, setFormContractor] = useState('')

  const days = getCalendarDays(currentMonth)

  const filteredEvents = filterCategory === 'all'
    ? events
    : events.filter((e) => e.category === filterCategory)

  function getEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredEvents.filter((e) => e.event_date === dateStr)
  }

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM')
    const monthEvents = events.filter((e) => e.event_date.startsWith(monthStr))
    const byCategory = Object.entries(CATEGORIES).map(([key, { label }]) => {
      const catEvents = monthEvents.filter((e) => e.category === key)
      return {
        key,
        label,
        total: catEvents.length,
        completed: catEvents.filter((e) => e.is_completed).length,
      }
    }).filter((c) => c.total > 0)
    return { total: monthEvents.length, completed: monthEvents.filter((e) => e.is_completed).length, byCategory }
  }, [currentMonth, events])

  function openNewEvent(date?: Date) {
    setFormCategory('hvac')
    setFormTitle('')
    setFormDesc('')
    setFormDate(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setFormContractor('')
    setShowModal(true)
  }

  function saveEvent() {
    if (!formTitle || !formDate) return
    const newEvent: MaintenanceEvent = {
      id: crypto.randomUUID(),
      category: formCategory,
      title: formTitle,
      description: formDesc,
      event_date: formDate,
      contractor: formContractor,
      is_completed: false,
    }
    setEvents([...events, newEvent])
    setShowModal(false)
  }

  function toggleComplete(id: string) {
    setEvents(events.map((e) => (e.id === id ? { ...e, is_completed: !e.is_completed } : e)))
  }

  function deleteEvent(id: string) {
    setEvents(events.filter((e) => e.id !== id))
  }

  const selectedDayEvents = selectedDate
    ? getEventsForDay(selectedDate)
    : []

  return (
    <AppShell>
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">保養記錄</h1>
            <button
              onClick={() => openNewEvent(selectedDate || undefined)}
              className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 新增保養
            </button>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filterCategory === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'border-[var(--color-border)] hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {Object.entries(CATEGORIES).map(([key, { label, color }]) => (
              <button
                key={key}
                onClick={() => setFilterCategory(key as MaintenanceCategory)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filterCategory === key
                    ? 'text-white border-transparent'
                    : 'border-[var(--color-border)] hover:bg-gray-50'
                }`}
                style={filterCategory === key ? { backgroundColor: color } : undefined}
              >
                {label}
              </button>
            ))}
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
                const dayOfWeek = date.getDay()

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[100px] border-b border-r border-[var(--color-border)] p-1.5 cursor-pointer transition-colors ${
                      !inMonth ? 'bg-gray-50' : 'hover:bg-blue-50/30'
                    } ${selected ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-[var(--color-primary)] text-white font-bold' : ''} ${!inMonth ? 'text-gray-300' : ''} ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''}`}>
                        {format(date, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <Wrench className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className={`text-xs px-1.5 py-0.5 rounded truncate text-white flex items-center gap-1 ${e.is_completed ? 'opacity-60' : ''}`}
                          style={{ backgroundColor: CATEGORIES[e.category].color }}
                        >
                          {e.is_completed && <CheckCircle className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{e.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-[var(--color-text-muted)] px-1.5">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monthly summary */}
          {monthlySummary.total > 0 && (
            <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4">
              <h3 className="font-semibold mb-3">{formatMonthTitle(currentMonth)} — 保養統計</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{monthlySummary.total}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">總保養項目</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{monthlySummary.completed}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">已完成</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{monthlySummary.total - monthlySummary.completed}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">待完成</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {monthlySummary.total > 0 ? Math.round((monthlySummary.completed / monthlySummary.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">完成率</div>
                </div>
              </div>
              {monthlySummary.byCategory.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {monthlySummary.byCategory.map((c) => (
                    <span key={c.key} className="text-xs px-2 py-1 rounded-full bg-gray-100">
                      {c.label}: {c.completed}/{c.total}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quarterly maintenance list */}
          {(() => {
            function getQuarterRange(refDate: Date): { start: string; end: string; rocYear: number; quarter: number } {
              const y = refDate.getFullYear()
              const m = refDate.getMonth()
              const d = refDate.getDate()

              let quarter: number
              let startDate: Date
              let endDate: Date

              if ((m === 11 && d >= 26) || m <= 1 || (m === 2 && d <= 25)) {
                quarter = 1
                const startYear = m === 11 ? y : y - 1
                startDate = new Date(startYear, 11, 26)
                endDate = new Date(startYear + 1, 2, 25)
              } else if ((m === 2 && d >= 26) || m === 3 || m === 4 || (m === 5 && d <= 25)) {
                quarter = 2
                startDate = new Date(y, 2, 26)
                endDate = new Date(y, 5, 25)
              } else if ((m === 5 && d >= 26) || m === 6 || m === 7 || (m === 8 && d <= 25)) {
                quarter = 3
                startDate = new Date(y, 5, 26)
                endDate = new Date(y, 8, 25)
              } else {
                quarter = 4
                startDate = new Date(y, 8, 26)
                endDate = new Date(y, 11, 25)
              }

              const rocYear = endDate.getFullYear() - 1911
              return {
                start: format(startDate, 'yyyy-MM-dd'),
                end: format(endDate, 'yyyy-MM-dd'),
                rocYear,
                quarter,
              }
            }

            const { start: qStart, end: qEnd, rocYear, quarter } = getQuarterRange(currentMonth)

            const quarterEvents = events.filter((e) => e.event_date >= qStart && e.event_date <= qEnd)

            return (
              <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h3 className="font-semibold">{rocYear}年第{quarter}季 — 本季保養記錄列表</h3>
                </div>
                {quarterEvents.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">本季無保養記錄</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium">類別</th>
                        <th className="text-left px-4 py-3 font-medium">保養項目</th>
                        <th className="text-left px-4 py-3 font-medium">日期</th>
                        <th className="text-left px-4 py-3 font-medium">廠商</th>
                        <th className="text-left px-4 py-3 font-medium">狀態</th>
                        <th className="text-left px-4 py-3 font-medium">說明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarterEvents.map((e) => (
                        <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: CATEGORIES[e.category].color }}>
                              {CATEGORIES[e.category].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">{e.title}</td>
                          <td className="px-4 py-3 font-mono text-xs">{e.event_date}</td>
                          <td className="px-4 py-3">{e.contractor || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {e.is_completed ? '已完成' : '待完成'}
                            </span>
                          </td>
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
              <p className="text-sm text-[var(--color-text-muted)]">當日無保養排程</p>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((e) => (
                  <div key={e.id} className={`p-3 rounded-lg border border-[var(--color-border)] ${e.is_completed ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: CATEGORIES[e.category].color }}
                      >
                        {CATEGORIES[e.category].label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleComplete(e.id)}
                          className={`text-xs px-2 py-0.5 rounded border ${e.is_completed ? 'bg-green-50 text-green-700 border-green-200' : 'border-[var(--color-border)] hover:bg-gray-50'}`}
                        >
                          {e.is_completed ? '已完成' : '完成'}
                        </button>
                        <button onClick={() => deleteEvent(e.id)} className="p-0.5 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="font-medium text-sm mt-1">{e.title}</div>
                    {e.contractor && <div className="text-xs text-[var(--color-text-muted)] mt-1">廠商：{e.contractor}</div>}
                    {e.description && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{e.description}</div>}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => openNewEvent(selectedDate)}
              className="w-full mt-3 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
            >
              + 新增保養
            </button>
          </div>
        )}
      </div>

      {/* New Event Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="新增保養記錄">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">保養類別 *</label>
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as MaintenanceCategory)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {Object.entries(CATEGORIES).map(([k, { label }]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">保養項目 *</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="例：冷氣主機年度保養" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">日期 *</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">廠商</label>
            <input value={formContractor} onChange={(e) => setFormContractor(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="例：大金空調" />
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
    </AppShell>
  )
}
