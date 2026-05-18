'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import CalendarGrid from '@/components/CalendarGrid'
import Modal from '@/components/Modal'
import { Plus, Clock, User, FileText, Trash2, Loader2 } from 'lucide-react'
import { format, formatMonthTitle, isSameDay } from '@/lib/calendar-utils'
import type { WorkEvent, LeaveRecord } from '@/types/database'

interface LocalWorkEvent {
  id: string
  title: string
  description: string
  event_date: string
  start_time: string
  end_time: string
  is_all_day: boolean
  color: string
  assignees: string[]
}

interface LocalLeave {
  id: string
  user_name: string
  leave_type: string
  leave_date: string
  is_half_day: boolean
  half_day_period: string
  note: string
}

const LEAVE_TYPES: Record<string, string> = {
  annual: '特休',
  sick: '病假',
  personal: '事假',
  official: '公假',
  other: '其他',
}

const EVENT_COLORS = [
  { value: '#3B82F6', label: '藍色' },
  { value: '#10B981', label: '綠色' },
  { value: '#F59E0B', label: '橘色' },
  { value: '#EF4444', label: '紅色' },
  { value: '#8B5CF6', label: '紫色' },
  { value: '#EC4899', label: '粉色' },
]

export default function CalendarPage() {
  const [events, setEvents] = useState<LocalWorkEvent[]>([])
  const [leaves, setLeaves] = useState<LocalLeave[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [showEventModal, setShowEventModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<LocalWorkEvent | null>(null)

  // Event form state
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('09:00')
  const [formEndTime, setFormEndTime] = useState('17:00')
  const [formAllDay, setFormAllDay] = useState(false)
  const [formColor, setFormColor] = useState('#3B82F6')
  const [formAssignees, setFormAssignees] = useState<string[]>([])

  // Leave form state
  const [leaveUser, setLeaveUser] = useState('')
  const [leaveType, setLeaveType] = useState('annual')
  const [leaveDate, setLeaveDate] = useState('')
  const [leaveHalf, setLeaveHalf] = useState(false)
  const [leavePeriod, setLeavePeriod] = useState('morning')
  const [leaveNote, setLeaveNote] = useState('')

  // Fetch functions
  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_events')
      .select('*')
      .order('event_date')
    if (!error && data) {
      setEvents(data.map((row: Record<string, unknown>) => ({
        ...row,
        assignees: typeof row.assignees === 'string' && row.assignees
          ? (row.assignees as string).split(',').map((s: string) => s.trim())
          : Array.isArray(row.assignees) ? row.assignees : [],
      })) as LocalWorkEvent[])
    }
  }, [])

  const fetchLeaves = useCallback(async () => {
    const { data, error } = await supabase
      .from('leave_records')
      .select('*')
      .order('leave_date')
    if (!error && data) setLeaves(data as LocalLeave[])
  }, [])

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('name')
      .eq('is_active', true)
      .order('name')
    if (!error && data) setUsers(data.map((u: { name: string }) => u.name))
  }, [])

  useEffect(() => {
    async function init() {
      await Promise.all([fetchEvents(), fetchLeaves(), fetchUsers()])
      setLoading(false)
    }
    init()
  }, [fetchEvents, fetchLeaves, fetchUsers])

  const calendarEvents = [
    ...events.map((e) => ({
      id: e.id,
      date: new Date(e.event_date),
      title: e.title,
      color: e.color,
      subtitle: e.assignees.join(', '),
    })),
    ...leaves.map((l) => ({
      id: l.id,
      date: new Date(l.leave_date),
      title: `${l.user_name} ${LEAVE_TYPES[l.leave_type]}`,
      color: '#9CA3AF',
      subtitle: l.note,
    })),
  ]

  function openNewEvent(date?: Date) {
    setEditingEvent(null)
    setFormTitle('')
    setFormDesc('')
    setFormDate(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setFormStartTime('09:00')
    setFormEndTime('17:00')
    setFormAllDay(false)
    setFormColor('#3B82F6')
    setFormAssignees([])
    setShowEventModal(true)
  }

  function openEditEvent(eventId: string) {
    const ev = events.find((e) => e.id === eventId)
    if (!ev) return
    setEditingEvent(ev)
    setFormTitle(ev.title)
    setFormDesc(ev.description)
    setFormDate(ev.event_date)
    setFormStartTime(ev.start_time)
    setFormEndTime(ev.end_time)
    setFormAllDay(ev.is_all_day)
    setFormColor(ev.color)
    setFormAssignees(ev.assignees)
    setShowEventModal(true)
  }

  async function saveEvent() {
    if (!formTitle || !formDate) return
    setSaving(true)
    const payload = {
      title: formTitle,
      description: formDesc,
      event_date: formDate,
      start_time: formStartTime,
      end_time: formEndTime,
      is_all_day: formAllDay,
      color: formColor,
      assignees: formAssignees.join(','),
    }
    if (editingEvent) {
      await supabase.from('work_events').update(payload).eq('id', editingEvent.id)
    } else {
      await supabase.from('work_events').insert(payload)
    }
    await fetchEvents()
    setSaving(false)
    setShowEventModal(false)
  }

  async function deleteEvent(id: string) {
    setSaving(true)
    await supabase.from('work_events').delete().eq('id', id)
    await fetchEvents()
    setSaving(false)
    setShowEventModal(false)
  }

  function openNewLeave(date?: Date) {
    setLeaveUser('')
    setLeaveType('annual')
    setLeaveDate(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setLeaveHalf(false)
    setLeavePeriod('morning')
    setLeaveNote('')
    setShowLeaveModal(true)
  }

  async function saveLeave() {
    if (!leaveUser || !leaveDate) return
    setSaving(true)
    const payload = {
      user_name: leaveUser,
      leave_type: leaveType,
      leave_date: leaveDate,
      is_half_day: leaveHalf,
      half_day_period: leavePeriod,
      note: leaveNote,
    }
    await supabase.from('leave_records').insert(payload)
    await fetchLeaves()
    setSaving(false)
    setShowLeaveModal(false)
  }

  function toggleAssignee(name: string) {
    setFormAssignees((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  // Day detail panel
  const selectedDayEvents = selectedDate
    ? events.filter((e) => e.event_date === format(selectedDate, 'yyyy-MM-dd'))
    : []
  const selectedDayLeaves = selectedDate
    ? leaves.filter((l) => l.leave_date === format(selectedDate, 'yyyy-MM-dd'))
    : []

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
      <div className="flex gap-6">
        {/* Calendar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">工作月曆</h1>
            <div className="flex gap-2">
              <button
                onClick={() => openNewLeave(selectedDate || undefined)}
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                請假
              </button>
              <button
                onClick={() => openNewEvent(selectedDate || undefined)}
                className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增工作
              </button>
            </div>
          </div>

          <CalendarGrid
            events={calendarEvents}
            onDateClick={(date) => setSelectedDate(prev => prev && isSameDay(prev, date) ? null : date)}
            onEventClick={(event) => {
              if (events.find((e) => e.id === event.id)) {
                openEditEvent(event.id)
              }
            }}
            selectedDate={selectedDate}
            onMonthChange={setCalendarMonth}
          />

          {/* Monthly event list (excluding leave records) */}
          {(() => {
            const monthStr = format(calendarMonth, 'yyyy-MM')
            const monthEvents = events.filter((e) => e.event_date.startsWith(monthStr))

            return (
              <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h3 className="font-semibold">{formatMonthTitle(calendarMonth)} — 本月事件清單</h3>
                </div>
                {monthEvents.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">本月無工作事件</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                        <th className="text-left px-4 py-3 font-medium">工作名稱</th>
                        <th className="text-left px-4 py-3 font-medium">日期</th>
                        <th className="text-left px-4 py-3 font-medium">時間</th>
                        <th className="text-left px-4 py-3 font-medium">指派人員</th>
                        <th className="text-left px-4 py-3 font-medium">說明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthEvents.map((e) => (
                        <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)] cursor-pointer" onClick={() => openEditEvent(e.id)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                              {e.title}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{e.event_date}</td>
                          <td className="px-4 py-3 text-xs">{e.is_all_day ? '全天' : `${e.start_time} ~ ${e.end_time}`}</td>
                          <td className="px-4 py-3 text-xs">{e.assignees.length > 0 ? e.assignees.join(', ') : '-'}</td>
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
            <h3 className="font-semibold mb-3">
              {format(selectedDate, 'yyyy/MM/dd (EEEE)', { locale: undefined })}
            </h3>

            {selectedDayEvents.length === 0 && selectedDayLeaves.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">當日無工作安排</p>
            )}

            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="mb-3 p-3 rounded-lg border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-hover)]"
                onClick={() => openEditEvent(ev.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ev.color }} />
                  <span className="font-medium text-sm">{ev.title}</span>
                </div>
                {!ev.is_all_day && (
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                    <Clock className="w-3 h-3" />
                    {ev.start_time} - {ev.end_time}
                  </div>
                )}
                {ev.assignees.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] mt-1">
                    <User className="w-3 h-3" />
                    {ev.assignees.join(', ')}
                  </div>
                )}
              </div>
            ))}

            {selectedDayLeaves.map((lv) => (
              <div key={lv.id} className="mb-3 p-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                <div className="text-sm font-medium">{lv.user_name} — {LEAVE_TYPES[lv.leave_type]}</div>
                {lv.is_half_day && (
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {lv.half_day_period === 'morning' ? '上午' : '下午'}半天
                  </div>
                )}
                {lv.note && <div className="text-xs text-[var(--color-text-muted)] mt-1">{lv.note}</div>}
              </div>
            ))}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => openNewEvent(selectedDate)}
                className="flex-1 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]"
              >
                + 工作
              </button>
              <button
                onClick={() => openNewLeave(selectedDate)}
                className="flex-1 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]"
              >
                + 請假
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New/Edit Event Modal */}
      <Modal open={showEventModal} onClose={() => setShowEventModal(false)} title={editingEvent ? '編輯工作' : '新增工作'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">工作名稱 *</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">日期 *</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allday" checked={formAllDay} onChange={(e) => setFormAllDay(e.target.checked)} className="rounded" />
            <label htmlFor="allday" className="text-sm">全天</label>
          </div>
          {!formAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">開始時間</label>
                <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">結束時間</label>
                <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">說明</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">顏色</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFormColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 ${formColor === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">指派人員</label>
            <div className="flex flex-wrap gap-2">
              {users.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleAssignee(name)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    formAssignees.includes(name)
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-hover)]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            {editingEvent && (
              <button onClick={() => deleteEvent(editingEvent.id)} disabled={saving} className="px-4 py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger-dim)] flex items-center gap-1 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 刪除
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setShowEventModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveEvent} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} 儲存
            </button>
          </div>
        </div>
      </Modal>

      {/* Leave Modal */}
      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="新增請假">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">人員 *</label>
            <select value={leaveUser} onChange={(e) => setLeaveUser(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="">請選擇</option>
              {users.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">假別 *</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">日期 *</label>
            <input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={leaveHalf} onChange={(e) => setLeaveHalf(e.target.checked)} className="rounded" />
              半天假
            </label>
            {leaveHalf && (
              <select value={leavePeriod} onChange={(e) => setLeavePeriod(e.target.value)} className="px-3 py-1 text-sm border border-[var(--color-border)] rounded-lg">
                <option value="morning">上午</option>
                <option value="afternoon">下午</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">備註</label>
            <input value={leaveNote} onChange={(e) => setLeaveNote(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={saveLeave} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} 儲存
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
