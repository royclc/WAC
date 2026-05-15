'use client'

import React, { useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import { BarChart3, Wifi, HardDrive, ChevronDown, FileDown } from 'lucide-react'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'

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
}

// ── Demo Data ──

const NETWORK_ASSETS: NetworkAsset[] = [
  { id: 'hi1', name: '總局內網防火牆', unit: '總局', majorCategory: '總局', zone: 'internal', deviceType: '防火牆', quantity: 2 },
  { id: 'hi2', name: '總局內網核心網路交換器', unit: '總局', majorCategory: '總局', zone: 'internal', deviceType: '核心網路交換器', quantity: 2 },
  { id: 'hi3', name: '總局內網主機網路交換器', unit: '總局', majorCategory: '總局', zone: 'internal', deviceType: '主機網路交換器', quantity: 8 },
  { id: 'hi4', name: '總局內網邊界網路交換器', unit: '總局', majorCategory: '總局', zone: 'internal', deviceType: '邊界網路交換器', quantity: 2 },
  { id: 'hi5', name: '總局內網聚合網路交換器', unit: '總局', majorCategory: '總局', zone: 'internal', deviceType: '聚合網路交換器', quantity: 4 },
  { id: 'he1', name: '總局外網防火牆', unit: '總局', majorCategory: '總局', zone: 'external', deviceType: '防火牆', quantity: 2 },
  { id: 'he2', name: '總局外網核心網路交換器', unit: '總局', majorCategory: '總局', zone: 'external', deviceType: '核心網路交換器', quantity: 2 },
  { id: 'he3', name: '總局外網主機網路交換器', unit: '總局', majorCategory: '總局', zone: 'external', deviceType: '主機網路交換器', quantity: 4 },
  { id: 'he4', name: '總局外網邊界網路交換器', unit: '總局', majorCategory: '總局', zone: 'external', deviceType: '邊界網路交換器', quantity: 2 },
  { id: 'he5', name: '總局外網聚合網路交換器', unit: '總局', majorCategory: '總局', zone: 'external', deviceType: '聚合網路交換器', quantity: 2 },
  { id: 'ai1', name: 'a稽徵所內網防火牆', unit: 'a稽徵所', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '防火牆', quantity: 1 },
  { id: 'ai2', name: 'a稽徵所內網前端網路交換器', unit: 'a稽徵所', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '前端網路交換器', quantity: 1 },
  { id: 'ai3', name: 'a稽徵所內網聚合網路交換器', unit: 'a稽徵所', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '聚合網路交換器', quantity: 1 },
  { id: 'ae1', name: 'a稽徵所外網防火牆', unit: 'a稽徵所', majorCategory: '分局稽徵所', zone: 'external', deviceType: '防火牆', quantity: 1 },
  { id: 'ae2', name: 'a稽徵所外網前端網路交換器', unit: 'a稽徵所', majorCategory: '分局稽徵所', zone: 'external', deviceType: '前端網路交換器', quantity: 1 },
  { id: 'ae3', name: 'a稽徵所外網聚合網路交換器', unit: 'a稽徵所', majorCategory: '分局稽徵所', zone: 'external', deviceType: '聚合網路交換器', quantity: 1 },
  { id: 'bi1', name: 'b分局內網防火牆', unit: 'b分局', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '防火牆', quantity: 1 },
  { id: 'bi2', name: 'b分局內網前端網路交換器', unit: 'b分局', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '前端網路交換器', quantity: 1 },
  { id: 'bi3', name: 'b分局內網聚合網路交換器', unit: 'b分局', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '聚合網路交換器', quantity: 1 },
  { id: 'be1', name: 'b分局外網防火牆', unit: 'b分局', majorCategory: '分局稽徵所', zone: 'external', deviceType: '防火牆', quantity: 1 },
  { id: 'be2', name: 'b分局外網前端網路交換器', unit: 'b分局', majorCategory: '分局稽徵所', zone: 'external', deviceType: '前端網路交換器', quantity: 1 },
  { id: 'be3', name: 'b分局外網聚合網路交換器', unit: 'b分局', majorCategory: '分局稽徵所', zone: 'external', deviceType: '聚合網路交換器', quantity: 1 },
  { id: 'ci1', name: 'c稽徵所內網防火牆', unit: 'c稽徵所', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '防火牆', quantity: 1 },
  { id: 'ci2', name: 'c稽徵所內網前端網路交換器', unit: 'c稽徵所', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '前端網路交換器', quantity: 1 },
  { id: 'ci3', name: 'c稽徵所內網聚合網路交換器', unit: 'c稽徵所', majorCategory: '分局稽徵所', zone: 'internal', deviceType: '聚合網路交換器', quantity: 1 },
  { id: 'ce1', name: 'c稽徵所外網防火牆', unit: 'c稽徵所', majorCategory: '分局稽徵所', zone: 'external', deviceType: '防火牆', quantity: 1 },
  { id: 'ce2', name: 'c稽徵所外網前端網路交換器', unit: 'c稽徵所', majorCategory: '分局稽徵所', zone: 'external', deviceType: '前端網路交換器', quantity: 1 },
  { id: 'ce3', name: 'c稽徵所外網聚合網路交換器', unit: 'c稽徵所', majorCategory: '分局稽徵所', zone: 'external', deviceType: '聚合網路交換器', quantity: 1 },
]

const DEMO_EVENTS: DowntimeEvent[] = [
  { id: 'de1', asset_id: 'ai1', plan_type: 'planned', title: '例行維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de2', asset_id: 'ai2', plan_type: 'planned', title: '例行維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de3', asset_id: 'ai3', plan_type: 'planned', title: '例行維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de4', asset_id: 'ae1', plan_type: 'planned', title: '例行維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de5', asset_id: 'ae2', plan_type: 'planned', title: '例行維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de6', asset_id: 'ae3', plan_type: 'planned', title: '例行維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de7', asset_id: 'bi1', plan_type: 'planned', title: '設備更新', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de8', asset_id: 'bi2', plan_type: 'planned', title: '設備更新', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de9', asset_id: 'bi3', plan_type: 'planned', title: '設備更新', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de10', asset_id: 'be1', plan_type: 'planned', title: '設備更新', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de11', asset_id: 'be2', plan_type: 'planned', title: '設備更新', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de12', asset_id: 'be3', plan_type: 'planned', title: '設備更新', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de13', asset_id: 'ci1', plan_type: 'planned', title: '線路維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de14', asset_id: 'ci2', plan_type: 'planned', title: '線路維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de15', asset_id: 'ci3', plan_type: 'planned', title: '線路維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de16', asset_id: 'ce1', plan_type: 'planned', title: '線路維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de17', asset_id: 'ce2', plan_type: 'planned', title: '線路維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
  { id: 'de18', asset_id: 'ce3', plan_type: 'planned', title: '線路維護', start_time: '2026-04-10T08:00', end_time: '2026-04-14T21:34' },
]

const DEMO_CIRCUITS: Circuit[] = [
  { id: 'c1', unit: '總局', circuit_number: 'xxxxd', bandwidth: '200', ip_address: '' },
  { id: 'c2', unit: '總局', circuit_number: 'Xxxdx', bandwidth: '200', ip_address: '' },
  { id: 'c3', unit: '總局', circuit_number: 'Xx3', bandwidth: '100', ip_address: '' },
  { id: 'c4', unit: '總局', circuit_number: 'Xxr', bandwidth: '100/40', ip_address: '' },
  { id: 'c5', unit: 'b分局', circuit_number: 'Xe3', bandwidth: '50', ip_address: '' },
  { id: 'c6', unit: 'b分局', circuit_number: 'Xee', bandwidth: '60', ip_address: '' },
  { id: 'c7', unit: 'b分局', circuit_number: 'Xxssa', bandwidth: '70', ip_address: '' },
  { id: 'c8', unit: 'a稽徵所', circuit_number: 'Xd', bandwidth: '80', ip_address: '' },
  { id: 'c9', unit: 'a稽徵所', circuit_number: 'Xd', bandwidth: '90', ip_address: '' },
  { id: 'c10', unit: 'a稽徵所', circuit_number: 'Xxbb', bandwidth: '80', ip_address: '' },
  { id: 'c11', unit: 'c稽徵所', circuit_number: 'asdfaf', bandwidth: '70', ip_address: '' },
  { id: 'c12', unit: 'c稽徵所', circuit_number: 'asdfa', bandwidth: '50', ip_address: '' },
  { id: 'c13', unit: 'c稽徵所', circuit_number: 'bb', bandwidth: '60', ip_address: '' },
]

const DEMO_CIRCUIT_EVENTS: CircuitEvent[] = [
  { id: 'ce1', circuit_id: 'c1', plan_type: 'planned', title: '大樓頂樓發電機設備汰換作業', start_time: '2026-04-11T18:00', end_time: '2026-04-12T19:00' },
  { id: 'ce2', circuit_id: 'c2', plan_type: 'planned', title: '大樓頂樓發電機設備汰換作業', start_time: '2026-04-11T18:00', end_time: '2026-04-12T19:00' },
  { id: 'ce3', circuit_id: 'c3', plan_type: 'planned', title: '大樓頂樓發電機設備汰換作業', start_time: '2026-04-11T18:00', end_time: '2026-04-12T19:00' },
  { id: 'ce4', circuit_id: 'c4', plan_type: 'planned', title: '大樓頂樓發電機設備汰換作業', start_time: '2026-04-11T18:00', end_time: '2026-04-12T19:00' },
]

const SERVER_ASSETS: ServerAsset[] = [
  { id: 'sv_int', name: '一般業務類(內網)', quantity: 4 },
  { id: 'sv_ext', name: '一般業務類(外網)', quantity: 3 },
]

const DEMO_SERVER_EVENTS: ServerEvent[] = [
  { id: 'se1', asset_id: 'sv_int', plan_type: 'planned', title: '系統更新', start_time: '2026-04-10T08:00', end_time: '2026-04-11T09:00' },
  { id: 'se2', asset_id: 'sv_ext', plan_type: 'planned', title: '系統更新', start_time: '2026-04-10T08:00', end_time: '2026-04-11T09:00' },
]

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

function getCurrentQuarter(): { rocYear: number; quarter: number } {
  const now = new Date()
  const adYear = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  let quarter: number
  let rocYear: number

  if ((month === 11 && day >= 26) || month <= 1 || (month === 2 && day <= 25)) {
    quarter = 1
    rocYear = (month === 11 ? adYear + 1 : adYear) - 1911
  } else if ((month === 2 && day >= 26) || (month >= 3 && month <= 4) || (month === 5 && day <= 25)) {
    quarter = 2
    rocYear = adYear - 1911
  } else if ((month === 5 && day >= 26) || (month >= 6 && month <= 7) || (month === 8 && day <= 25)) {
    quarter = 3
    rocYear = adYear - 1911
  } else {
    quarter = 4
    rocYear = adYear - 1911
  }

  return { rocYear, quarter }
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
): { totalCount: number; hoursPerDevice: number; plannedHours: number; unplannedHours: number; availabilityPct: number } {
  const totalCount = assets.reduce((sum, a) => sum + a.quantity, 0)
  const hoursPerDevice = getHoursBetween(periodStart, new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1))

  let plannedMins = 0
  let unplannedMins = 0

  assets.forEach((asset) => {
    events.filter((e) => e.asset_id === asset.id).forEach((e) => {
      const eStart = new Date(e.start_time)
      const eEnd = new Date(e.end_time)
      const s = eStart < periodStart ? periodStart : eStart
      const ed = eEnd > periodEnd ? periodEnd : eEnd
      if (ed > s) {
        const mins = (ed.getTime() - s.getTime()) / 60000
        if (e.plan_type === 'planned') plannedMins += mins * asset.quantity
        else unplannedMins += mins * asset.quantity
      }
    })
  })

  const plannedHours = Math.round((plannedMins / 60) * 100) / 100
  const unplannedHours = Math.round((unplannedMins / 60) * 100) / 100
  const totalHours = hoursPerDevice * totalCount
  const availabilityPct = totalHours > 0
    ? Math.round(((totalHours - unplannedHours) / totalHours) * 10000) / 100
    : 100

  return { totalCount, hoursPerDevice, plannedHours, unplannedHours, availabilityPct }
}

// ── Stat calculation for server assets ──

function calcServerPeriodStats(
  assets: ServerAsset[],
  events: ServerEvent[],
  periodStart: Date,
  periodEnd: Date,
): { totalCount: number; hoursPerDevice: number; plannedHours: number; unplannedHours: number; availabilityPct: number }[] {
  return assets.map((asset) => {
    const hoursPerDevice = getHoursBetween(periodStart, new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1))
    let plannedMins = 0
    let unplannedMins = 0

    events.filter((e) => e.asset_id === asset.id).forEach((e) => {
      const eStart = new Date(e.start_time)
      const eEnd = new Date(e.end_time)
      const s = eStart < periodStart ? periodStart : eStart
      const ed = eEnd > periodEnd ? periodEnd : eEnd
      if (ed > s) {
        const mins = (ed.getTime() - s.getTime()) / 60000
        if (e.plan_type === 'planned') plannedMins += mins * asset.quantity
        else unplannedMins += mins * asset.quantity
      }
    })

    const plannedHours = Math.round((plannedMins / 60) * 100) / 100
    const unplannedHours = Math.round((unplannedMins / 60) * 100) / 100
    const totalHours = hoursPerDevice * asset.quantity
    const availabilityPct = totalHours > 0
      ? Math.round(((totalHours - unplannedHours) / totalHours) * 10000) / 100
      : 100

    return { totalCount: asset.quantity, hoursPerDevice, plannedHours, unplannedHours, availabilityPct }
  })
}

// ── Circuit event helpers ──

interface CircuitEventSummary {
  unit: string
  circuit_number: string
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
      const eStart = new Date(e.start_time)
      const eEnd = new Date(e.end_time)
      return eEnd > periodStart && eStart < periodEnd
    })

    if (circuitEvents.length === 0) {
      if (!filterType) {
        results.push({
          unit: circuit.unit,
          circuit_number: circuit.circuit_number,
          ip_address: circuit.ip_address || '',
          stopPeriod: '無',
          totalHours: 0,
          reason: '無',
          plan_type: 'planned',
        })
      }
    } else {
      circuitEvents.forEach((e) => {
        const eStart = new Date(e.start_time)
        const eEnd = new Date(e.end_time)
        const s = eStart < periodStart ? periodStart : eStart
        const ed = eEnd > periodEnd ? periodEnd : eEnd
        const hours = Math.round(((ed.getTime() - s.getTime()) / 3600000) * 100) / 100

        results.push({
          unit: circuit.unit,
          circuit_number: circuit.circuit_number,
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

function getDeviceGroups(): DeviceGroup[] {
  const groups: DeviceGroup[] = []
  const hqZones: Array<{ zone: 'internal' | 'external'; label: string }> = [
    { zone: 'internal', label: '內網' },
    { zone: 'external', label: '外網' },
  ]
  const hqDeviceTypes = ['防火牆', '核心網路交換器', '主機網路交換器', '邊界網路交換器', '聚合網路交換器']
  const branchDeviceTypes = ['防火牆', '前端網路交換器', '聚合網路交換器']

  hqZones.forEach(({ zone, label: zoneLabel }) => {
    hqDeviceTypes.forEach((dt) => {
      const matched = NETWORK_ASSETS.filter((a) => a.majorCategory === '總局' && a.zone === zone && a.deviceType === dt)
      if (matched.length > 0) {
        groups.push({ label: `總局${zoneLabel}${dt}`, assets: matched })
      }
    })
  })

  branchDeviceTypes.forEach((dt) => {
    const matched = NETWORK_ASSETS.filter((a) => a.majorCategory === '分局稽徵所' && a.deviceType === dt)
    if (matched.length > 0) {
      groups.push({ label: `分局稽徵所${dt}`, assets: matched })
    }
  })

  return groups
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
}

function BarChartSection({ data, title }: { data: ChartData[]; title: string }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.planned, d.unplanned)), 1)
  const totalPlanned = data.reduce((s, d) => s + d.planned, 0)
  const totalUnplanned = data.reduce((s, d) => s + d.unplanned, 0)

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="flex items-end gap-6 h-48 mb-4">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="flex gap-1 items-end flex-1 w-full justify-center">
              {/* Planned bar */}
              <div className="flex flex-col items-center w-8">
                <span className="text-xs text-amber-600 mb-1">{d.planned > 0 ? d.planned.toFixed(1) : ''}</span>
                <div
                  className="w-full bg-amber-400 rounded-t"
                  style={{ height: `${maxVal > 0 ? (d.planned / maxVal) * 120 : 0}px`, minHeight: d.planned > 0 ? '4px' : '0px' }}
                />
              </div>
              {/* Unplanned bar */}
              <div className="flex flex-col items-center w-8">
                <span className="text-xs text-red-600 mb-1">{d.unplanned > 0 ? d.unplanned.toFixed(1) : ''}</span>
                <div
                  className="w-full bg-red-400 rounded-t"
                  style={{ height: `${maxVal > 0 ? (d.unplanned / maxVal) * 120 : 0}px`, minHeight: d.unplanned > 0 ? '4px' : '0px' }}
                />
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] mt-1">{d.month}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-6 text-sm border-t border-[var(--color-border)] pt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-400" />
          <span>計畫性停機: {totalPlanned.toFixed(2)} hrs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span>非計畫性停機: {totalUnplanned.toFixed(2)} hrs</span>
        </div>
        <div className="ml-auto font-medium">
          合計: {(totalPlanned + totalUnplanned).toFixed(2)} hrs
        </div>
      </div>
    </div>
  )
}

// ── Component ──

export default function ReportsPage() {
  const { rocYear: defaultRocYear, quarter: defaultQuarter } = getCurrentQuarter()
  const [rocYear, setRocYear] = useState(defaultRocYear)
  const [quarter, setQuarter] = useState(defaultQuarter)
  const [mainTab, setMainTab] = useState<'hardware' | 'network'>('network')
  const [networkSubTab, setNetworkSubTab] = useState<'monthly' | 'fiber'>('monthly')

  const events = DEMO_EVENTS

  // Quarter periods
  const quarterPeriods = useMemo(() => getQuarterMonthPeriods(rocYear, quarter), [rocYear, quarter])
  const quarterRange = useMemo(() => getQuarterRange(rocYear, quarter), [rocYear, quarter])
  const deviceGroups = useMemo(() => getDeviceGroups(), [])

  const now = new Date()

  // ═══ Network: Part 1 - Quarterly device breakdown ═══
  const quarterlyReport = useMemo(() => {
    return deviceGroups.map((group) => {
      const monthRows = quarterPeriods.map((period) => {
        const isPast = period.end < now || (period.start <= now && period.end >= now)
        if (!isPast) {
          return { period, hasData: false, totalCount: 0, hoursPerDevice: 0, plannedHours: 0, unplannedHours: 0, availabilityPct: 0 }
        }
        const stats = calcPeriodStats(group.assets, events, period.start, period.end)
        return { period, hasData: true, ...stats }
      })

      const periodsWithData = monthRows.filter((r) => r.hasData)
      const totalCount = group.assets.reduce((sum, a) => sum + a.quantity, 0)
      const qTotalHoursPerDevice = periodsWithData.reduce((s, r) => s + r.hoursPerDevice, 0)
      const qPlanned = periodsWithData.reduce((s, r) => s + r.plannedHours, 0)
      const qUnplanned = periodsWithData.reduce((s, r) => s + r.unplannedHours, 0)
      const qTotalHours = qTotalHoursPerDevice * totalCount
      const qPct = qTotalHours > 0
        ? Math.round(((qTotalHours - qUnplanned) / qTotalHours) * 10000) / 100
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
  }, [deviceGroups, quarterPeriods, events])

  // ═══ Network: Part 2 - Monthly summary ═══
  const currentPeriodIndex = useMemo(() => {
    for (let i = quarterPeriods.length - 1; i >= 0; i--) {
      if (quarterPeriods[i].start <= now) return i
    }
    return 0
  }, [quarterPeriods])

  const monthlySummary = useMemo(() => {
    const period = quarterPeriods[currentPeriodIndex]
    if (!period) return []
    return deviceGroups.map((group) => {
      const stats = calcPeriodStats(group.assets, events, period.start, period.end)
      return { label: group.label, ...stats }
    })
  }, [deviceGroups, quarterPeriods, currentPeriodIndex, events])

  // ═══ Circuit summaries for fiber report ═══
  const circuitSummaryAll = useMemo(() => {
    return getCircuitEventSummaries(DEMO_CIRCUITS, DEMO_CIRCUIT_EVENTS, quarterRange.start, quarterRange.end)
  }, [quarterRange])

  const circuitSummaryPlanned = useMemo(() => {
    return getCircuitEventSummaries(DEMO_CIRCUITS, DEMO_CIRCUIT_EVENTS, quarterRange.start, quarterRange.end, 'planned')
  }, [quarterRange])

  const circuitSummaryUnplanned = useMemo(() => {
    return getCircuitEventSummaries(DEMO_CIRCUITS, DEMO_CIRCUIT_EVENTS, quarterRange.start, quarterRange.end, 'unplanned')
  }, [quarterRange])

  // ═══ Server (hardware) stats ═══
  const serverMonthlySummary = useMemo(() => {
    const period = quarterPeriods[currentPeriodIndex]
    if (!period) return []
    return calcServerPeriodStats(SERVER_ASSETS, DEMO_SERVER_EVENTS, period.start, period.end)
  }, [quarterPeriods, currentPeriodIndex])

  const serverQuarterlyReport = useMemo(() => {
    return SERVER_ASSETS.map((asset, assetIdx) => {
      const monthRows = quarterPeriods.map((period) => {
        const isPast = period.end < now || (period.start <= now && period.end >= now)
        if (!isPast) {
          return { period, hasData: false, totalCount: 0, hoursPerDevice: 0, plannedHours: 0, unplannedHours: 0, availabilityPct: 0 }
        }
        const stats = calcServerPeriodStats([asset], DEMO_SERVER_EVENTS, period.start, period.end)
        return { period, hasData: true, ...stats[0] }
      })

      const periodsWithData = monthRows.filter((r) => r.hasData)
      const qTotalHoursPerDevice = periodsWithData.reduce((s, r) => s + r.hoursPerDevice, 0)
      const qPlanned = periodsWithData.reduce((s, r) => s + r.plannedHours, 0)
      const qUnplanned = periodsWithData.reduce((s, r) => s + r.unplannedHours, 0)
      const qTotalHours = qTotalHoursPerDevice * asset.quantity
      const qPct = qTotalHours > 0
        ? Math.round(((qTotalHours - qUnplanned) / qTotalHours) * 10000) / 100
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
  }, [quarterPeriods])

  // ═══ Chart data for network ═══
  const networkChartData: ChartData[] = useMemo(() => {
    return quarterPeriods.map((period, i) => {
      const isPast = period.end < now || (period.start <= now && period.end >= now)
      if (!isPast) return { month: period.label.split('~')[0], planned: 0, unplanned: 0 }

      let planned = 0
      let unplanned = 0
      deviceGroups.forEach((group) => {
        const stats = calcPeriodStats(group.assets, events, period.start, period.end)
        planned += stats.plannedHours
        unplanned += stats.unplannedHours
      })
      return { month: period.label.split('~')[0], planned, unplanned }
    })
  }, [quarterPeriods, deviceGroups, events])

  // ═══ Chart data for hardware ═══
  const hardwareChartData: ChartData[] = useMemo(() => {
    return quarterPeriods.map((period) => {
      const isPast = period.end < now || (period.start <= now && period.end >= now)
      if (!isPast) return { month: period.label.split('~')[0], planned: 0, unplanned: 0 }

      let planned = 0
      let unplanned = 0
      SERVER_ASSETS.forEach((asset) => {
        const stats = calcServerPeriodStats([asset], DEMO_SERVER_EVENTS, period.start, period.end)
        planned += stats[0].plannedHours
        unplanned += stats[0].unplannedHours
      })
      return { month: period.label.split('~')[0], planned, unplanned }
    })
  }, [quarterPeriods])

  // ── Quarter header display ──
  const qRange = quarterRange
  const pad = (n: number) => String(n).padStart(2, '0')
  const qStartRoc = qRange.start.getFullYear() - 1911
  const qEndRoc = qRange.end.getFullYear() - 1911
  const quarterHeaderLabel = `${qStartRoc}年${pad(qRange.start.getMonth() + 1)}月${pad(qRange.start.getDate())}日~${qEndRoc}年${pad(qRange.end.getMonth() + 1)}月${pad(qRange.end.getDate())}日`
  const yearOptions = Array.from({ length: 5 }, (_, i) => defaultRocYear - 2 + i)

  // ═══ Word export: Network ═══
  async function exportNetworkWord() {
    const rows: TableRow[] = []

    // Header
    rows.push(new TableRow({
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
        rows.push(new TableRow({ children: cells }))
      })

      // Quarterly total row
      const totalCells = [
        docxCell(`${rocYear}年第${quarter}季總計`, { bold: true }),
        docxCell(device.totalCount > 1 ? `${device.quarterly.hoursPerDevice}*${device.totalCount}` : `${device.quarterly.hoursPerDevice}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.plannedHours}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.unplannedHours}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.availabilityPct}%`, { alignment: AlignmentType.RIGHT, bold: true }),
      ]
      rows.push(new TableRow({ children: totalCells }))
    })

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

    monthlySummary.forEach((row) => {
      monthlyRows.push(new TableRow({
        children: [
          docxCell(row.label, { bold: true }),
          docxCell(row.totalCount > 1 ? `${row.hoursPerDevice}*${row.totalCount}` : `${row.hoursPerDevice}`, { alignment: AlignmentType.RIGHT }),
          docxCell(`${row.plannedHours}`, { alignment: AlignmentType.RIGHT }),
          docxCell(`${row.unplannedHours}`, { alignment: AlignmentType.RIGHT }),
          docxCell(`${row.availabilityPct}%`, { alignment: AlignmentType.RIGHT }),
        ],
      }))
    })

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${rocYear}年第${quarter}季 網路統計報表`, bold: true, size: 28, font: '標楷體' })],
          }),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: '各設備類型季報', bold: true, size: 24, font: '標楷體' })] }),
          new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ children: [new TextRun({ text: '', size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `月報彙總 (${quarterPeriods[currentPeriodIndex]?.label})`, bold: true, size: 24, font: '標楷體' })] }),
          new Table({ rows: monthlyRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
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
          docxCell(SERVER_ASSETS[idx].name, { bold: true }),
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
        docxCell(`${device.quarterly.plannedHours}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.unplannedHours}`, { alignment: AlignmentType.RIGHT, bold: true }),
        docxCell(`${device.quarterly.availabilityPct}%`, { alignment: AlignmentType.RIGHT, bold: true }),
      ]
      quarterlyRows.push(new TableRow({ children: totalCells }))
    })

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
        ],
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `硬體統計報表_${rocYear}年第${quarter}季.docx`)
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
          <div className="p-8 text-center text-[var(--color-text-muted)]">本季無相關事件</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-gray-50">
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
                      <tr key={`${group.unit}-${rowIdx}`} className="border-b border-[var(--color-border)] hover:bg-gray-50/50">
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

      {/* ── Quarter Selector ── */}
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
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-card)]"
              >
                <option value={1}>第 1 季</option>
                <option value={2}>第 2 季</option>
                <option value={3}>第 3 季</option>
                <option value={4}>第 4 季</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
            </div>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            計算期間：{quarterHeaderLabel}
          </div>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex gap-1 mb-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-1">
        <button
          onClick={() => setMainTab('hardware')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-colors ${
            mainTab === 'hardware'
              ? 'bg-[var(--color-primary)] text-white font-medium'
              : 'hover:bg-gray-100 text-[var(--color-text-muted)]'
          }`}
        >
          <HardDrive className="w-4 h-4" /> 硬體統計
        </button>
        <button
          onClick={() => setMainTab('network')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-colors ${
            mainTab === 'network'
              ? 'bg-[var(--color-primary)] text-white font-medium'
              : 'hover:bg-gray-100 text-[var(--color-text-muted)]'
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
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              匯出 Word
            </button>
          </div>

          {/* Chart */}
          <BarChartSection data={hardwareChartData} title={`${rocYear}年第${quarter}季 硬體停機時數統計`} />

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
                <tr className="border-b border-[var(--color-border)] bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium">類別</th>
                  <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">計畫性停止服務<br/>時間累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">非計畫性停止服務<br/>時間累計 (hrs)</th>
                  <th className="text-right px-4 py-3 font-medium">可用率</th>
                </tr>
              </thead>
              <tbody>
                {serverMonthlySummary.map((row, idx) => (
                  <tr key={SERVER_ASSETS[idx].id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{SERVER_ASSETS[idx].name}</td>
                    <td className="text-right px-4 py-3 font-mono text-xs">
                      {row.totalCount > 1 ? `${row.hoursPerDevice}*${row.totalCount}` : row.hoursPerDevice}
                    </td>
                    <td className="text-right px-4 py-3 text-amber-600">{row.plannedHours}</td>
                    <td className="text-right px-4 py-3 text-red-600">{row.unplannedHours}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`font-semibold ${row.availabilityPct >= 99.9 ? 'text-green-600' : row.availabilityPct >= 99 ? 'text-amber-600' : 'text-red-600'}`}>
                        {row.availabilityPct}%
                      </span>
                    </td>
                  </tr>
                ))}
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
                  <tr className="border-b border-[var(--color-border)] bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium min-w-[160px]">類別</th>
                    <th className="text-left px-4 py-3 font-medium min-w-[160px]">期間</th>
                    <th className="text-right px-4 py-3 font-medium">本季應服務<br/>總時數累計<br/>(hrs)</th>
                    <th className="text-right px-4 py-3 font-medium">本季計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                    <th className="text-right px-4 py-3 font-medium">本季非計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                    <th className="text-right px-4 py-3 font-medium">可用率</th>
                  </tr>
                </thead>
                <tbody>
                  {serverQuarterlyReport.map((device) => (
                    <React.Fragment key={device.label}>
                      {device.monthRows.map((row, i) => (
                        <tr key={`${device.label}-${i}`} className="border-b border-[var(--color-border)] hover:bg-gray-50/50">
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
                          <td className="text-right px-4 py-2.5 text-amber-600">
                            {row.hasData ? row.plannedHours : ''}
                          </td>
                          <td className="text-right px-4 py-2.5 text-red-600">
                            {row.hasData ? row.unplannedHours : ''}
                          </td>
                          <td className="text-right px-4 py-2.5">
                            {row.hasData ? (
                              <span className={`font-semibold ${row.availabilityPct >= 99.9 ? 'text-green-600' : row.availabilityPct >= 99 ? 'text-amber-600' : 'text-red-600'}`}>
                                {row.availabilityPct}%
                              </span>
                            ) : ''}
                          </td>
                        </tr>
                      ))}
                      {/* Quarterly total row */}
                      <tr className="border-b-2 border-[var(--color-border)] bg-amber-50/60">
                        <td className="px-4 py-2.5 text-xs font-semibold">
                          {rocYear}年<br/>第{quarter}季總計
                        </td>
                        <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">
                          {device.totalCount > 1
                            ? `${device.quarterly.hoursPerDevice}*${device.totalCount}`
                            : device.quarterly.hoursPerDevice}
                        </td>
                        <td className="text-right px-4 py-2.5 text-amber-600 font-semibold">{device.quarterly.plannedHours}</td>
                        <td className="text-right px-4 py-2.5 text-red-600 font-semibold">{device.quarterly.unplannedHours}</td>
                        <td className="text-right px-4 py-2.5">
                          <span className={`font-bold ${device.quarterly.availabilityPct >= 99.9 ? 'text-green-600' : device.quarterly.availabilityPct >= 99 ? 'text-amber-600' : 'text-red-600'}`}>
                            {device.quarterly.availabilityPct}%
                          </span>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
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
                  ? 'bg-blue-600 text-white font-medium'
                  : 'hover:bg-gray-100 text-[var(--color-text-muted)]'
              }`}
            >
              工作月報
            </button>
            <button
              onClick={() => setNetworkSubTab('fiber')}
              className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
                networkSubTab === 'fiber'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'hover:bg-gray-100 text-[var(--color-text-muted)]'
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
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  匯出 Word
                </button>
              </div>

              {/* Chart */}
              <BarChartSection data={networkChartData} title={`${rocYear}年第${quarter}季 網路停機時數統計`} />

              {/* ═══ Part 1: Quarterly Device Breakdown ═══ */}
              <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h3 className="font-semibold">{rocYear}年第{quarter}季 — 各設備類型季報</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    可用率 = (本季應服務總時數 - 非計畫性停止服務時間) / 本季應服務總時數 x 100%
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium min-w-[160px]">類別</th>
                        <th className="text-left px-4 py-3 font-medium min-w-[160px]">期間</th>
                        <th className="text-right px-4 py-3 font-medium">本季應服務<br/>總時數累計<br/>(hrs)</th>
                        <th className="text-right px-4 py-3 font-medium">本季計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                        <th className="text-right px-4 py-3 font-medium">本季非計畫性<br/>停止服務<br/>時間累計<br/>(hrs)</th>
                        <th className="text-right px-4 py-3 font-medium">可用率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarterlyReport.map((device) => (
                        <React.Fragment key={device.label}>
                          {device.monthRows.map((row, i) => (
                            <tr key={`${device.label}-${i}`} className="border-b border-[var(--color-border)] hover:bg-gray-50/50">
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
                              <td className="text-right px-4 py-2.5 text-amber-600">
                                {row.hasData ? row.plannedHours : ''}
                              </td>
                              <td className="text-right px-4 py-2.5 text-red-600">
                                {row.hasData ? row.unplannedHours : ''}
                              </td>
                              <td className="text-right px-4 py-2.5">
                                {row.hasData ? (
                                  <span className={`font-semibold ${row.availabilityPct >= 99.9 ? 'text-green-600' : row.availabilityPct >= 99 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {row.availabilityPct}%
                                  </span>
                                ) : ''}
                              </td>
                            </tr>
                          ))}
                          {/* Quarterly total row */}
                          <tr className="border-b-2 border-[var(--color-border)] bg-amber-50/60">
                            <td className="px-4 py-2.5 text-xs font-semibold">
                              {rocYear}年<br/>第{quarter}季總計
                            </td>
                            <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">
                              {device.totalCount > 1
                                ? `${device.quarterly.hoursPerDevice}*${device.totalCount}`
                                : device.quarterly.hoursPerDevice}
                            </td>
                            <td className="text-right px-4 py-2.5 text-amber-600 font-semibold">{device.quarterly.plannedHours}</td>
                            <td className="text-right px-4 py-2.5 text-red-600 font-semibold">{device.quarterly.unplannedHours}</td>
                            <td className="text-right px-4 py-2.5">
                              <span className={`font-bold ${device.quarterly.availabilityPct >= 99.9 ? 'text-green-600' : device.quarterly.availabilityPct >= 99 ? 'text-amber-600' : 'text-red-600'}`}>
                                {device.quarterly.availabilityPct}%
                                <br/><span className="text-xs font-normal text-[var(--color-text-muted)]">【註】</span>
                              </span>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══ Part 2: Monthly Summary ═══ */}
              <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                  <h3 className="font-semibold">
                    {rocYear}年第{quarter}季 — 月報彙總
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
                    <tr className="border-b border-[var(--color-border)] bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">類別</th>
                      <th className="text-right px-4 py-3 font-medium">本月應服務<br/>總時數 (hrs)</th>
                      <th className="text-right px-4 py-3 font-medium">計畫性停止服務<br/>時間累計 (hrs)</th>
                      <th className="text-right px-4 py-3 font-medium">非計畫性停止服務<br/>時間累計 (hrs)</th>
                      <th className="text-right px-4 py-3 font-medium">可用率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.map((row) => (
                      <tr key={row.label} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        <td className="text-right px-4 py-3 font-mono text-xs">
                          {row.totalCount > 1 ? `${row.hoursPerDevice}*${row.totalCount}` : row.hoursPerDevice}
                        </td>
                        <td className="text-right px-4 py-3 text-amber-600">{row.plannedHours}</td>
                        <td className="text-right px-4 py-3 text-red-600">{row.unplannedHours}</td>
                        <td className="text-right px-4 py-3">
                          <span className={`font-semibold ${row.availabilityPct >= 99.9 ? 'text-green-600' : row.availabilityPct >= 99 ? 'text-amber-600' : 'text-red-600'}`}>
                            {row.availabilityPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* ── Fiber Report Tab ── */}
          {/* ══════════════════════════════════════════════ */}
          {networkSubTab === 'fiber' && (
            <>
              {renderCircuitTable(
                `(a) 連線與服務中斷彙總列表 — ${rocYear}年第${quarter}季`,
                circuitSummaryAll,
              )}
              {renderCircuitTable(
                `(b) 計畫性停止服務期間與原因彙整表 — ${rocYear}年第${quarter}季`,
                circuitSummaryPlanned,
              )}
              {renderCircuitTable(
                `(c) 非計畫性停止服務期間與原因彙整表 — ${rocYear}年第${quarter}季`,
                circuitSummaryUnplanned,
              )}
            </>
          )}
        </>
      )}
    </AppShell>
  )
}
