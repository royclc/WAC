'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import YearMonthPicker from '@/components/YearMonthPicker'
import { ChevronLeft, ChevronRight, Plus, Wrench, Trash2, CheckCircle, Loader2 } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'

interface MaintenanceCategoryDef {
  id: string
  key: string
  label: string
  color: string
  sort_order: number
}

interface VendorItem {
  id: string
  name: string
}

interface MaintenanceEvent {
  id: string
  category_key: string
  title: string
  description: string
  event_date: string
  contractor: string
  is_completed: boolean
}

export default function MaintenancePage() {
  const [categories, setCategories] = useState<MaintenanceCategoryDef[]>([])
  const [vendors, setVendors] = useState<VendorItem[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<MaintenanceEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formCategory, setFormCategory] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formContractor, setFormContractor] = useState('')

  // ── Fetch data from Supabase ──
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('maintenance_categories')
      .select('id, key, label, color, sort_order')
      .order('sort_order')
    if (data) setCategories(data)
  }, [])

  const fetchVendors = useCallback(async () => {
    const { data } = await supabase
      .from('vendors')
      .select('id, name')
      .order('name')
    if (data) setVendors(data)
  }, [])

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('maintenance_events')
      .select('id, category_key, title, description, event_date, contractor, is_completed')
      .order('event_date')
    if (data) setEvents(data)
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchCategories(), fetchVendors(), fetchEvents()])
      setLoading(false)
    }
    init()
  }, [fetchCategories, fetchVendors, fetchEvents])

  // Helper: get category info
  function getCat(key: string) {
    return categories.find((c) => c.key === key)
  }

  const days = getCalendarDays(currentMonth)

  const filteredEvents = filterCategory === 'all'
    ? events
    : events.filter((e) => e.category_key === filterCategory)

  function getEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredEvents.filter((e) => e.event_date === dateStr)
  }

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM')
    const monthEvents = events.filter((e) => e.event_date.startsWith(monthStr))
    const byCategory = categories.map((cat) => {
      const catEvents = monthEvents.filter((e) => e.category_key === cat.key)
      return {
        key: cat.key,
        label: cat.label,
        total: catEvents.length,
        completed: catEvents.filter((e) => e.is_completed).length,
      }
    }).filter((c) => c.total > 0)
    return { total: monthEvents.length, completed: monthEvents.filter((e) => e.is_completed).length, byCategory }
  }, [currentMonth, events, categories])

  function openNewEvent(date?: Date) {
    setFormCategory(categories[0]?.key || '')
    setFormTitle('')
    setFormDesc('')
    setFormDate(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setFormContractor('')
    setShowModal(true)
  }

  async function saveEvent() {
    if (!formTitle || !formDate) return
    setSaving(true)
    const { data, error } = await supabase
      .from('maintenance_events')
      .insert({
        category_key: formCategory,
        title: formTitle,
        description: formDesc,
        event_date: formDate,
        contractor: formContractor,
        is_completed: false,
      })
      .select()
      .single()
    setSaving(false)
    if (error) {
      console.error('Failed to save event:', error)
      return
    }
    if (data) setEvents([...events, data])
    setShowModal(false)
  }

  async function toggleComplete(id: string) {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const newVal = !ev.is_completed
    // Optimistic update
    setEvents(events.map((e) => (e.id === id ? { ...e, is_completed: newVal } : e)))
    const { error } = await supabase
      .from('maintenance_events')
      .update({ is_completed: newVal })
      .eq('id', id)
    if (error) {
      console.error('Failed to toggle complete:', error)
      // Revert on error
      setEvents(events.map((e) => (e.id === id ? { ...e, is_completed: !newVal } : e)))
    }
  }

  async function deleteEvent(id: string) {
    const prev = events
    setEvents(events.filter((e) => e.id !== id))
    const { error } = await supabase
      .from('maintenance_events')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Failed to delete event:', error)
      setEvents(prev)
    } else {
      setSelectedDate(null)
    }
  }

  const selectedDayEvents = selectedDate
    ? getEventsForDay(selectedDate)
    : []

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    )
  }

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
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilterCategory(cat.key)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filterCategory === cat.key
                    ? 'text-white border-transparent'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'
                }`}
                style={filterCategory === cat.key ? { backgroundColor: cat.color } : undefined}
              >
                {cat.label}
              </button>
            ))}
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
                const dayOfWeek = date.getDay()

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(prev => prev && isSameDay(prev, date) ? null : date)}
                    className={`min-h-[100px] border-b border-r border-[var(--color-border)] p-1.5 cursor-pointer transition-colors ${
                      !inMonth ? 'bg-[var(--color-bg-elevated)]' : 'hover:bg-[var(--color-primary-dim)]'
                    } ${selected ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-[var(--color-primary)] text-white font-bold' : ''} ${!inMonth ? 'text-[var(--color-text-dim)]' : ''} ${dayOfWeek === 0 ? 'text-[var(--color-weekend-sun)]' : dayOfWeek === 6 ? 'text-[var(--color-weekend-sat)]' : ''}`}>
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
                          style={{ backgroundColor: getCat(e.category_key)?.color || '#6B7280' }}
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
                <div className="text-center p-3 bg-[var(--color-bg-elevated)] rounded-lg">
                  <div className="text-2xl font-bold">{monthlySummary.total}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">總保養項目</div>
                </div>
                <div className="text-center p-3 bg-[var(--color-badge-green)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--color-badge-green-text)]">{monthlySummary.completed}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">已完成</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{monthlySummary.total - monthlySummary.completed}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">待完成</div>
                </div>
                <div className="text-center p-3 bg-[var(--color-primary-dim)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--color-primary)]">
                    {monthlySummary.total > 0 ? Math.round((monthlySummary.completed / monthlySummary.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">完成率</div>
                </div>
              </div>
              {monthlySummary.byCategory.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {monthlySummary.byCategory.map((c) => (
                    <span key={c.key} className="text-xs px-2 py-1 rounded-full bg-[var(--color-bg-elevated)]">
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
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
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
                        <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: getCat(e.category_key)?.color || '#6B7280' }}>
                              {getCat(e.category_key)?.label || e.category_key}
                            </span>
                          </td>
                          <td className="px-4 py-3">{e.title}</td>
                          <td className="px-4 py-3 font-mono text-xs">{e.event_date}</td>
                          <td className="px-4 py-3">{e.contractor || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_completed ? 'bg-[var(--color-badge-green)] text-[var(--color-badge-green-text)]' : 'bg-[var(--color-badge-yellow)] text-[var(--color-badge-yellow-text)]'}`}>
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
                        style={{ backgroundColor: getCat(e.category_key)?.color || '#6B7280' }}
                      >
                        {getCat(e.category_key)?.label || e.category_key}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleComplete(e.id)}
                          className={`text-xs px-2 py-0.5 rounded border ${e.is_completed ? 'bg-[var(--color-badge-green)] text-[var(--color-badge-green-text)] border-[var(--color-border)]' : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'}`}
                        >
                          {e.is_completed ? '已完成' : '完成'}
                        </button>
                        <button onClick={() => deleteEvent(e.id)} className="p-0.5 hover:text-[var(--color-danger)]">
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
              className="w-full mt-3 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]"
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
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
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
            <label className="block text-sm font-medium mb-1">廠商 *</label>
            <select value={formContractor} onChange={(e) => setFormContractor(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="">請選擇廠商</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">廠商清單來自「管理 &gt; 廠商管理」</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button
              onClick={saveEvent}
              disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              儲存
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
