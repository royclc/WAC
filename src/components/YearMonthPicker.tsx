'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface YearMonthPickerProps {
  currentDate: Date
  onChange: (date: Date) => void
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function YearMonthPicker({ currentDate, onChange }: YearMonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setPickerYear(currentDate.getFullYear())
  }, [currentDate])

  const rocYear = currentDate.getFullYear() - 1911
  const currentMonth = currentDate.getMonth()

  function selectMonth(month: number) {
    onChange(new Date(pickerYear, month, 1))
    setOpen(false)
  }

  function goToToday() {
    onChange(new Date())
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors"
      >
        <CalendarDays className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span className="font-medium">{rocYear}年{currentMonth + 1}月</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl shadow-xl border border-[var(--color-border)] p-3 w-[280px]">
          {/* Year selector */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPickerYear(pickerYear - 1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-sm">{pickerYear - 1911}年 ({pickerYear})</span>
            <button onClick={() => setPickerYear(pickerYear + 1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((label, i) => {
              const isSelected = pickerYear === currentDate.getFullYear() && i === currentMonth
              const isCurrentMonth = pickerYear === new Date().getFullYear() && i === new Date().getMonth()
              return (
                <button
                  key={i}
                  onClick={() => selectMonth(i)}
                  className={`py-1.5 text-sm rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white font-medium'
                      : isCurrentMonth
                        ? 'border border-[var(--color-primary)] text-[var(--color-primary)]'
                        : 'hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Today button */}
          <button
            onClick={goToToday}
            className="w-full mt-2 py-1.5 text-xs text-[var(--color-primary)] border border-[var(--color-border)] rounded-lg hover:bg-blue-50"
          >
            回到今天
          </button>
        </div>
      )}
    </div>
  )
}
