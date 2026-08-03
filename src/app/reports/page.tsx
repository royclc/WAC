'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import { BarChart3, Wifi, HardDrive, ChevronDown, FileDown, Loader2 } from 'lucide-react'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import { supabase } from '@/lib/supabase'
import { parseLocalDate } from '@/lib/calendar-utils'
import { getDaysInMonth } from 'date-fns'

// ── Types ──

interface NetworkAsset {
  id: string
  name: string
  unit: string
  majorCategory: string
  zone: 'internal' | 'external'
  deviceType: string
  quantity: number
}

interface DowntimeEvent {
  id: string
  asset_id: string
  plan_type: 'planned' | 'unplanned'
  title: string
  start_time: string
  end_time: string
  is_external: boolean
}

interface Circuit {
  id: string
  unit: string
  circuit_number: string
  bandwidth: string
  ip_address: string
}

interface CircuitEvent {
  id: string
  circuit_id: string
  plan_type: 'planned' | 'unplanned'
  title: string
  start_time: string
  end_time: string
  is_external: boolean
}

interface ServerAsset {
  id: string
  name: string
  quantity: number
}

interface ServerEvent {
  id: string
  asset_id: string
  plan_type: 'planned' | 'unplanned'
  title: string
  start_time: string
  end_time: string
  is_external: boolean
}

// ── Quarter date utilities ──

interface QuarterPeriod {
  start: Date
  end: Date
  label: string
}

function getQuarterMonthPeriods(rocYear: number, quarter: number): QuarterPeriod[] {
  const adYear = rocYear + 1911
  const periods: QuarterPeriod[] = []

  const quarterStarts: Record<number, { year: number; month: number; day: number }[]> = {
    1: [
      { year: adYear - 1, month: 11, day: 25 },
      { year: adYear, month: 0, day: 25 },
      { year: adYear, month: 1, day: 25 },
    ],
    2: [
      { year: adYear, month: 2, day: 25 },
      { year: adYear, month: 3, day: 25 },
      { year: adYear, month: 4, day: 25 },
    ],
    3: [
      { year: adYear, month: 5, day: 25 },
      { year: adYear, month: 6, day: 25 },
      { year: adYear, month: 7, day: 25 },
    ],
    4: [
      { year: adYear, month: 8, day: 25 },
      { year: adYear, month: 9, day: 25 },
      { year: adYear, month: 10, day: 25 },
    ],
  }

  const starts = quarterStarts[quarter]
  starts.forEach((s, i) => {
    const start = new Date(s.year, s.month, s.day + 1)
    let endDate: Date
    if (i < 2) {
      const next = starts[i + 1]
      endDate = new Date(next.year, next.month, next.day)
    } else {
      const quarterEnds: Record<number, { year: number; month: number }> = {
        1: { year: adYear, month: 2 },
        2: { year: adYear, month: 5 },
        3: { year: adYear, month: 8 },
        4: { year: adYear, month: 11 },
      }
      const qe = quarterEnds[quarter]
      endDate = new Date(qe.year, qe.month, 25)
    }

    const sRoc = start.getFullYear() - 1911
    const eRoc = endDate.getFullYear() - 1911
    const pad = (n: number) => String(n).padStart(2, '0')
    const label = `${sRoc}/${pad(start.getMonth() + 1)}/${pad(start.getDate())}~${eRoc}/${pad(endDate.getMonth() + 1)}/${pad(endDate.getDate())}`

    periods.push({ start, end: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999), label })
  })

  return periods
}

function getQuarterRange(rocYear: number, quarter: number): { start: Date; end: Date } {
  const periods = getQuarterMonthPeriods(rocYear, quarter)
  return { start: periods[0].start, end: periods[2].end }
}

function getCurrentYearMonth(): { rocYear: number; month: number } {
  const now = new Date()
  return { rocYear: now.getFullYear() - 1911, month: now.getMonth() + 1 }
}

function monthToQuarter(month: number): number {
  return Math.ceil(month / 3)
}

function monthToPeriodIndex(month: number): number {
  return (month - 1) % 3
}

function getHoursBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 3600000)
}

// ── Stat calculation for network assets ──

function calcPeriodStats(
  assets: NetworkAsset[],
  events: DowntimeEvent[],
  periodStart: Date,
  periodEnd: Date,
): { totalCount: number; hoursPerDevice: number; plannedHours: number; unplannedHours: number; unplannedNonExternalHours: number; availabilityPct: number } {
  const totalCount = assets.reduce((sum, a) => sum + a.quantity, 0)
  const hoursPerDevice = getHoursBetween(periodStart, new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1))

  let plannedMins = 0
  let unplannedMins = 0
  let unplannedNonExternalMins = 0

  assets.forEach((asset) => {
    events.filter((e) => e.asset_id === asset.id).forEach((e) => {
      const eStart = parseLocalDate(e.start_time)
      const eEnd = parseLocalDate(e.end_time)
      const s = eStart < periodStart ? periodStart : eStart
      const ed = eEnd > periodEnd ? periodEnd : eEnd
      if (ed > s) {
        const mins = ((ed.getTime() - s.getTime()) / 60000) * asset.quantity
        if (e.plan_type === 'planned') plannedMins += mins
        else {
          unplannedMins += mins
          if (!e.is_external) unplannedNonExternalMins += mins
        }
      }
    })
  })

  const plannedHours = Math.round((plannedMins / 60) * 100) / 100
  const unplannedHours = Math.round((unplannedMins / 60) * 100) / 100
  const unplannedNonExternalHours = Math.round((unplannedNonExternalMins / 60) * 100) / 100
  const totalHours = hoursPerDevice * totalCount
  const availabilityPct = totalHours > 0
    ? Math.floor(((totalHours - unplannedNonExternalHours) / totalHours) * 10000) / 100
    : 100

  return { totalCount, hoursPerDevice, plannedHours, unplannedHours, unplannedNonExternalHours, availabilityPct }
}

// ── Stat calculation for server assets ──

function calcServerPeriodStats(
  assets: ServerAsset[],
  events: ServerEvent[],
  periodStart: Date,
  periodEnd: Date,
): { totalCount: number; hoursPerDevice: number; totalHours: number; plannedHours: number; unplannedHours: number; unplannedNonExternalHours: number; availabilityPct: number }[] {
  return assets.map((asset) => {
    const hoursPerDevice = getHoursBetween(periodStart, new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1))
    let plannedMins = 0
    let unplannedMins = 0
    let unplannedNonExternalMins = 0

    events.filter((e) => e.asset_id === asset.id).forEach((e) => {
      const eStart = parseLocalDate(e.start_time)
      const eEnd = parseLocalDate(e.end_time)
      const s = eStart < periodStart ? periodStart : eStart
      const ed = eEnd > periodEnd ? periodEnd : eEnd
      if (ed > s) {
        const mins = ((ed.getTime() - s.getTime()) / 60000) * asset.quantity
        if (e.plan_type === 'planned') plannedMins += mins
        else {
          unplannedMins += mins
          if (!e.is_external) unplannedNonExternalMins += mins
        }
      }
    })

    const plannedHours = Math.round((plannedMins / 60) * 100) / 100
    const unplannedHours = Math.round((unplannedMins / 60) * 100) / 100
    const unplannedNonExternalHours = Math.round((unplannedNonExternalMins / 60) * 100) / 100
    const totalHours = hoursPerDevice * asset.quantity
    const availabilityPct = totalHours > 0
      ? Math.floor(((totalHours - unplannedNonExternalHours) / totalHours) * 10000) / 100
      : 100

    return { totalCount: asset.quantity, hoursPerDevice, totalHours, plannedHours, unplannedHours, unplannedNonExternalHours, availabilityPct }
  })
}

// ── Circuit event helpers ──

interface CircuitEventSummary {
  unit: string
  circuit_number: string
  bandwidth: string
  ip_address: string
  stopPeriod: string
  totalHours: number
  reason: string
  plan_type: 'planned' | 'unplanned'
}

function getCircuitEventSummaries(
  circuits: Circuit[],
  events: CircuitEvent[],
  periodStart: Date,
  periodEnd: Date,
  filterType?: 'planned' | 'unplanned',
): CircuitEventSummary[] {
  const pad = (n: number) => String(n).padStart(2, '0')
  const formatDT = (d: Date) => {
    const roc = d.getFullYear() - 1911
    return `${roc}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const results: CircuitEventSummary[] = []

  circuits.forEach((circuit) => {
    const circuitEvents = events.filter((e) => {
      if (e.circuit_id !== circuit.id) return false
      if (filterType && e.plan_type !== filterType) return false
      const eStart = parseLocalDate(e.start_time)
      const eEnd = parseLocalDate(e.end_time)
      return eEnd > periodStart && eStart < periodEnd
    })

    if (circuitEvents.length === 0) {
      if (!filterType) {
        results.push({
          unit: circuit.unit,
          circuit_number: circuit.circuit_number,
          bandwidth: circuit.bandwidth || '',
          ip_address: circuit.ip_address || '',
          stopPeriod: '無',
          totalHours: 0,
          reason: '無',
          plan_type: 'planned',
        })
      }
    } else {
      circuitEvents.forEach((e) => {
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        const s = eStart < periodStart ? periodStart : eStart
        const ed = eEnd > periodEnd ? periodEnd : eEnd
        const hours = Math.round(((ed.getTime() - s.getTime()) / 3600000) * 100) / 100

        results.push({
          unit: circuit.unit,
          circuit_number: circuit.circuit_number,
          bandwidth: circuit.bandwidth || '',
          ip_address: circuit.ip_address || '',
          stopPeriod: `${formatDT(s)}~${formatDT(ed)}`,
          totalHours: hours,
          reason: e.title,
          plan_type: e.plan_type,
        })
      })
    }
  })

  return results
}

// ── Device type grouping ──

interface DeviceGroup {
  label: string
  assets: NetworkAsset[]
}

function getDeviceGroups(networkAssets: NetworkAsset[]): DeviceGroup[] {
  const groups: DeviceGroup[] = []
  const hqZones: Array<{ zone: 'internal' | 'external'; label: string }> = [
    { zone: 'internal', label: '內網' },
    { zone: 'external', label: '外網' },
  ]
  const hqDeviceTypes = ['防火牆', '核心交換器', '主機交換器', '邊界交換器', '聚合交換器']
  const branchDeviceTypes = ['防火牆', '前端交換器', '聚合交換器']

  hqZones.forEach(({ zone, label: zoneLabel }) => {
    hqDeviceTypes.forEach((dt) => {
      const matched = networkAssets.filter((a) => a.majorCategory === '總局' && a.zone === zone && a.deviceType === dt)
      groups.push({ label: `總局${zoneLabel}${dt}`, assets: matched })
    })
  })

  branchDeviceTypes.forEach((dt) => {
    const matched = networkAssets.filter((a) => a.majorCategory === '分局稽徵所' && a.deviceType === dt)
    groups.push({ label: `分局稽徵所${dt}`, assets: matched })
  })

  return groups
}

// ── Org type to majorCategory mapping ──

function orgTypeToMajorCategory(orgType: string): string {
  if (orgType === 'headquarters' || orgType === '總局') return '總局'
  return '分局稽徵所'
}

// ── Word export helpers ──

function createDocxBorders() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
  return { top: border, bottom: border, left: border, right: border }
}

function docxCell(text: string, opts?: { bold?: boolean; width?: number; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] }): TableCell {
  return new TableCell({
    borders: createDocxBorders(),
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [
      new Paragraph({
        alignment: opts?.alignment ?? AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts?.bold, size: 20, font: '標楷體' })],
      }),
    ],
  })
}

// ── Chart component ──

interface ChartData {
  month: string
  planned: number
  unplanned: number
  totalHours: number
}

// ── SVG Donut Chart ──

function DonutChart({ value, size = 120, strokeWidth = 14, color1 = '#6366f1', color2 = '#38bdf8' }: {
  value: number  // 0~100 percentage for the primary segment
  size?: number
  strokeWidth?: number
  color1?: string
  color2?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset1 = circumference * (1 - value / 100)
  const offset2 = circumference * (1 - (100 - value) / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {/* Background track */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} opacity={0.3} />
      {/* Primary segment (unplanned %) */}
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color1} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset1}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Secondary segment (available %) */}
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color2} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset2}
        style={{ transition: 'stroke-dashoffset 0.6s ease', transform: `rotate(${value * 3.6}deg)`, transformOrigin: '50% 50%' }}
      />
    </svg>
  )
}

const DONUT_COLORS: [string, string][] = [
  ['#7c3aed', '#38bdf8'],  // 季度: 紫 + 天藍
  ['#059669', '#6ee7b7'],  // 月1: 綠 + 淺綠
  ['#ea580c', '#fdba74'],  // 月2: 橘 + 淺橘
  ['#2563eb', '#93c5fd'],  // 月3: 藍 + 淺藍
]

function DonutChartSection({ data, title }: { data: ChartData[]; title: string }) {
  const totalPlanned = data.reduce((s, d) => s + d.planned, 0)
  const totalUnplanned = data.reduce((s, d) => s + d.unplanned, 0)
  const totalHours = data.reduce((s, d) => s + d.totalHours, 0)
  const unplannedPct = totalHours > 0 ? Math.round((totalUnplanned / totalHours) * 10000) / 100 : 0
  const availablePct = totalHours > 0 ? Math.round(((totalHours - totalUnplanned) / totalHours) * 10000) / 100 : 100

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
      <h3 className="font-semibold mb-4">{title}</h3>

      <div className="flex flex-wrap gap-6 items-start">
        {/* Season total donut */}
        <div className="flex flex-col items-center gap-2 min-w-[160px]">
          <div className="relative">
            <DonutChart value={unplannedPct} size={140} strokeWidth={18} color1={DONUT_COLORS[0][0]} color2={DONUT_COLORS[0][1]} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{availablePct}%</span>
              <span className="text-xs text-[var(--color-text-muted)]">可用率</span>
            </div>
          </div>
          <span className="text-sm font-medium mt-1">季度總計</span>
        </div>

        {/* Per-month donuts */}
        {data.map((d, idx) => {
          const mUnplannedPct = d.totalHours > 0 ? Math.round((d.unplanned / d.totalHours) * 10000) / 100 : 0
          const mAvailablePct = d.totalHours > 0 ? Math.round(((d.totalHours - d.unplanned) / d.totalHours) * 10000) / 100 : 100
          const hasData = d.totalHours > 0
          const [c1, c2] = DONUT_COLORS[(idx + 1) % DONUT_COLORS.length]

          return (
            <div key={d.month} className="flex flex-col items-center gap-2 min-w-[120px]">
              <div className="relative">
                <DonutChart
                  value={hasData ? mUnplannedPct : 0}
                  size={100}
                  strokeWidth={12}
                  color1={c1}
                  color2={c2}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {hasData ? (
                    <>
                      <span className="text-lg font-bold">{mAvailablePct}%</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">可用率</span>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">尚無資料</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{d.month}</span>
            </div>
          )
        })}
      </div>

      {/* Legend & totals */}
      <div className="flex flex-wrap items-center gap-6 text-sm border-t border-[var(--color-border)] pt-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#38bdf8' }} />
          <span>可用時數: {(totalHours - totalPlanned - totalUnplanned).toFixed(1)} hrs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
          <span>計畫性停機: {totalPlanned.toFixed(1)} hrs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
          <span>非計畫性停機: {totalUnplanned.toFixed(1)} hrs</span>
        </div>
        <div className="ml-auto font-medium">
          服務總時數: {totalHours.toFixed(0)} hrs
        </div>
      </div>
    </div>
  )
}

// ── Component ──

export default function ReportsPage() {
  const { rocYear: defaultRocYear, month: defaultMonth } = getCurrentYearMonth()
  const [rocYear, setRocYear] = useState(defaultRocYear)
  const [month, setMonth] = useState(defaultMonth)
  const quarter = monthToQuarter(month)
  const [mainTab, setMainTab] = useState<'hardware' | 'network'>('network')
  const [networkSubTab, setNetworkSubTab] = useState<'monthly' | 'fiber'>('monthly')
  const [upToMonth, setUpToMonth] = useState(true)

  // ── Supabase data states ──
  const [networkAssets, setNetworkAssets] = useState<NetworkAsset[]>([])
  const [downtimeEvents, setDowntimeEvents] = useState<DowntimeEvent[]>([])
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [circuitEvents, setCircuitEvents] = useState<CircuitEvent[]>([])
  const [serverAssets, setServerAssets] = useState<ServerAsset[]>([])
  const [serverEvents, setServerEvents] = useState<ServerEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Event detail popup
  const [detailPopup, setDetailPopup] = useState<{
    title: string
    events: Array<{ startTime: string; endTime: string; unit: string; assetName: string; title: string; planType: string; hours: number }>
  } | null>(null)

  // ── Fetch data from Supabase ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all in parallel
      const [
        { data: orgDevices },
        { data: orgs },
        { data: orgCircuits },
        { data: hwAssets },
        { data: dtEvents },
        { data: cEvents },
      ] = await Promise.all([
        supabase.from('org_devices').select('*'),
        supabase.from('organizations').select('*'),
        supabase.from('org_circuits').select('*'),
        supabase.from('hardware_assets').select('*').eq('is_active', true),
        supabase.from('downtime_events').select('*'),
        supabase.from('circuit_events').select('*'),
      ])

      // Build org lookup
      const orgMap = new Map<string, { name: string; type: string; exclude: boolean }>()
      orgs?.forEach((o: { id: string; name: string; type: string; exclude_from_availability?: boolean }) => {
        orgMap.set(o.id, { name: o.name, type: o.type, exclude: o.exclude_from_availability ?? false })
      })

      // Build set of excluded org IDs
      const excludedOrgIds = new Set<string>()
      orgMap.forEach((v, k) => { if (v.exclude) excludedOrgIds.add(k) })

      // Map org_devices -> NetworkAsset (filter out excluded orgs)
      const mappedNetworkAssets: NetworkAsset[] = (orgDevices ?? [])
        .filter((d: { org_id: string }) => !excludedOrgIds.has(d.org_id))
        .map((d: {
          id: string; org_id: string; name: string; zone: 'internal' | 'external'; device_type: string; vendor: string; quantity: number
        }) => {
          const org = orgMap.get(d.org_id)
          return {
            id: d.id,
            name: d.name,
            unit: org?.name ?? '',
            majorCategory: org ? orgTypeToMajorCategory(org.type) : '',
            zone: d.zone,
            deviceType: d.device_type,
            quantity: d.quantity,
          }
        })
      setNetworkAssets(mappedNetworkAssets)

      // Map downtime_events -> DowntimeEvent (asset_type = 'network')
      const mappedDowntimeEvents: DowntimeEvent[] = (dtEvents ?? [])
        .filter((e: { asset_type: string }) => e.asset_type === 'network')
        .map((e: any) => ({
          id: e.id,
          asset_id: e.asset_id,
          plan_type: e.plan_type,
          title: e.title,
          start_time: e.start_time,
          end_time: e.end_time,
          is_external: e.is_external || false,
        }))
      setDowntimeEvents(mappedDowntimeEvents)

      // Map org_circuits -> Circuit (filter out excluded orgs)
      const mappedCircuits: Circuit[] = (orgCircuits ?? [])
        .filter((c: { org_id: string }) => !excludedOrgIds.has(c.org_id))
        .map((c: {
          id: string; org_id: string; circuit_number: string; bandwidth: string; ip_address: string
        }) => {
          const org = orgMap.get(c.org_id)
          return {
            id: c.id,
            unit: org?.name ?? '',
            circuit_number: c.circuit_number,
            bandwidth: c.bandwidth,
            ip_address: c.ip_address ?? '',
          }
        })
      setCircuits(mappedCircuits)

      // Map circuit_events -> CircuitEvent
      const mappedCircuitEvents: CircuitEvent[] = (cEvents ?? []).map((e: any) => ({
        id: e.id,
        circuit_id: e.circuit_id,
        plan_type: e.plan_type,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
        is_external: e.is_external || false,
      }))
      setCircuitEvents(mappedCircuitEvents)

      // Map hardware_assets -> ServerAsset (each row = 1 asset, quantity = 1)
      const mappedServerAssets: ServerAsset[] = (hwAssets ?? []).map((h: {
        id: string; name: string
      }) => ({
        id: h.id,
        name: h.name,
        quantity: 1,
      }))
      setServerAssets(mappedServerAssets)

      // Map downtime_events (asset_type = 'server') -> ServerEvent
      const mappedServerEvents: ServerEvent[] = (dtEvents ?? [])
        .filter((e: { asset_type: string }) => e.asset_type === 'server')
        .map((e: any) => ({
          id: e.id,
          asset_id: e.asset_id,
          plan_type: e.plan_type,
          title: e.title,
          start_time: e.start_time,
          end_time: e.end_time,
          is_external: e.is_external || false,
        }))
      setServerEvents(mappedServerEvents)
    } catch (err) {
      console.error('Failed to fetch report data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Quarter periods
  const quarterPeriods = useMemo(() => getQuarterMonthPeriods(rocYear, quarter), [rocYear, quarter])
  const quarterRange = useMemo(() => getQuarterRange(rocYear, quarter), [rocYear, quarter])
  const currentPeriodIndex = useMemo(() => monthToPeriodIndex(month), [month])
  const effectiveMaxIndex = upToMonth ? currentPeriodIndex : 2
  const effectiveRange = useMemo(() => {
    if (!upToMonth) return quarterRange
    const endPeriod = quarterPeriods[currentPeriodIndex]
    return endPeriod ? { start: quarterRange.start, end: endPeriod.end } : quarterRange
  }, [upToMonth, quarterRange, quarterPeriods, currentPeriodIndex])
  const calendarMonthRange = useMemo(() => {
    const adYear = rocYear + 1911
    const start = new Date(adYear, month - 1, 1)
    const end = new Date(adYear, month, 1)
    return { start, end }
  }, [rocYear, month])
  const calendarMonthHours = useMemo(() => getDaysInMonth(new Date(rocYear + 1911, month - 1)) * 24, [rocYear, month])
  const fiberMonthLabel = `${rocYear}年${month}月`
  const deviceGroups = useMemo(() => getDeviceGroups(networkAssets), [networkAssets])

  const now = new Date()

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const formatDTShort = (d: Date) => {
    const roc = d.getFullYear() - 1911
    return `${roc}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }

  function showNetworkEventDetail(group: DeviceGroup, planType: 'planned' | 'unplanned', period?: QuarterPeriod) {
    const assetIds = new Set(group.assets.map((a) => a.id))
    const assetMap = new Map(group.assets.map((a) => [a.id, a]))
    const pStart = period?.start ?? effectiveRange.start
    const pEnd = period?.end ?? effectiveRange.end
    const events = downtimeEvents
      .filter((e) => assetIds.has(e.asset_id) && e.plan_type === planType)
      .filter((e) => {
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        return eEnd > pStart && eStart < pEnd
      })
      .map((e) => {
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        const s = eStart < pStart ? pStart : eStart
        const ed = eEnd > pEnd ? pEnd : eEnd
        const hours = Math.round(((ed.getTime() - s.getTime()) / 3600000) * 100) / 100
        const asset = assetMap.get(e.asset_id)
        return {
          startTime: formatDTShort(s),
          endTime: formatDTShort(ed),
          unit: asset?.unit ?? '',
          assetName: asset?.name ?? '',
          title: e.title,
          planType: planType === 'planned' ? '計畫性' : '非計畫性',
          hours,
        }
      })
    const periodLabel = period ? ` (${period.label})` : ''
    setDetailPopup({
      title: `${group.label} — ${planType === 'planned' ? '計畫性' : '非計畫性'}停止服務明細${periodLabel}`,
      events,
    })
  }

  function showServerEventDetail(asset: ServerAsset, planType: 'planned' | 'unplanned', period?: QuarterPeriod) {
    const pStart = period?.start ?? effectiveRange.start
    const pEnd = period?.end ?? effectiveRange.end
    const evts = serverEvents
      .filter((e) => e.asset_id === asset.id && e.plan_type === planType)
      .filter((e) => {
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        return eEnd > pStart && eStart < pEnd
      })
      .map((e) => {
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        const s = eStart < pStart ? pStart : eStart
        const ed = eEnd > pEnd ? pEnd : eEnd
        const hours = Math.round(((ed.getTime() - s.getTime()) / 3600000) * 100) / 100
        return {
          startTime: formatDTShort(s),
          endTime: formatDTShort(ed),
          unit: '',
          assetName: asset.name,
          title: e.title,
          planType: planType === 'planned' ? '計畫性' : '非計畫性',
          hours,
        }
      })
    const periodLabel = period ? ` (${period.label})` : ''
    setDetailPopup({
      title: `${asset.name} — ${planType === 'planned' ? '計畫性' : '非計畫性'}停止服務明細${periodLabel}`,
      events: evts,
    })
  }

  // ═══ Network: Part 1 - Quarterly device breakdown ═══
  const quarterlyReport = useMemo(() => {
    return deviceGroups.map((group) => {
      const monthRows = quarterPeriods.map((period, idx) => {
        const isPast = period.end < now || (period.start <= now && period.end >= now)
        if (!isPast || idx > effectiveMaxIndex) {
          return { period, hasData: false, totalCount: 0, hoursPerDevice: 0, plannedHours: 0, unplannedHours: 0, unplannedNonExternalHours: 0, availabilityPct: 0 }
        }
        const stats = calcPeriodStats(group.assets, downtimeEvents, period.start, period.end)
        return { period, hasData: true, ...stats }
      })

      const periodsWithData = monthRows.filter((r) => r.hasData)
      const totalCount = group.assets.reduce((sum, a) => sum + a.quantity, 0)
      const qTotalHoursPerDevice = periodsWithData.reduce((s, r) => s + r.hoursPerDevice, 0)
      const qPlanned = periodsWithData.reduce((s, r) => s + r.plannedHours, 0)
      const qUnplanned = periodsWithData.reduce((s, r) => s + r.unplannedHours, 0)
      const qUnplannedNonExternal = periodsWithData.reduce((s, r) => s + (r.unplannedNonExternalHours || 0), 0)
      const qTotalHours = qTotalHoursPerDevice * totalCount
      const qPct = qTotalHours > 0
        ? Math.floor(((qTotalHours - qUnplannedNonExternal) / qTotalHours) * 10000) / 100
        : 100

      return {
        label: group.label,
        totalCount,
        monthRows,
        quarterly: {
          hoursPerDevice: qTotalHoursPerDevice,
          plannedHours: Math.round(qPlanned * 100) / 100,
          unplannedHours: Math.round(qUnplanned * 100) / 100,
          availabilityPct: qPct,
        },
      }
    })
  }, [deviceGroups, quarterPeriods, downtimeEvents, effectiveMaxIndex])

  // ═══ Network: Part 2 - Monthly summary ═══

  // ═══ Network: Quarter event footnotes (new system) ═══
  // [註1] = 固定說明文字, [註2+] = 各事件（不同設備類型同事件共用同一個註）
  interface NoteEventLine {
    startTime: string
    endTime: string
    unit: string
    title: string
    planType: string
    rawPlanType: string
    hours: number
    deviceBreakdown: Array<{ deviceType: string; quantity: number }>
  }

  interface NetworkDeviceNote {
    noteNum: number
    deviceLabel: string
    eventLines: NoteEventLine[]
    hasPlanned: boolean
    hasUnplanned: boolean
  }

  interface ServerEventDetail {
    startTime: string
    endTime: string
    title: string
    planType: string
    rawPlanType: string
    totalHours: number
  }

  interface ServerDeviceNote {
    noteNum: number
    deviceLabel: string
    events: ServerEventDetail[]
    hasPlanned: boolean
    hasUnplanned: boolean
  }

  const NOTE1_TEXT = '每季可用率為每月累計,將在每季最後一月進行可用率按季計算。'

  const formatNoteEventText = (ev: NoteEventLine) => {
    const breakdown = ev.deviceBreakdown
      .map((d) => `${d.quantity}台${d.deviceType}累計停止服務${ev.hours}*${d.quantity}小時`)
      .join('；')
    return `■ ${ev.startTime}～${ev.endTime}，${ev.unit}設備，${ev.title}，共停止${ev.hours}小時。${breakdown}。`
  }

  const { networkDeviceNotes, noteByDevicePlanned, noteByDeviceUnplanned } = useMemo(() => {
    const qStart = effectiveRange.start
    const qEnd = effectiveRange.end

    const assetMap = new Map<string, NetworkAsset>()
    networkAssets.forEach((a) => assetMap.set(a.id, a))

    const assetToGroup = new Map<string, string>()
    deviceGroups.forEach((g) => g.assets.forEach((a) => assetToGroup.set(a.id, g.label)))

    const pad2 = (n: number) => String(n).padStart(2, '0')
    const fmtShort = (d: Date) => `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`

    const globalMap = new Map<string, {
      startTime: string; endTime: string; title: string; rawPlanType: string; hours: number
      assets: Array<{ unit: string; deviceType: string; quantity: number }>
    }>()

    downtimeEvents.forEach((e) => {
      const eStart = parseLocalDate(e.start_time)
      const eEnd = parseLocalDate(e.end_time)
      if (eEnd <= qStart || eStart >= qEnd) return

      const asset = assetMap.get(e.asset_id)
      if (!asset) return

      const s = eStart < qStart ? qStart : eStart
      const ed = eEnd > qEnd ? qEnd : eEnd
      const hours = Math.round(((ed.getTime() - s.getTime()) / 3600000) * 100) / 100
      const dedupeKey = `${e.title}|${e.start_time}|${e.end_time}|${e.plan_type}`

      if (!globalMap.has(dedupeKey)) {
        globalMap.set(dedupeKey, { startTime: fmtShort(s), endTime: fmtShort(ed), title: e.title, rawPlanType: e.plan_type, hours, assets: [] })
      }
      const entry = globalMap.get(dedupeKey)!
      if (!entry.assets.some((a) => a.unit === asset.unit && a.deviceType === asset.deviceType)) {
        entry.assets.push({ unit: asset.unit, deviceType: asset.deviceType, quantity: asset.quantity })
      }
    })

    const deviceNoteData = new Map<string, { lines: NoteEventLine[]; hasPlanned: boolean; hasUnplanned: boolean }>()

    deviceGroups.forEach((group) => {
      const assetIds = new Set(group.assets.map((a) => a.id))
      const seenKeys = new Set<string>()

      downtimeEvents.forEach((e) => {
        if (!assetIds.has(e.asset_id)) return
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        if (eEnd <= qStart || eStart >= qEnd) return

        const dedupeKey = `${e.title}|${e.start_time}|${e.end_time}|${e.plan_type}`
        if (seenKeys.has(dedupeKey)) return
        seenKeys.add(dedupeKey)

        const ge = globalMap.get(dedupeKey)
        if (!ge) return

        const unitMap = new Map<string, Map<string, number>>()
        ge.assets.forEach((a) => {
          if (!unitMap.has(a.unit)) unitMap.set(a.unit, new Map())
          unitMap.get(a.unit)!.set(a.deviceType, a.quantity)
        })

        if (!deviceNoteData.has(group.label)) {
          deviceNoteData.set(group.label, { lines: [], hasPlanned: false, hasUnplanned: false })
        }
        const data = deviceNoteData.get(group.label)!
        if (ge.rawPlanType === 'planned') data.hasPlanned = true
        else data.hasUnplanned = true

        unitMap.forEach((dtMap, unit) => {
          data.lines.push({
            startTime: ge.startTime, endTime: ge.endTime, unit, title: ge.title,
            planType: ge.rawPlanType === 'planned' ? '計畫性' : '非計畫性',
            rawPlanType: ge.rawPlanType, hours: ge.hours,
            deviceBreakdown: Array.from(dtMap.entries()).map(([dt, qty]) => ({ deviceType: dt, quantity: qty })),
          })
        })
      })
    })

    // Build event signature per device group to share note numbers
    const groupSignatures = new Map<string, string>()
    deviceGroups.forEach((g) => {
      const data = deviceNoteData.get(g.label)
      if (!data || data.lines.length === 0) return
      const assetIds = new Set(g.assets.map((a) => a.id))
      const keys = new Set<string>()
      downtimeEvents.forEach((e) => {
        if (!assetIds.has(e.asset_id)) return
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        if (eEnd <= qStart || eStart >= qEnd) return
        keys.add(`${e.title}|${e.start_time}|${e.end_time}|${e.plan_type}`)
      })
      groupSignatures.set(g.label, Array.from(keys).sort().join('||'))
    })

    const signatureToNote = new Map<string, number>()
    const notes: NetworkDeviceNote[] = []
    let noteNum = 2
    deviceGroups.forEach((g) => {
      const sig = groupSignatures.get(g.label)
      if (!sig) return
      if (!signatureToNote.has(sig)) {
        signatureToNote.set(sig, noteNum)
        const data = deviceNoteData.get(g.label)!
        notes.push({ noteNum, deviceLabel: g.label, eventLines: data.lines, hasPlanned: data.hasPlanned, hasUnplanned: data.hasUnplanned })
        noteNum++
      }
    })

    const byPlanned = new Map<string, number>()
    const byUnplanned = new Map<string, number>()
    deviceGroups.forEach((g) => {
      const sig = groupSignatures.get(g.label)
      if (!sig) return
      const num = signatureToNote.get(sig)!
      const data = deviceNoteData.get(g.label)!
      if (data.hasPlanned) byPlanned.set(g.label, num)
      if (data.hasUnplanned) byUnplanned.set(g.label, num)
    })

    return { networkDeviceNotes: notes, noteByDevicePlanned: byPlanned, noteByDeviceUnplanned: byUnplanned }
  }, [downtimeEvents, deviceGroups, effectiveRange, networkAssets])

  // ═══ Circuit summaries for fiber report ═══

  // 表(a): per-circuit availability summary
  interface CircuitAvailRow { unit: string; circuit_number: string; bandwidth: string; ip_address: string; serviceHours: number; plannedHours: number; unplannedHours: number; unplannedNonExternalHours?: number }

  const circuitAvailSummary = useMemo(() => {
    const qStart = calendarMonthRange.start
    const qEnd = calendarMonthRange.end
    return circuits.map((c) => {
      let plannedMin = 0
      let unplannedMin = 0
      let unplannedNonExternalMin = 0
      circuitEvents.filter((e) => e.circuit_id === c.id).forEach((e) => {
        const eStart = parseLocalDate(e.start_time)
        const eEnd = parseLocalDate(e.end_time)
        if (eEnd <= qStart || eStart >= qEnd) return
        const s = eStart < qStart ? qStart : eStart
        const ed = eEnd > qEnd ? qEnd : eEnd
        const mins = (ed.getTime() - s.getTime()) / 60000
        if (e.plan_type === 'planned') plannedMin += mins
        else {
          unplannedMin += mins
          if (!e.is_external) unplannedNonExternalMin += mins
        }
      })
      return {
        unit: c.unit,
        circuit_number: c.circuit_number,
        bandwidth: c.bandwidth || '',
        ip_address: c.ip_address || '',
        serviceHours: calendarMonthHours,
        plannedHours: Math.round((plannedMin / 60) * 100) / 100,
        unplannedHours: Math.round((unplannedMin / 60) * 100) / 100,
        unplannedNonExternalHours: Math.round((unplannedNonExternalMin / 60) * 100) / 100,
      } as CircuitAvailRow
    })
  }, [circuits, circuitEvents, calendarMonthRange, calendarMonthHours])

  const circuitSummaryAll = useMemo(() => {
    return getCircuitEventSummaries(circuits, circuitEvents, calendarMonthRange.start, calendarMonthRange.end)
  }, [circuits, circuitEvents, calendarMonthRange])

  const circuitSummaryPlanned = useMemo(() => {
    return getCircuitEventSummaries(circuits, circuitEvents, calendarMonthRange.start, calendarMonthRange.end, 'planned')
  }, [circuits, circuitEvents, calendarMonthRange])

  const circuitSummaryUnplanned = useMemo(() => {
    return getCircuitEventSummaries(circuits, circuitEvents, calendarMonthRange.start, calendarMonthRange.end, 'unplanned')
  }, [circuits, circuitEvents, calendarMonthRange])

  // ═══ Server (hardware) stats ═══
  const serverMonthlySummary = useMemo(() => {
    const period = quarterPeriods[currentPeriodIndex]
    if (!period) return []
    return calcServerPeriodStats(serverAssets, serverEvents, period.start, period.end)
  }, [serverAssets, serverEvents, quarterPeriods, currentPeriodIndex])

  const serverQuarterlyReport = useMemo(() => {
    return serverAssets.map((asset) => {
      const monthRows = quarterPeriods.map((period, idx) => {
        const isPast = period.end < now || (period.start <= now && period.end >= now)
        if (!isPast || idx > effectiveMaxIndex) {
          return { period, hasData: false, totalCount: 0, hoursPerDevice: 0, plannedHours: 0, unplannedHours: 0, unplannedNonExternalHours: 0, availabilityPct: 0 }
        }
        const stats = calcServerPeriodStats([asset], serverEvents, period.start, period.end)
        return { period, hasData: true, ...stats[0] }
      })

      const periodsWithData = monthRows.filter((r) => r.hasData)
      const qTotalHoursPerDevice = periodsWithData.reduce((s, r) => s + r.hoursPerDevice, 0)
      const qPlanned = periodsWithData.reduce((s, r) => s + r.plannedHours, 0)
      const qUnplanned = periodsWithData.reduce((s, r) => s + r.unplannedHours, 0)
      const qUnplannedNonExternal = periodsWithData.reduce((s, r) => s + (r.unplannedNonExternalHours || 0), 0)
      const qTotalHours = qTotalHoursPerDevice * asset.quantity
      const qPct = qTotalHours > 0
        ? Math.floor(((qTotalHours - qUnplannedNonExternal) / qTotalHours) * 10000) / 100
        : 100

      return {
        label: asset.name,
        totalCount: asset.quantity,
        monthRows,
        quarterly: {
          hoursPerDevice: qTotalHoursPerDevice,
          plannedHours: Math.round(qPlanned * 100) / 100,
          unplannedHours: Math.round(qUnplanned * 100) / 100,
          availabilityPct: qPct,
        },
      }
    })
  }, [serverAssets, serverEvents, quarterPeriods, effectiveMaxIndex])

  // ═══ Server: Quarter event footnotes (same note system) ═══
  const { serverDeviceNotes, serverNoteByPlanned, serverNoteByUnplanned } = useMemo(() => {
    const qStart = effectiveRange.start
    const qEnd = effectiveRange.end

    const assetNameMap = new Map<string, string>()
    serverAssets.forEach((a) => assetNameMap.set(a.id, a.name))

    const pad2 = (n: number) => String(n).padStart(2, '0')
    const formatDT = (d: Date) => {
      const roc = d.getFullYear() - 1911
      return `${roc}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
    }

    const deviceEventsMap = new Map<string, Map<string, ServerEventDetail>>()

    serverEvents.forEach((e) => {
      const eStart = parseLocalDate(e.start_time)
      const eEnd = parseLocalDate(e.end_time)
      if (eEnd <= qStart || eStart >= qEnd) return

      const assetName = assetNameMap.get(e.asset_id) ?? ''
      if (!assetName) return

      const s = eStart < qStart ? qStart : eStart
      const ed = eEnd > qEnd ? qEnd : eEnd
      const hours = Math.round(((ed.getTime() - s.getTime()) / 3600000) * 100) / 100

      const dedupeKey = `${e.title}|${e.start_time}|${e.end_time}|${e.plan_type}`

      if (!deviceEventsMap.has(assetName)) deviceEventsMap.set(assetName, new Map())
      const evMap = deviceEventsMap.get(assetName)!
      if (!evMap.has(dedupeKey)) {
        evMap.set(dedupeKey, {
          startTime: formatDT(s),
          endTime: formatDT(ed),
          title: e.title,
          planType: e.plan_type === 'planned' ? '計畫性' : '非計畫性',
          rawPlanType: e.plan_type,
          totalHours: hours,
        })
      }
    })

    const assetOrder = serverAssets.map((a) => a.name)

    const groupSignatures = new Map<string, string>()
    assetOrder.forEach((label) => {
      const evMap = deviceEventsMap.get(label)
      if (!evMap || evMap.size === 0) return
      groupSignatures.set(label, Array.from(evMap.keys()).sort().join('||'))
    })

    const signatureToNote = new Map<string, number>()
    const notes: ServerDeviceNote[] = []
    let noteNum = 2
    assetOrder.forEach((label) => {
      const sig = groupSignatures.get(label)
      if (!sig) return
      if (!signatureToNote.has(sig)) {
        signatureToNote.set(sig, noteNum)
        const evMap = deviceEventsMap.get(label)!
        const events = Array.from(evMap.values())
        notes.push({
          noteNum,
          deviceLabel: label,
          events,
          hasPlanned: events.some((ev) => ev.rawPlanType === 'planned'),
          hasUnplanned: events.some((ev) => ev.rawPlanType === 'unplanned'),
        })
        noteNum++
      }
    })

    const byPlanned = new Map<string, number>()
    const byUnplanned = new Map<string, number>()
    assetOrder.forEach((label) => {
      const sig = groupSignatures.get(label)
      if (!sig) return
      const num = signatureToNote.get(sig)!
      const evMap = deviceEventsMap.get(label)!
      const events = Array.from(evMap.values())
      if (events.some((ev) => ev.rawPlanType === 'planned')) byPlanned.set(label, num)
      if (events.some((ev) => ev.rawPlanType === 'unplanned')) byUnplanned.set(label, num)
    })

    return { serverDeviceNotes: notes, serverNoteByPlanned: byPlanned, serverNoteByUnplanned: byUnplanned }
  }, [serverEvents, serverAssets, effectiveRange])

  // ═══ Chart data for network ═══
  const networkChartData: ChartData[] = useMemo(() => {
    return quarterPeriods.map((period, idx) => {
      const isPast = period.end < now || (period.start <= now && period.end >= now)
      const displayMonth = `${((period.start.getMonth() + 2) % 12) || 12}月`
      if (!isPast || idx > effectiveMaxIndex) return { month: displayMonth, planned: 0, unplanned: 0, totalHours: 0 }

      let planned = 0
      let unplanned = 0
      let totalH = 0
      deviceGroups.forEach((group) => {
        const stats = calcPeriodStats(group.assets, downtimeEvents, period.start, period.end)
        planned += stats.plannedHours
        unplanned += stats.unplannedHours
        totalH += stats.hoursPerDevice * stats.totalCount
      })
      return { month: displayMonth, planned, unplanned, totalHours: totalH }
    })
  }, [quarterPeriods, deviceGroups, downtimeEvents, effectiveMaxIndex])

  // ═══ Chart data for hardware ═══
  const hardwareChartData: ChartData[] = useMemo(() => {
    return quarterPeriods.map((period, idx) => {
      const isPast = period.end < now || (period.start <= now && period.end >= now)
      const displayMonth = `${((period.start.getMonth() + 2) % 12) || 12}月`
      if (!isPast || idx > effectiveMaxIndex) return { month: displayMonth, planned: 0, unplanned: 0, totalHours: 0 }

      let planned = 0
      let unplanned = 0
      let totalH = 0
      serverAssets.forEach((asset) => {
        const stats = calcServerPeriodStats([asset], serverEvents, period.start, period.end)
        planned += stats[0].plannedHours
        unplanned += stats[0].unplannedHours
        totalH += stats[0].totalHours
      })
      return { month: displayMonth, planned, unplanned, totalHours: totalH }
    })
  }, [serverAssets, serverEvents, quarterPeriods, effectiveMaxIndex])

  // ── Quarter header display ──
  const pad = (n: number) => String(n).padStart(2, '0')
  const qStartRoc = effectiveRange.start.getFullYear() - 1911
  const qEndRoc = effectiveRange.end.getFullYear() - 1911
  const quarterHeaderLabel = `${qStartRoc}年${pad(effectiveRange.start.getMonth() + 1)}月${pad(effectiveRange.start.getDate())}日~${qEndRoc}年${pad(effectiveRange.end.getMonth() + 1)}月${pad(effectiveRange.end.getDate())}日`
  const yearOptions = Array.from({ length: 5 }, (_, i) => defaultRocYear - 2 + i)

  // ═══ Word export: Network ═══
  async function exportNetworkWord() {
    // ── 表1: 各設備類型季報 ──
    const qRows: TableRow[] = []

    // 計算期間 header
    qRows.push(new TableRow({
      children: [
        docxCell('計算期間', { bold: true }),
        new TableCell({
          borders: createDocxBorders(),
          columnSpan: 5,
          children: [new Paragraph({ children: [new TextRun({ text: quarterHeaderLabel, bold: true, size: 20, font: '標楷體' })] })],
        }),
      ],
    }))

    // Column headers
    qRows.push(new TableRow({
      children: [
        docxCell('類別', { bold: true }),
        docxCell('期間', { bold: true }),
        docxCell('本季應服務總時數累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('本季計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('本季非計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('可用率', { bold: true, alignment: AlignmentType.CENTER }),
      ],
    }))

    quarterlyReport.forEach((device) => {
      const plannedNum = noteByDevicePlanned.get(device.label)
      const plannedNoteLabel = plannedNum ? `[註${plannedNum}]` : ''
      const unplannedNum = noteByDeviceUnplanned.get(device.label)
      const unplannedNoteLabel = unplannedNum ? `[註${unplannedNum}]` : ''

      device.monthRows.forEach((row, i) => {
        const cells = []
        if (i === 0) {
          cells.push(new TableCell({
            borders: createDocxBorders(),
            rowSpan: 4,
            children: [new Paragraph({ children: [new TextRun({ text: device.label, bold: true, size: 20, font: '標楷體' })] })],
          }))
        }
        cells.push(docxCell(row.period.label))
        cells.push(docxCell(row.hasData ? (device.totalCount > 1 ? `${row.hoursPerDevice}*${device.totalCount}` : `${row.hoursPerDevice}`) : '', { alignment: AlignmentType.RIGHT }))
        cells.push(docxCell(row.hasData ? `${row.plannedHours}` : '', { alignment: AlignmentType.RIGHT }))
        cells.push(docxCell(row.hasData ? `${row.unplannedHours}` : '', { alignment: AlignmentType.RIGHT }))
        cells.push(docxCell(row.hasData ? `${row.availabilityPct}%` : '', { alignment: AlignmentType.RIGHT }))
        qRows.push(new TableRow({ children: cells }))
      })

      const totalCells = [
        docxCell(`${rocYear}年第${quarter}季總計`, { bold: true }),
        docxCell(device.totalCount > 1 ? `${device.quarterly.hoursPerDevice}*${device.totalCount}` : `${device.quarterly.hoursPerDevice}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.plannedHours}${plannedNoteLabel ? `\n${plannedNoteLabel}` : ''}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.unplannedHours}${unplannedNoteLabel ? `\n${unplannedNoteLabel}` : ''}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.availabilityPct}%\n[註1]`, { alignment: AlignmentType.RIGHT, bold: true }),
      ]
      qRows.push(new TableRow({ children: totalCells }))
    })

    // Footnotes
    const allFootnotes = [
      new Paragraph({ children: [new TextRun({ text: `※【註1】${NOTE1_TEXT}`, size: 18, font: '標楷體' })] }),
      ...networkDeviceNotes.flatMap((note) => [
        new Paragraph({ children: [new TextRun({ text: `※【註${note.noteNum}】停止服務原因條列如下：`, size: 18, font: '標楷體' })] }),
        ...note.eventLines.map((ev) =>
          new Paragraph({
            children: [new TextRun({ text: `　${formatNoteEventText(ev)}`, size: 18, font: '標楷體' })],
          })
        ),
      ]),
    ]

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${rocYear}年第${quarter}季 網路統計報表`, bold: true, size: 28, font: '標楷體' })],
          }),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: '各設備類型季報', bold: true, size: 24, font: '標楷體' })] }),
          new Table({ rows: qRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          ...allFootnotes,
        ],
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `網路統計報表_${rocYear}年第${quarter}季.docx`)
  }

  // ═══ Word export: Hardware ═══
  async function exportHardwareWord() {
    // Monthly summary table
    const monthlyRows: TableRow[] = []
    monthlyRows.push(new TableRow({
      children: [
        docxCell('類別', { bold: true }),
        docxCell('本月應服務總時數(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('非計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('可用率', { bold: true, alignment: AlignmentType.CENTER }),
      ],
    }))

    serverMonthlySummary.forEach((row, idx) => {
      monthlyRows.push(new TableRow({
        children: [
          docxCell(serverAssets[idx]?.name ?? '', { bold: true }),
          docxCell(row.totalCount > 1 ? `${row.hoursPerDevice}*${row.totalCount}` : `${row.hoursPerDevice}`, { alignment: AlignmentType.RIGHT }),
          docxCell(`${row.plannedHours}`, { alignment: AlignmentType.RIGHT }),
          docxCell(`${row.unplannedHours}`, { alignment: AlignmentType.RIGHT }),
          docxCell(`${row.availabilityPct}%`, { alignment: AlignmentType.RIGHT }),
        ],
      }))
    })

    // Quarterly breakdown table
    const quarterlyRows: TableRow[] = []
    quarterlyRows.push(new TableRow({
      children: [
        docxCell('類別', { bold: true }),
        docxCell('期間', { bold: true }),
        docxCell('本季應服務總時數累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('本季計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('本季非計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
        docxCell('可用率', { bold: true, alignment: AlignmentType.CENTER }),
      ],
    }))

    serverQuarterlyReport.forEach((device) => {
      const plannedNum = serverNoteByPlanned.get(device.label)
      const plannedNoteLabel = plannedNum ? `[註${plannedNum}]` : ''
      const unplannedNum = serverNoteByUnplanned.get(device.label)
      const unplannedNoteLabel = unplannedNum ? `[註${unplannedNum}]` : ''

      device.monthRows.forEach((row, i) => {
        const cells = []
        if (i === 0) {
          cells.push(new TableCell({
            borders: createDocxBorders(),
            rowSpan: 4,
            children: [new Paragraph({ children: [new TextRun({ text: device.label, bold: true, size: 20, font: '標楷體' })] })],
          }))
        }
        cells.push(docxCell(row.period.label))
        cells.push(docxCell(row.hasData ? (device.totalCount > 1 ? `${row.hoursPerDevice}*${device.totalCount}` : `${row.hoursPerDevice}`) : '', { alignment: AlignmentType.RIGHT }))
        cells.push(docxCell(row.hasData ? `${row.plannedHours}` : '', { alignment: AlignmentType.RIGHT }))
        cells.push(docxCell(row.hasData ? `${row.unplannedHours}` : '', { alignment: AlignmentType.RIGHT }))
        cells.push(docxCell(row.hasData ? `${row.availabilityPct}%` : '', { alignment: AlignmentType.RIGHT }))
        quarterlyRows.push(new TableRow({ children: cells }))
      })

      const totalCells = [
        docxCell(`${rocYear}年第${quarter}季總計`, { bold: true }),
        docxCell(device.totalCount > 1 ? `${device.quarterly.hoursPerDevice}*${device.totalCount}` : `${device.quarterly.hoursPerDevice}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.plannedHours}${plannedNoteLabel ? `\n${plannedNoteLabel}` : ''}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.unplannedHours}${unplannedNoteLabel ? `\n${unplannedNoteLabel}` : ''}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.availabilityPct}%\n[註1]`, { alignment: AlignmentType.RIGHT, bold: true }),
      ]
      quarterlyRows.push(new TableRow({ children: totalCells }))
    })

    const hwFootnotes = [
      new Paragraph({ children: [new TextRun({ text: `※【註1】${NOTE1_TEXT}`, size: 18, font: '標楷體' })] }),
      ...serverDeviceNotes.flatMap((note) => [
        new Paragraph({ children: [new TextRun({ text: `※【註${note.noteNum}】停止服務原因條列如下：`, size: 18, font: '標楷體' })] }),
        ...note.events.map((ev) =>
          new Paragraph({
            children: [new TextRun({
              text: `　■ ${ev.startTime}～${ev.endTime}，${ev.title}（${ev.planType}），共停止${ev.totalHours}小時。`,
              size: 18, font: '標楷體',
            })],
          })
        ),
      ]),
    ]

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${rocYear}年第${quarter}季 硬體統計報表`, bold: true, size: 28, font: '標楷體' })],
          }),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `表2-4-2 月報彙總 (${quarterPeriods[currentPeriodIndex]?.label})`, bold: true, size: 24, font: '標楷體' })] }),
          new Table({ rows: monthlyRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: '表2-4-3 各設備類型季報', bold: true, size: 24, font: '標楷體' })] }),
          new Table({ rows: quarterlyRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          ...hwFootnotes,
        ],
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `硬體統計報表_${rocYear}年第${quarter}季.docx`)
  }

  // ═══ Word export: Fiber (光纖數據線路及設備維運服務報告) ═══
  async function exportFiberWord() {
    function buildCircuitAvailDocxTable(): Table {
      const rows: TableRow[] = []
      rows.push(new TableRow({
        children: [
          docxCell('序號', { bold: true, alignment: AlignmentType.CENTER }),
          docxCell('單位', { bold: true }),
          docxCell('電路編號', { bold: true }),
          docxCell('電路頻寬', { bold: true }),
          docxCell('IP Address', { bold: true }),
          docxCell('本月應服務總時數(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
          docxCell('計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
          docxCell('非計畫性停止服務時間累計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
          docxCell('可用率', { bold: true, alignment: AlignmentType.CENTER }),
        ],
      }))
      if (circuitAvailSummary.length === 0) {
        rows.push(new TableRow({ children: [new TableCell({ borders: createDocxBorders(), columnSpan: 9, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '本月無線路資料', size: 20, font: '標楷體' })] })] })] }))
      } else {
        const unitGroups: { unit: string; items: CircuitAvailRow[] }[] = []
        circuitAvailSummary.forEach((s) => { const g = unitGroups.find((x) => x.unit === s.unit); if (g) g.items.push(s); else unitGroups.push({ unit: s.unit, items: [s] }) })
        let seq = 0
        unitGroups.forEach((group) => {
          group.items.forEach((item, idx) => {
            seq++
            const availPct = item.serviceHours > 0
              ? Math.round(((item.serviceHours - (item.unplannedNonExternalHours ?? item.unplannedHours)) / item.serviceHours) * 10000) / 100
              : 100
            const cells: TableCell[] = [docxCell(`${seq}`, { alignment: AlignmentType.CENTER })]
            if (idx === 0) { cells.push(new TableCell({ borders: createDocxBorders(), rowSpan: group.items.length, children: [new Paragraph({ children: [new TextRun({ text: group.unit, bold: true, size: 20, font: '標楷體' })] })] })) }
            cells.push(docxCell(item.circuit_number))
            cells.push(docxCell(item.bandwidth || '-'))
            cells.push(docxCell(item.ip_address || '-'))
            cells.push(docxCell(`${item.serviceHours}`, { alignment: AlignmentType.RIGHT }))
            cells.push(docxCell(`${item.plannedHours}`, { alignment: AlignmentType.RIGHT }))
            cells.push(docxCell(`${item.unplannedHours}`, { alignment: AlignmentType.RIGHT }))
            cells.push(docxCell(`${availPct}%`, { alignment: AlignmentType.RIGHT }))
            rows.push(new TableRow({ children: cells }))
          })
        })
      }
      return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })
    }

    function buildCircuitDocxTable(summaries: CircuitEventSummary[]): Table {
      const rows: TableRow[] = []

      // Header
      rows.push(new TableRow({
        children: [
          docxCell('序號', { bold: true, alignment: AlignmentType.CENTER }),
          docxCell('單位', { bold: true }),
          docxCell('電路編號', { bold: true }),
          docxCell('IP Address', { bold: true }),
          docxCell('停止服務期間', { bold: true }),
          docxCell('中斷時數總計(hrs)', { bold: true, alignment: AlignmentType.CENTER }),
          docxCell('原因', { bold: true }),
        ],
      }))

      if (summaries.length === 0) {
        rows.push(new TableRow({
          children: [
            new TableCell({
              borders: createDocxBorders(),
              columnSpan: 7,
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '本月無相關事件', size: 20, font: '標楷體' })],
              })],
            }),
          ],
        }))
      } else {
        // Group by unit for rowSpan
        const unitGroups: { unit: string; items: CircuitEventSummary[] }[] = []
        summaries.forEach((s) => {
          const existing = unitGroups.find((g) => g.unit === s.unit)
          if (existing) existing.items.push(s)
          else unitGroups.push({ unit: s.unit, items: [s] })
        })

        let seq = 0
        unitGroups.forEach((group) => {
          group.items.forEach((item, idx) => {
            seq++
            const cells: TableCell[] = [
              docxCell(`${seq}`, { alignment: AlignmentType.CENTER }),
            ]

            if (idx === 0) {
              cells.push(new TableCell({
                borders: createDocxBorders(),
                rowSpan: group.items.length,
                children: [new Paragraph({ children: [new TextRun({ text: group.unit, bold: true, size: 20, font: '標楷體' })] })],
              }))
            }

            cells.push(docxCell(item.circuit_number))
            cells.push(docxCell(item.ip_address || '-'))
            cells.push(docxCell(item.stopPeriod))
            cells.push(docxCell(`${item.totalHours}`, { alignment: AlignmentType.RIGHT }))
            cells.push(docxCell(item.reason))

            rows.push(new TableRow({ children: cells }))
          })
        })
      }

      return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })
    }

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${fiberMonthLabel} 光纖數據線路及設備維運服務報告`, bold: true, size: 28, font: '標楷體' })],
          }),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),

          // (a) 連線與服務中斷彙總列表
          new Paragraph({ children: [new TextRun({ text: `(a) 連線與服務中斷彙總列表 — ${fiberMonthLabel}`, bold: true, size: 24, font: '標楷體' })] }),
          buildCircuitAvailDocxTable(),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),

          // (b) 計畫性停止服務期間與原因彙整表
          new Paragraph({ children: [new TextRun({ text: `(b) 計畫性停止服務期間與原因彙整表 — ${fiberMonthLabel}`, bold: true, size: 24, font: '標楷體' })] }),
          buildCircuitDocxTable(circuitSummaryPlanned),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),

          // (c) 非計畫性停止服務期間與原因彙整表
          new Paragraph({ children: [new TextRun({ text: `(c) 非計畫性停止服務期間與原因彙整表 — ${fiberMonthLabel}`, bold: true, size: 24, font: '標楷體' })] }),
          buildCircuitDocxTable(circuitSummaryUnplanned),
        ],
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `光纖數據線路報告_${fiberMonthLabel}.docx`)
  }

  // ── Render circuit summary table ──
  function renderCircuitTable(title: string, summaries: CircuitEventSummary[]) {
    // Group by unit for rowSpan
    const unitGroups: { unit: string; rows: CircuitEventSummary[] }[] = []
    summaries.forEach((s) => {
      const existing = unitGroups.find((g) => g.unit === s.unit)
      if (existing) {
        existing.rows.push(s)
      } else {
        unitGroups.push({ unit: s.unit, rows: [s] })
      }
    })

    let seq = 0

    return (
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-semibold">{title}</h3>
        </div>
        {summaries.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">本月無相關事件</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                  <th className="text-center px-4 py-3 font-medium w-12">序號</th>
                  <th className="text-left px-4 py-3 font-medium">單位</th>
                  <th className="text-left px-4 py-3 font-medium">電路編號</th>
                  <th className="text-left px-4 py-3 font-medium">IP Address</th>
                  <th className="text-left px-4 py-3 font-medium">停止服務期間</th>
                  <th className="text-right px-4 py-3 font-medium">中斷時數<br/>總計(hrs)</th>
                  <th className="text-left px-4 py-3 font-medium">原因</th>
                </tr>
              </thead>
              <tbody>
                {unitGroups.map((group) =>
                  group.rows.map((row, rowIdx) => {
                    seq++
                    return (
                      <tr key={`${group.unit}-${rowIdx}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                        <td className="text-center px-4 py-2.5">{seq}</td>
                        {rowIdx === 0 && (
                          <td className="px-4 py-2.5 font-medium border-r border-[var(--color-border)]" rowSpan={group.rows.length}>
                            {group.unit}
                          </td>
                        )}
                        <td className="px-4 py-2.5">{row.circuit_number}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{row.ip_address || '-'}</td>
                        <td className="px-4 py-2.5 text-xs">{row.stopPeriod}</td>
                        <td className="text-right px-4 py-2.5 font-mono">{row.totalHours}</td>
                        <td className="px-4 py-2.5">{row.reason}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── Render circuit availability summary table (a) ──
  function renderCircuitAvailTable(title: string, rows: CircuitAvailRow[]) {
    const unitGroups: { unit: string; rows: CircuitAvailRow[] }[] = []
    rows.forEach((r) => {
      const existing = unitGroups.find((g) => g.unit === r.unit)
      if (existing) existing.rows.push(r); else unitGroups.push({ unit: r.unit, rows: [r] })
    })
    let seq = 0
    return (
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-semibold">{title}</h3>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">本月無線路資料</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                  <th className="text-center px-4 py-3 font-medium w-12">序號</th>
                  <th className="text-left px-4 py-3 font-medium">單位</th>
                  <th className="text-left px-4 py-3 font-medium">電路編號</th>
                  <th className="text-left px-4 py-3 font-medium">電路頻寬</th>
                  <th className="text-left px-4 py-3 font-medium">IP Address</th>
                  <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數(hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">計畫性停止服務<br/>時間累計(hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">非計畫性停止服務<br/>時間累計(hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">可用率</th>
                </tr>
              </thead>
              <tbody>
                {unitGroups.map((group) =>
                  group.rows.map((row, rowIdx) => {
                    seq++
                    const availPct = row.serviceHours > 0
                      ? Math.round(((row.serviceHours - (row.unplannedNonExternalHours ?? row.unplannedHours)) / row.serviceHours) * 10000) / 100
                      : 100
                    return (
                      <tr key={`${group.unit}-${rowIdx}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                        <td className="text-center px-4 py-2.5">{seq}</td>
                        {rowIdx === 0 && (
                          <td className="px-4 py-2.5 font-medium border-r border-[var(--color-border)]" rowSpan={group.rows.length}>{group.unit}</td>
                        )}
                        <td className="px-4 py-2.5">{row.circuit_number}</td>
                        <td className="px-4 py-2.5">{row.bandwidth || '-'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{row.ip_address || '-'}</td>
                        <td className="text-right px-4 py-2.5 font-mono">{row.serviceHours}</td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-warning)]">{row.plannedHours}</td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-danger)]">{row.unplannedHours}</td>
                        <td className="text-right px-4 py-2.5">
                          <span className={`font-semibold ${availPct >= 99.9 ? 'text-[var(--color-success)]' : availPct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                            {availPct}%
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── Loading state ──
  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm text-[var(--color-text-muted)]">載入報表資料中...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            統計報表
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">硬體與網路可用率季度統計</p>
        </div>
      </div>

      {/* ── Year + Month Selector ── */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium">統計區間：</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={rocYear}
                onChange={(e) => setRocYear(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-card)]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
            </div>
            <div className="relative">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-card)]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m} 月</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
            </div>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            所屬季度：第{quarter}季 ({quarterHeaderLabel})
          </div>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={upToMonth}
              onChange={(e) => setUpToMonth(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
            />
            僅統計至該月份
          </label>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex gap-1 mb-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-1">
        <button
          onClick={() => setMainTab('hardware')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-colors ${
            mainTab === 'hardware'
              ? 'bg-[var(--color-primary)] text-white font-medium'
              : 'hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]'
          }`}
        >
          <HardDrive className="w-4 h-4" /> 硬體統計
        </button>
        <button
          onClick={() => setMainTab('network')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-colors ${
            mainTab === 'network'
              ? 'bg-[var(--color-primary)] text-white font-medium'
              : 'hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]'
          }`}
        >
          <Wifi className="w-4 h-4" /> 網路統計
        </button>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* ── Hardware Tab ── */}
      {/* ══════════════════════════════════════════════ */}
      {mainTab === 'hardware' && (
        <>
          {/* Export button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={exportHardwareWord}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <FileDown className="w-4 h-4" />
              匯出 Word
            </button>
          </div>

          {/* Chart */}
          <DonutChartSection data={hardwareChartData} title={`${rocYear}年第${quarter}季 硬體停機時數統計`} />

          {/* ═══ 表2-4-2: Monthly Summary ═══ */}
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold">
                表2-4-2 {rocYear}年第{quarter}季 — x86伺服器月報彙總
                <span className="text-sm font-normal text-[var(--color-text-muted)] ml-2">
                  ({quarterPeriods[currentPeriodIndex]?.label})
                </span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                可用率 = (本月應服務總時數 - 非計畫性停止服務時間) / 本月應服務總時數 x 100%
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                  <th className="text-left px-4 py-3 font-medium">類別</th>
                  <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">計畫性停止服務<br/>時間累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">非計畫性停止服務<br/>時間累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">可用率</th>
                </tr>
              </thead>
              <tbody>
                {serverMonthlySummary.map((row, idx) => {
                  const asset = serverAssets[idx]
                  const period = quarterPeriods[currentPeriodIndex]
                  return (
                  <tr key={asset?.id ?? idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-header)]">
                    <td className="px-4 py-3 font-medium">{asset?.name ?? ''}</td>
                    <td className="text-right px-4 py-3 font-mono text-xs">
                      {row.totalCount > 1 ? `${row.hoursPerDevice}*${row.totalCount}` : row.hoursPerDevice}
                    </td>
                    <td className="text-right px-4 py-3 text-[var(--color-warning)]">
                      {asset && row.plannedHours > 0 ? (
                        <button onClick={() => showServerEventDetail(asset, 'planned', period)} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                          {row.plannedHours}
                        </button>
                      ) : row.plannedHours}
                    </td>
                    <td className="text-right px-4 py-3 text-[var(--color-danger)]">
                      {asset && row.unplannedHours > 0 ? (
                        <button onClick={() => showServerEventDetail(asset, 'unplanned', period)} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                          {row.unplannedHours}
                        </button>
                      ) : row.unplannedHours}
                    </td>
                    <td className="text-right px-4 py-3">
                      <span className={`font-semibold ${row.availabilityPct >= 99.9 ? 'text-[var(--color-success)]' : row.availabilityPct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                        {row.availabilityPct}%
                      </span>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ═══ 表2-4-3: Quarterly Breakdown ═══ */}
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold">表2-4-3 {rocYear}年第{quarter}季 — x86伺服器各類型季報</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                可用率 = (本季應服務總時數 - 非計畫性停止服務時間) / 本季應服務總時數 x 100%
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                    <th className="text-left px-4 py-3 font-medium min-w-[160px]">類別</th>
                    <th className="text-left px-4 py-3 font-medium min-w-[160px]">期間</th>
                    <th className="text-right px-4 py-3 font-medium">本季應服務<br/>總時數累計<br/>(hrs)</th>
                    <th className="text-right px-4 py-3 font-medium">本季計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                    <th className="text-right px-4 py-3 font-medium">本季非計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                    <th className="text-right px-4 py-3 font-medium">可用率</th>
                  </tr>
                </thead>
                <tbody>
                  {serverQuarterlyReport.map((device, deviceIdx) => {
                    const plannedNum = serverNoteByPlanned.get(device.label)
                    const plannedNoteLabel = plannedNum ? `[註${plannedNum}]` : ''
                    const unplannedNum = serverNoteByUnplanned.get(device.label)
                    const unplannedNoteLabel = unplannedNum ? `[註${unplannedNum}]` : ''
                    const asset = serverAssets[deviceIdx]
                    return (
                    <React.Fragment key={device.label}>
                      {device.monthRows.map((row, i) => (
                        <tr key={`${device.label}-${i}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                          {i === 0 && (
                            <td className="px-4 py-2.5 font-medium align-middle border-r border-[var(--color-border)]" rowSpan={4}>
                              {device.label}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-xs">{row.period.label}</td>
                          <td className="text-right px-4 py-2.5 font-mono text-xs">
                            {row.hasData
                              ? (device.totalCount > 1 ? `${row.hoursPerDevice}*${device.totalCount}` : row.hoursPerDevice)
                              : ''}
                          </td>
                          <td className="text-right px-4 py-2.5 text-[var(--color-warning)]">
                            {row.hasData && row.plannedHours > 0 ? (
                              <button onClick={() => showServerEventDetail(asset, 'planned', row.period)} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                                {row.plannedHours}
                              </button>
                            ) : (row.hasData ? row.plannedHours : '')}
                          </td>
                          <td className="text-right px-4 py-2.5 text-[var(--color-danger)]">
                            {row.hasData && row.unplannedHours > 0 ? (
                              <button onClick={() => showServerEventDetail(asset, 'unplanned', row.period)} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                                {row.unplannedHours}
                              </button>
                            ) : (row.hasData ? row.unplannedHours : '')}
                          </td>
                          <td className="text-right px-4 py-2.5">
                            {row.hasData ? (
                              <span className={`font-semibold ${row.availabilityPct >= 99.9 ? 'text-[var(--color-success)]' : row.availabilityPct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                                {row.availabilityPct}%
                              </span>
                            ) : ''}
                          </td>
                        </tr>
                      ))}
                      {/* Quarterly total row */}
                      <tr className="border-b-2 border-[var(--color-border)] bg-[var(--color-warning-dim)]">
                        <td className="px-4 py-2.5 text-xs font-semibold">
                          {rocYear}年<br/>第{quarter}季總計
                        </td>
                        <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">
                          {device.totalCount > 1
                            ? `${device.quarterly.hoursPerDevice}*${device.totalCount}`
                            : device.quarterly.hoursPerDevice}
                        </td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-warning)] font-semibold">
                          {device.quarterly.plannedHours > 0 ? (
                            <button onClick={() => showServerEventDetail(asset, 'planned')} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                              {device.quarterly.plannedHours}
                            </button>
                          ) : device.quarterly.plannedHours}
                          {plannedNoteLabel && <><br/><span className="text-xs font-normal text-[var(--color-text-muted)]">{plannedNoteLabel}</span></>}
                        </td>
                        <td className="text-right px-4 py-2.5 text-[var(--color-danger)] font-semibold">
                          {device.quarterly.unplannedHours > 0 ? (
                            <button onClick={() => showServerEventDetail(asset, 'unplanned')} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                              {device.quarterly.unplannedHours}
                            </button>
                          ) : device.quarterly.unplannedHours}
                          {unplannedNoteLabel && <><br/><span className="text-xs font-normal text-[var(--color-text-muted)]">{unplannedNoteLabel}</span></>}
                        </td>
                        <td className="text-right px-4 py-2.5">
                          <span className={`font-bold ${device.quarterly.availabilityPct >= 99.9 ? 'text-[var(--color-success)]' : device.quarterly.availabilityPct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                            {device.quarterly.availabilityPct}%
                            <br/><span className="text-xs font-normal text-[var(--color-text-muted)]">[註1]</span>
                          </span>
                        </td>
                      </tr>
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ 硬體季報註腳 ═══ */}
          <div className="mt-3 px-2 text-xs text-[var(--color-text-muted)] space-y-0.5">
            <div>※【註1】{NOTE1_TEXT}</div>
            {serverDeviceNotes.map((note) => (
              <div key={note.noteNum}>
                <div>※【註{note.noteNum}】停止服務原因條列如下：</div>
                {note.events.map((ev, i) => (
                  <div key={i}>　■ {ev.startTime}～{ev.endTime}，{ev.title}（{ev.planType}），共停止{ev.totalHours}小時。</div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ── Network Tab ── */}
      {/* ══════════════════════════════════════════════ */}
      {mainTab === 'network' && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-1">
            <button
              onClick={() => setNetworkSubTab('monthly')}
              className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
                networkSubTab === 'monthly'
                  ? 'bg-[var(--color-primary)] text-white font-medium'
                  : 'hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]'
              }`}
            >
              工作月報
            </button>
            <button
              onClick={() => setNetworkSubTab('fiber')}
              className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
                networkSubTab === 'fiber'
                  ? 'bg-[var(--color-primary)] text-white font-medium'
                  : 'hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]'
              }`}
            >
              光纖數據線路及設備維運服務報告
            </button>
          </div>

          {networkSubTab === 'monthly' && (
            <>
              {/* Export button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={exportNetworkWord}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  匯出 Word
                </button>
              </div>

              {/* Chart */}
              <DonutChartSection data={networkChartData} title={`${rocYear}年第${quarter}季 網路停機時數統計`} />

              {/* ═══ 各設備類型季報 ═══ */}
              <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h3 className="font-semibold">{rocYear}年第{quarter}季 — 各設備類型季報</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    可用率 = (本季應服務總時數 - 非計畫性停止服務時間) / 本季應服務總時數 x 100%
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-warning-dim)]">
                        <th className="text-left px-4 py-3 font-medium">計算期間</th>
                        <th className="text-left px-4 py-3 font-medium" colSpan={5}>{quarterHeaderLabel}</th>
                      </tr>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                        <th className="text-left px-4 py-3 font-medium min-w-[160px]">類別</th>
                        <th className="text-left px-4 py-3 font-medium min-w-[140px]">期間</th>
                        <th className="text-right px-4 py-3 font-medium">本季應服務<br/>總時數累計<br/>(hrs)</th>
                        <th className="text-right px-4 py-3 font-medium">本季計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                        <th className="text-right px-4 py-3 font-medium">本季非計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                        <th className="text-right px-4 py-3 font-medium">可用率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarterlyReport.map((device, deviceIdx) => {
                        const plannedNum = noteByDevicePlanned.get(device.label)
                        const plannedNoteLabel = plannedNum ? `[註${plannedNum}]` : ''
                        const unplannedNum = noteByDeviceUnplanned.get(device.label)
                        const unplannedNoteLabel = unplannedNum ? `[註${unplannedNum}]` : ''
                        const group = deviceGroups[deviceIdx]
                        return (
                        <React.Fragment key={device.label}>
                          {device.monthRows.map((row, i) => (
                            <tr key={`${device.label}-${i}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-table-row-hover)]">
                              {i === 0 && (
                                <td className="px-4 py-2.5 font-medium align-middle border-r border-[var(--color-border)]" rowSpan={4}>
                                  {device.label}
                                </td>
                              )}
                              <td className="px-4 py-2.5 text-xs">{row.period.label}</td>
                              <td className="text-right px-4 py-2.5 font-mono text-xs">
                                {row.hasData
                                  ? (device.totalCount > 1 ? `${row.hoursPerDevice}*${device.totalCount}` : row.hoursPerDevice)
                                  : ''}
                              </td>
                              <td className="text-right px-4 py-2.5 text-[var(--color-warning)]">
                                {row.hasData && row.plannedHours > 0 ? (
                                  <button onClick={() => showNetworkEventDetail(group, 'planned', row.period)} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                                    {row.plannedHours}
                                  </button>
                                ) : (row.hasData ? row.plannedHours : '')}
                              </td>
                              <td className="text-right px-4 py-2.5 text-[var(--color-danger)]">
                                {row.hasData && row.unplannedHours > 0 ? (
                                  <button onClick={() => showNetworkEventDetail(group, 'unplanned', row.period)} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                                    {row.unplannedHours}
                                  </button>
                                ) : (row.hasData ? row.unplannedHours : '')}
                              </td>
                              <td className="text-right px-4 py-2.5">
                                {row.hasData ? (
                                  <span className={`font-semibold ${row.availabilityPct >= 99.9 ? 'text-[var(--color-success)]' : row.availabilityPct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                                    {row.availabilityPct}%
                                  </span>
                                ) : ''}
                              </td>
                            </tr>
                          ))}
                          {/* Quarterly total row */}
                          <tr className="border-b-2 border-[var(--color-border)] bg-[var(--color-warning-dim)]">
                            <td className="px-4 py-2.5 text-xs font-semibold">
                              {rocYear}年<br/>第{quarter}季總計
                            </td>
                            <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">
                              {device.totalCount > 1
                                ? `${device.quarterly.hoursPerDevice}*${device.totalCount}`
                                : device.quarterly.hoursPerDevice}
                            </td>
                            <td className="text-right px-4 py-2.5 text-[var(--color-warning)] font-semibold">
                              {device.quarterly.plannedHours > 0 ? (
                                <button onClick={() => showNetworkEventDetail(group, 'planned')} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                                  {device.quarterly.plannedHours}
                                </button>
                              ) : device.quarterly.plannedHours}
                              {plannedNoteLabel && <><br/><span className="text-xs font-normal text-[var(--color-text-muted)]">{plannedNoteLabel}</span></>}
                            </td>
                            <td className="text-right px-4 py-2.5 text-[var(--color-danger)] font-semibold">
                              {device.quarterly.unplannedHours > 0 ? (
                                <button onClick={() => showNetworkEventDetail(group, 'unplanned')} className="underline decoration-dotted hover:decoration-solid cursor-pointer">
                                  {device.quarterly.unplannedHours}
                                </button>
                              ) : device.quarterly.unplannedHours}
                              {unplannedNoteLabel && <><br/><span className="text-xs font-normal text-[var(--color-text-muted)]">{unplannedNoteLabel}</span></>}
                            </td>
                            <td className="text-right px-4 py-2.5">
                              <span className={`font-bold ${device.quarterly.availabilityPct >= 99.9 ? 'text-[var(--color-success)]' : device.quarterly.availabilityPct >= 99 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>
                                {device.quarterly.availabilityPct}%
                                <br/><span className="text-xs font-normal text-[var(--color-text-muted)]">[註1]</span>
                              </span>
                            </td>
                          </tr>
                        </React.Fragment>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══ 註腳: 新格式 ═══ */}
              <div className="mt-3 px-2 text-xs text-[var(--color-text-muted)] space-y-0.5">
                <div>※【註1】{NOTE1_TEXT}</div>
                {networkDeviceNotes.map((note) => (
                  <div key={note.noteNum}>
                    <div>※【註{note.noteNum}】停止服務原因條列如下：</div>
                    {note.eventLines.map((ev, i) => (
                      <div key={i}>　{formatNoteEventText(ev)}</div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* ── Fiber Report Tab ── */}
          {/* ══════════════════════════════════════════════ */}
          {networkSubTab === 'fiber' && (
            <>
              {/* Export button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={exportFiberWord}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  匯出 Word
                </button>
              </div>
              {renderCircuitAvailTable(
                `(a) 連線與服務中斷彙總列表 — ${fiberMonthLabel}`,
                circuitAvailSummary,
              )}
              {renderCircuitTable(
                `(b) 計畫性停止服務期間與原因彙整表 — ${fiberMonthLabel}`,
                circuitSummaryPlanned,
              )}
              {renderCircuitTable(
                `(c) 非計畫性停止服務期間與原因彙整表 — ${fiberMonthLabel}`,
                circuitSummaryUnplanned,
              )}
            </>
          )}
        </>
      )}
      {/* Event detail popup */}
      {detailPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailPopup(null)}>
          <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] shadow-2xl max-w-5xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-base">{detailPopup.title}</h3>
              <button onClick={() => setDetailPopup(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none px-2">&times;</button>
            </div>
            <div className="overflow-auto flex-1 p-5">
              {detailPopup.events.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">無事件記錄</p>
              ) : (
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                      <th className="text-left py-2 px-2 w-[130px]">起始時間</th>
                      <th className="text-left py-2 px-2 w-[130px]">結束時間</th>
                      <th className="text-left py-2 px-2 w-[80px]">單位</th>
                      <th className="text-left py-2 px-2 w-[140px]">設備</th>
                      <th className="text-left py-2 px-2">事件</th>
                      <th className="text-left py-2 px-2 w-[60px]">類型</th>
                      <th className="text-right py-2 px-2 w-[60px]">時數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailPopup.events.map((ev, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-hover)]">
                        <td className="py-2 px-2 font-mono text-xs whitespace-nowrap">{ev.startTime}</td>
                        <td className="py-2 px-2 font-mono text-xs whitespace-nowrap">{ev.endTime}</td>
                        <td className="py-2 px-2 text-xs">{ev.unit}</td>
                        <td className="py-2 px-2 text-xs break-words">{ev.assetName.startsWith(ev.unit) ? ev.assetName.slice(ev.unit.length) : ev.assetName}</td>
                        <td className="py-2 px-2 break-words">{ev.title}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ev.planType === '計畫性' ? 'bg-[var(--color-warning-dim)] text-[var(--color-warning)]' : 'bg-[var(--color-danger-dim)] text-[var(--color-danger)]'}`}>
                            {ev.planType}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono whitespace-nowrap">{ev.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
