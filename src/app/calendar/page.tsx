'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import CalendarGrid from '@/components/CalendarGrid'
import Modal from '@/components/Modal'
import { Plus, Clock, User, FileText, Trash2 } from 'lucide-react'
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

// Demo data
const DEMO_USERS = ['王小明', '陳美麗', '林志偉', '張雅琪', '李大同']

const DEMO_EVENTS: LocalWorkEvent[] = [
  { id: '1', title: '伺服器維護', description: '定期維護', event_date: format(new Date(), 'yyyy-MM-dd'), start_time: '09:00', end_time: '12:00', is_all_day: false, color: '#3B82F6', assignees: ['王小明', '林志偉'] },
  { id: '2', title: '網路設備巡檢', description: '', event_date: format(new Date(), 'yyyy-MM-dd'), start_time: '14:00', end_time: '17:00', is_all_day: false, color: '#10B981', assignees: ['陳美麗'] },
]

const DEMO_LEAVES: LocalLeave[] = [
  { id: 'l1', user_name: '張雅琪', leave_type: 'annual', leave_date: format(new Date(), 'yyyy-MM-dd'), is_half_day: false, half_day_period: '', note: '出國旅遊' },
]

export default function CalendarPage() {
  const [events, setEvents] = useState<LocalWorkEvent[]>(DEMO_EVENTS)
  const [leaves, setLeaves] = useState<LocalLeave[]>(DEMO_LEAVES)
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

  function saveEvent() {
    if (!formTitle || !formDate) return
    const newEvent: LocalWorkEvent = {
      id: editingEvent?.id || crypto.randomUUID(),
      title: formTitle,
      description: formDesc,
      event_date: formDate,
      start_time: formStartTime,
      end_time: formEndTime,
      is_all_day: formAllDay,
      color: formColor,
      assignees: formAssignees,
    }
    if (editingEvent) {
      setEvents(events.map((e) => (e.id === editingEvent.id ? newEvent : e)))
    } else {
      setEvents([...events, newEvent])
    }
    setShowEventModal(false)
  }

  function deleteEvent(id: string) {
    setEvents(events.filter((e) => e.id !== id))
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

  function saveLeave() {
    if (!leaveUser || !leaveDate) return
    const newLeave: LocalLeave = {
      id: crypto.randomUUID(),
      user_name: leaveUser,
      leave_type: leaveType,
      leave_date: leaveDate,
      is_half_day: leaveHalf,
      half_day_period: leavePeriod,
      note: leaveNote,
    }
    setLeaves([...leaves, newLeave])
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
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-1"
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
            onDateClick={(date) => setSelectedDate(date)}
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
                      <tr className="border-b border-[var(--color-border)] bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium">工作名稱</th>
                        <th className="text-left px-4 py-3 font-medium">日期</th>
                        <th className="text-left px-4 py-3 font-medium">時間</th>
                        <th className="text-left px-4 py-3 font-medium">指派人員</th>
                        <th className="text-left px-4 py-3 font-medium">說明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthEvents.map((e) => (
                        <tr key={e.id} className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => openEditEvent(e.id)}>
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
                className="mb-3 p-3 rounded-lg border border-[var(--color-border)] cursor-pointer hover:bg-gray-50"
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
              <div key={lv.id} className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
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
                className="flex-1 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
              >
                + 工作
              </button>
              <button
                onClick={() => openNewLeave(selectedDate)}
                className="flex-1 text-xs py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
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
              {DEMO_USERS.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleAssignee(name)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    formAssignees.includes(name)
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:bg-gray-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            {editingEvent && (
              <button onClick={() => deleteEvent(editingEvent.id)} className="px-4 py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-red-50 flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> 刪除
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setShowEventModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={saveEvent} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">儲存</button>
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
              {DEMO_USERS.map((n) => <option key={n} value={n}>{n}</option>)}
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
            <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={saveLeave} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">儲存</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
