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

export { format, isSameMonth, isSameDay, isToday, addMonths, subMonths, zhTW }
