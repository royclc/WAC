'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

interface CalendarEvent {
  id: string
  date: Date
  title: string
  color?: string
  subtitle?: string
}

interface CalendarGridProps {
  events?: CalendarEvent[]
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  renderDayContent?: (date: Date, dayEvents: CalendarEvent[]) => React.ReactNode
  selectedDate?: Date | null
  onMonthChange?: (date: Date) => void
}

export default function CalendarGrid({
  events = [],
  onDateClick,
  onEventClick,
  renderDayContent,
  selectedDate,
  onMonthChange,
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonthRaw] = useState(new Date())
  const setCurrentMonth = (d: Date) => {
    setCurrentMonthRaw(d)
    onMonthChange?.(d)
  }
  const days = getCalendarDays(currentMonth)

  function getEventsForDay(date: Date) {
    return events.filter((e) => isSameDay(e.date, date))
  }

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-[var(--color-hover)] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 hover:bg-[var(--color-hover)] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{formatMonthTitle(currentMonth)}</h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 hover:bg-[var(--color-hover)] rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <YearMonthPicker currentDate={currentMonth} onChange={setCurrentMonth} />
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-[var(--color-hover)] rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-3 ${
              i === 0 ? 'text-[var(--color-weekend-sun)]' : i === 6 ? 'text-[var(--color-weekend-sat)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
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
              onClick={() => onDateClick?.(date)}
              className={`min-h-[110px] border-b border-r border-[var(--color-border)] p-1.5 cursor-pointer transition-colors ${
                !inMonth ? 'bg-[var(--color-day-outside)]' : 'hover:bg-[var(--color-table-row-hover)]'
              } ${selected ? 'bg-[var(--color-active)] ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                    today ? 'bg-[var(--color-primary)] text-white font-bold' : ''
                  } ${!inMonth ? 'text-[var(--color-text-dim)]' : ''} ${
                    dayOfWeek === 0 ? 'text-[var(--color-weekend-sun)]' : dayOfWeek === 6 ? 'text-[var(--color-weekend-sat)]' : ''
                  }`}
                >
                  {format(date, 'd')}
                </span>
              </div>

              {renderDayContent ? (
                renderDayContent(date, dayEvents)
              ) : (
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className="text-xs px-1.5 py-0.5 rounded truncate text-white"
                      style={{ backgroundColor: event.color || '#06b6d4' }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-[var(--color-text-muted)] px-1.5">
                      +{dayEvents.length - 3} 更多
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
