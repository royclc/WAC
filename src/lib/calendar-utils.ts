import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDaysInMonth,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function getCalendarDays(date: Date): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  return eachDayOfInterval({ start: calStart, end: calEnd })
}

export function formatMonthTitle(date: Date): string {
  const year = date.getFullYear() - 1911
  const month = date.getMonth() + 1
  return `${year}年${month}月`
}

export function getMonthHours(year: number, month: number): number {
  return getDaysInMonth(new Date(year, month - 1)) * 24
}

/**
 * 將 TIMESTAMPTZ 字串解析為本地 Date，忽略時區偏移。
 * 例如 "2026-05-19T08:30:00+00:00" → 視為 2026-05-19 08:30 本地時間
 */
export function parseLocalDate(dtStr: string): Date {
  // 取前 16 碼 "yyyy-MM-ddTHH:mm" 或處理空格分隔
  const s = dtStr.replace(' ', 'T').slice(0, 16)
  const [datePart, timePart] = s.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  if (!timePart) return new Date(y, m - 1, d)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

export { format, isSameMonth, isSameDay, isToday, addMonths, subMonths, zhTW }
