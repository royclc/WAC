'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import CalendarGrid from '@/components/CalendarGrid'
import Modal from '@/components/Modal'
import { Plus, Clock, User, FileText, Trash2, Loader2, Pencil, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
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
  vendor: string
  maintenance_event_id: string | null
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
  const [vendorNames, setVendorNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [showEventModal, setShowEventModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<LocalWorkEvent | null>(null)
  const [editingLeave, setEditingLeave] = useState<LocalLeave | null>(null)

  const [maintCategories, setMaintCategories] = useState<{ key: string; label: string }[]>([])

  // Event form state
  const [formIsMaint, setFormIsMaint] = useState(false)
  const [formMaintCat, setFormMaintCat] = useState('')
  const [formVendor, setFormVendor] = useState('')
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
  const [leaveDateEnd, setLeaveDateEnd] = useState('')
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
        vendor: (row.vendor as string) || '',
        maintenance_event_id: (row.maintenance_event_id as string) || null,
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

  const fetchVendorNames = useCallback(async () => {
    // 從 vendors 表 + work_events 已使用的廠商名稱合併去重
    const [{ data: vData }, { data: eData }] = await Promise.all([
      supabase.from('vendors').select('name').order('name'),
      supabase.from('work_events').select('vendor'),
    ])
    const nameSet = new Set<string>()
    vData?.forEach((v: { name: string }) => { if (v.name?.trim()) nameSet.add(v.name.trim()) })
    eData?.forEach((e: { vendor: string }) => { if (e.vendor?.trim()) nameSet.add(e.vendor.trim()) })
    setVendorNames([...nameSet].sort())
  }, [])

  const fetchMaintCategories = useCallback(async () => {
    const { data } = await supabase.from('maintenance_categories').select('key, label').order('sort_order')
    if (data) setMaintCategories(data)
  }, [])

  useEffect(() => {
    async function init() {
      await Promise.all([fetchEvents(), fetchLeaves(), fetchUsers(), fetchVendorNames(), fetchMaintCategories()])
      setLoading(false)
    }
    init()
  }, [fetchEvents, fetchLeaves, fetchUsers, fetchVendorNames, fetchMaintCategories])

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
    setFormIsMaint(false)
    setFormMaintCat(maintCategories[0]?.key || '')
    setFormVendor('')
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
    setFormVendor(ev.vendor || '')
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
      assignees: formAssignees.filter((a) => a !== formVendor).join(','),
      vendor: formVendor === '無' ? '' : formVendor,
    }
    if (editingEvent) {
      await supabase.from('work_events').update(payload).eq('id', editingEvent.id)
    } else {
      let maintEventId: string | null = null
      // 同步新增保養記錄
      if (formIsMaint && formMaintCat) {
        const { data: maintData } = await supabase.from('maintenance_events').insert({
          category_key: formMaintCat,
          title: formTitle,
          description: formDesc,
          event_date: formDate,
          contractor: formVendor === '無' ? '' : formVendor,
          is_completed: false,
        }).select('id').single()
        if (maintData) maintEventId = maintData.id
      }
      await supabase.from('work_events').insert({ ...payload, maintenance_event_id: maintEventId })
    }
    await fetchEvents()
    setSaving(false)
    setShowEventModal(false)
  }

  async function deleteEvent(id: string) {
    setSaving(true)
    // 找出關聯的保養記錄並同步刪除
    const ev = events.find((e) => e.id === id)
    if (ev?.maintenance_event_id) {
      await supabase.from('maintenance_events').delete().eq('id', ev.maintenance_event_id)
    }
    await supabase.from('work_events').delete().eq('id', id)
    await fetchEvents()
    setSaving(false)
    setShowEventModal(false)
    setSelectedDate(null)
  }

  function openNewLeave(date?: Date) {
    setEditingLeave(null)
    setLeaveUser('')
    setLeaveType('annual')
    const d = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    setLeaveDate(d)
    setLeaveDateEnd(d)
    setLeaveHalf(false)
    setLeavePeriod('morning')
    setLeaveNote('')
    setShowLeaveModal(true)
  }

  function openEditLeave(id: string) {
    const lv = leaves.find((l) => l.id === id)
    if (!lv) return
    setEditingLeave(lv)
    setLeaveUser(lv.user_name)
    setLeaveType(lv.leave_type)
    setLeaveDate(lv.leave_date)
    setLeaveDateEnd(lv.leave_date)
    setLeaveHalf(lv.is_half_day)
    setLeavePeriod(lv.half_day_period || 'morning')
    setLeaveNote(lv.note || '')
    setShowLeaveModal(true)
  }

  // Generate date strings between start and end (inclusive)
  function getDateRange(start: string, end: string): string[] {
    const dates: string[] = []
    const d = new Date(start)
    const e = new Date(end)
    while (d <= e) {
      dates.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    return dates
  }

  async function saveLeave() {
    if (!leaveUser || !leaveDate) return
    setSaving(true)
    if (editingLeave) {
      await supabase.from('leave_records').update({
        user_name: leaveUser,
        leave_type: leaveType,
        leave_date: leaveDate,
        is_half_day: leaveHalf,
        half_day_period: leavePeriod,
        note: leaveNote,
      }).eq('id', editingLeave.id)
    } else {
      const endDate = leaveDateEnd && leaveDateEnd >= leaveDate ? leaveDateEnd : leaveDate
      const dates = getDateRange(leaveDate, endDate)
      const rows = dates.map((d) => ({
        user_name: leaveUser,
        leave_type: leaveType,
        leave_date: d,
        is_half_day: leaveHalf,
        half_day_period: leavePeriod,
        note: leaveNote,
      }))
      await supabase.from('leave_records').insert(rows)
    }
    await fetchLeaves()
    setSaving(false)
    setShowLeaveModal(false)
  }

  async function deleteLeave(id: string) {
    setSaving(true)
    await supabase.from('leave_records').delete().eq('id', id)
    await fetchLeaves()
    setSaving(false)
    setShowLeaveModal(false)
    setSelectedDate(null)
  }

  function exportCalendarExcel() {
    const wb = XLSX.utils.book_new()
    // 工作事件
    const eventRows = events.map((e) => ({
      '日期': e.event_date, '工作名稱': e.title, '說明': e.description,
      '開始': e.start_time, '結束': e.end_time, '全天': e.is_all_day ? '是' : '',
      '廠商': e.vendor, '人員': e.assignees.join(', '),
    }))
    const ws1 = XLSX.utils.json_to_sheet(eventRows.length > 0 ? eventRows : [{}])
    if (eventRows.length > 0) { ws1['!cols'] = Object.keys(eventRows[0]).map((k) => ({ wch: Math.min(Math.max(k.length * 2, ...eventRows.map((r) => String(r[k as keyof typeof r] || '').length)), 40) })) }
    XLSX.utils.book_append_sheet(wb, ws1, '工作事件')
    // 請假記錄
    const leaveRows = leaves.map((l) => ({
      '日期': l.leave_date, '人員': l.user_name, '假別': LEAVE_TYPES[l.leave_type] || l.leave_type,
      '半天': l.is_half_day ? (l.half_day_period === 'morning' ? '上午' : '下午') : '', '備註': l.note,
    }))
    const ws2 = XLSX.utils.json_to_sheet(leaveRows.length > 0 ? leaveRows : [{}])
    if (leaveRows.length > 0) { ws2['!cols'] = Object.keys(leaveRows[0]).map((k) => ({ wch: Math.min(Math.max(k.length * 2, ...leaveRows.map((r) => String(r[k as keyof typeof r] || '').length)), 40) })) }
    XLSX.utils.book_append_sheet(wb, ws2, '請假記錄')
    XLSX.writeFile(wb, `工作月曆_${new Date().toISOString().split('T')[0]}.xlsx`)
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
              <button onClick={exportCalendarExcel} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1">
                <Download className="w-4 h-4" /> 匯出
              </button>
              <button onClick={() => openNewLeave(selectedDate || undefined)} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] flex items-center gap-1">
                <FileText className="w-4 h-4" /> 請假
              </button>
              <button onClick={() => openNewEvent(selectedDate || undefined)} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
                <Plus className="w-4 h-4" /> 新增工作
              </button>
            </div>
          </div>

          <CalendarGrid
            events={calendarEvents}
            onDateClick={(date) => setSelectedDate(prev => prev && isSameDay(prev, date) ? null : date)}
            onEventClick={(event) => {
              if (events.find((e) => e.id === event.id)) {
                openEditEvent(event.id)
              } else if (leaves.find((l) => l.id === event.id)) {
                openEditLeave(event.id)
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
                        <th className="text-left px-4 py-3 font-medium">廠商</th>
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
                          <td className="px-4 py-3 text-xs">{e.vendor || '-'}</td>
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
              <div key={lv.id} className="mb-3 p-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-hover)]" onClick={() => openEditLeave(lv.id)}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{lv.user_name} — {LEAVE_TYPES[lv.leave_type]}</div>
                  <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </div>
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
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={formAllDay} onChange={(e) => { setFormAllDay(e.target.checked); if (e.target.checked) { setFormStartTime('00:00'); setFormEndTime('23:59') } }} className="rounded" />
              全天
            </label>
            {!formAllDay && (
              <>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={formStartTime === '08:30' && formEndTime === '12:00'} onChange={(e) => { if (e.target.checked) { setFormStartTime('08:30'); setFormEndTime('12:00') } }} className="rounded" />
                  上午
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={formStartTime === '13:30' && formEndTime === '17:30'} onChange={(e) => { if (e.target.checked) { setFormStartTime('13:30'); setFormEndTime('17:30') } }} className="rounded" />
                  下午
                </label>
              </>
            )}
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
            <label className="block text-sm font-medium mb-1">廠商</label>
            <select
              value={formVendor}
              onChange={(e) => {
                const v = e.target.value
                setFormVendor(v)
                if (v && v !== '無' && !formAssignees.includes(v)) {
                  setFormAssignees((prev) => [...prev, v])
                }
              }}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
            >
              <option value="">請選擇廠商</option>
              <option value="無">無</option>
              {vendorNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
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
              {formAssignees.filter((a) => !users.includes(a)).map((vendorName) => (
                <button
                  key={vendorName}
                  onClick={() => setFormAssignees((prev) => prev.filter((n) => n !== vendorName))}
                  className="px-3 py-1 text-sm rounded-full border bg-amber-500 text-white border-amber-500"
                  title="點擊移除"
                >
                  {vendorName} ✕
                </button>
              ))}
            </div>
          </div>
          {/* 保養工作 - 只在新增時顯示 */}
          {!editingEvent && (
            <div className="p-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formIsMaint} onChange={(e) => setFormIsMaint(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">同步新增至保養記錄</span>
              </label>
              {formIsMaint && (
                <div className="mt-2">
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">保養類別</label>
                  <select value={formMaintCat} onChange={(e) => setFormMaintCat(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                    {maintCategories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

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
      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title={editingLeave ? '編輯請假' : '新增請假'}>
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
          {editingLeave ? (
            <div>
              <label className="block text-sm font-medium mb-1">日期 *</label>
              <input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">日期區間 *</label>
              <div className="flex items-center gap-2">
                <input type="date" value={leaveDate} onChange={(e) => { setLeaveDate(e.target.value); if (!leaveDateEnd || e.target.value > leaveDateEnd) setLeaveDateEnd(e.target.value) }} className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                <span className="text-sm text-[var(--color-text-muted)]">至</span>
                <input type="date" value={leaveDateEnd} min={leaveDate} onChange={(e) => setLeaveDateEnd(e.target.value)} className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg" />
              </div>
              {leaveDate && leaveDateEnd && leaveDateEnd >= leaveDate && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  共 {getDateRange(leaveDate, leaveDateEnd).length} 天
                </p>
              )}
            </div>
          )}
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
          <div className="flex gap-2 pt-2">
            {editingLeave && (
              <button onClick={() => deleteLeave(editingLeave.id)} disabled={saving} className="px-4 py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger-dim)] flex items-center gap-1 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 刪除
              </button>
            )}
            <div className="flex-1" />
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
