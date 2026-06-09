'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Loader2, Search, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

interface ServiceChange {
  id: string
  category: string
  change_date: string
  platform: string
  version: string
  change_type: string
  description: string
  description_custom: string
  host_names: string
  ticket_no: string
  directions: string
  purpose: string
  is_reviewed: boolean
  note: string
}

interface VmOption {
  hostname: string
  ip_address: string
  network_zone: string
}

interface HwOption {
  id: string
  name: string
  category_key: string
  ip_address: string
  location: string
}

const CATEGORIES = ['GCB', 'WSUS', 'Firewall', 'VM', 'Redhat', '實體機', '其他系統設定'] as const
type Category = typeof CATEGORIES[number]

const GCB_PLATFORMS = ['Windows', 'RedHat', '其他']
const WSUS_PLATFORMS = ['全部', '外網', '內網', '中繼']
const VM_PLATFORMS = ['Windows', 'Linux', '其他']
const VM_VERSION_MAP: Record<string, string[]> = {
  'Windows': ['Server 2019', 'Server 2022'],
  'Linux': ['RedHat', 'Ubuntu', '其他'],
}
const VM_CHANGE_TYPES = ['建立', '修改', '移除', '其他']
const DESCRIPTION_OPTIONS = ['依業主需求', '弱點修補', '測試', '其他']
const FW_CHANGE_TYPES = ['新增', '修改', '其他']
const FW_LOCATIONS = ['中心', '北國', '北區', '中區', '南區', '高國']
const RH_CHANGE_TYPES = ['系統更新', '設定變更', '弱點修補', '其他']

const today = () => new Date().toISOString().split('T')[0]

export default function ServiceChangesPage() {
  const [activeTab, setActiveTab] = useState<Category>('GCB')
  const [records, setRecords] = useState<ServiceChange[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [vmOptions, setVmOptions] = useState<VmOption[]>([])
  const [hwOptions, setHwOptions] = useState<HwOption[]>([])
  const [hostSearch, setHostSearch] = useState('')
  const [hostZoneFilter, setHostZoneFilter] = useState('全部')
  const [hwSearch, setHwSearch] = useState('')
  const [hwCatFilter, setHwCatFilter] = useState('全部')

  // Form state
  const [formDate, setFormDate] = useState(today())
  const [formPlatform, setFormPlatform] = useState('')
  const [formVersion, setFormVersion] = useState('')
  const [formChangeType, setFormChangeType] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDescCustom, setFormDescCustom] = useState('')
  const [formHostNames, setFormHostNames] = useState<string[]>([])
  const [formTicketNo, setFormTicketNo] = useState('')
  const [formChangeTypeCustom, setFormChangeTypeCustom] = useState('')
  const [formDirections, setFormDirections] = useState<{ from: string; to: string }[]>([{ from: '中心', to: '中心' }])
  const [formPurpose, setFormPurpose] = useState('')
  const [formIsReviewed, setFormIsReviewed] = useState(false)
  const [formNote, setFormNote] = useState('')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('service_changes')
      .select('*')
      .eq('category', activeTab)
      .order('change_date', { ascending: false })
    if (data) setRecords(data as ServiceChange[])
    setLoading(false)
  }, [activeTab])

  const fetchVms = useCallback(async () => {
    const { data } = await supabase.from('vm_instances').select('hostname, ip_address, network_zone').order('hostname')
    if (data) setVmOptions(data as VmOption[])
  }, [])

  const fetchHwAssets = useCallback(async () => {
    const { data } = await supabase.from('hardware_assets').select('id, name, category_key, ip_address, location').eq('is_active', true).order('name')
    if (data) setHwOptions(data as HwOption[])
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { fetchVms() }, [fetchVms])
  useEffect(() => { fetchHwAssets() }, [fetchHwAssets])

  function resetForm() {
    setFormDate(today())
    setFormPlatform(getDefaultPlatform(activeTab))
    setFormVersion('')
    setFormChangeType('')
    setFormDesc('')
    setFormDescCustom('')
    setFormHostNames([])
    setFormTicketNo('')
    setFormChangeType('')
    setFormChangeTypeCustom('')
    setFormDirections([{ from: '中心', to: '中心' }])
    setFormPurpose('')
    setFormIsReviewed(false)
    setFormNote('')
    setHostSearch('')
    setHostZoneFilter('全部')
    setHwSearch('')
    setHwCatFilter('全部')
  }

  function getDefaultPlatform(cat: Category) {
    if (cat === 'GCB') return 'Windows'
    if (cat === 'WSUS') return '全部'
    if (cat === 'VM') return 'Windows'
    return ''
  }

  async function autoTicketNo() {
    const { data } = await supabase
      .from('service_changes')
      .select('ticket_no')
      .eq('category', 'Firewall')
      .not('ticket_no', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(100)
    let maxN = 0
    if (data) {
      data.forEach((r: { ticket_no: string }) => {
        const m = r.ticket_no.match(/駐點-(\d+)/)
        if (m) maxN = Math.max(maxN, parseInt(m[1]))
      })
    }
    setFormTicketNo(`駐點-${maxN + 1}`)
  }

  function openAdd() {
    setEditingId(null)
    resetForm()
    setShowModal(true)
  }

  function openEdit(r: ServiceChange) {
    setEditingId(r.id)
    setFormDate(r.change_date)
    setFormPlatform(r.platform)
    setFormVersion(r.version)
    setFormChangeType(r.change_type)
    if (DESCRIPTION_OPTIONS.slice(0, -1).includes(r.description)) {
      setFormDesc(r.description)
      setFormDescCustom('')
    } else if (r.description) {
      setFormDesc('其他')
      setFormDescCustom(r.description)
    } else {
      setFormDesc('')
      setFormDescCustom('')
    }
    setFormHostNames(r.host_names ? r.host_names.split('|||') : [])
    setFormTicketNo(r.ticket_no || '')
    // Firewall change_type with custom
    if (r.category === 'Firewall' && r.change_type && !['新增', '修改'].includes(r.change_type)) {
      setFormChangeTypeCustom(r.change_type)
      setFormChangeType('其他')
    } else {
      setFormChangeTypeCustom('')
    }
    setFormDirections(r.directions ? JSON.parse(r.directions) : [{ from: '中心', to: '中心' }])
    setFormPurpose(r.purpose || '')
    setFormIsReviewed(r.is_reviewed || false)
    setFormNote(r.note)
    setHostSearch('')
    setShowModal(true)
  }

  async function save() {
    // Firewall 駐點單號唯一性檢查
    if (activeTab === 'Firewall' && formTicketNo) {
      const query = supabase
        .from('service_changes')
        .select('id')
        .eq('category', 'Firewall')
        .eq('ticket_no', formTicketNo)
      if (editingId) query.neq('id', editingId)
      const { data: dup } = await query.limit(1)
      if (dup && dup.length > 0) {
        alert(`駐點單號「${formTicketNo}」已存在，請使用其他編號`)
        return
      }
    }

    setSaving(true)
    const desc = formDesc === '其他' ? formDescCustom.trim() : formDesc
    const changeType = formChangeType === '其他' ? formChangeTypeCustom.trim() : formChangeType
    const payload: Record<string, unknown> = {
      category: activeTab,
      change_date: formDate,
      platform: formPlatform,
      version: formVersion,
      change_type: activeTab === 'Firewall' ? changeType : formChangeType,
      description: activeTab === 'Firewall' ? '' : desc,
      description_custom: formDesc === '其他' ? formDescCustom.trim() : '',
      host_names: formHostNames.join('|||'),
      ticket_no: formTicketNo,
      directions: activeTab === 'Firewall' ? JSON.stringify(formDirections) : '',
      purpose: formPurpose,
      is_reviewed: formIsReviewed,
      note: formNote,
    }
    if (editingId) {
      await supabase.from('service_changes').update(payload).eq('id', editingId)
    } else {
      await supabase.from('service_changes').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchRecords()
  }

  async function remove(id: string | null) {
    if (!id || !confirm('確定刪除？')) return
    await supabase.from('service_changes').delete().eq('id', id)
    fetchRecords()
  }

  function setQuickDate(offset: number) {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    setFormDate(d.toISOString().split('T')[0])
  }

  async function exportExcel() {
    // Fetch all categories
    const { data } = await supabase
      .from('service_changes')
      .select('*')
      .order('change_date', { ascending: false })
    if (!data) return

    const wb = XLSX.utils.book_new()

    for (const cat of CATEGORIES) {
      const catRecords = data.filter((r: ServiceChange) => r.category === cat)
      let rows: Record<string, unknown>[]

      if (cat === 'Firewall') {
        rows = catRecords.map((r: ServiceChange) => {
          const dirs = r.directions ? JSON.parse(r.directions).map((d: { from: string; to: string }) => `${d.from}→${d.to}`).join(', ') : ''
          return {
            '日期': r.change_date,
            '駐點單號': r.ticket_no,
            '類型': r.change_type,
            '開通方向': dirs,
            '開通目的': r.purpose,
            '送檢核': r.is_reviewed ? '是' : '否',
            '備註': r.note,
          }
        })
      } else if (cat === 'GCB') {
        rows = catRecords.map((r: ServiceChange) => ({
          '日期': r.change_date, '平台': r.platform, '修改說明': r.description, '備註': r.note,
        }))
      } else if (cat === 'WSUS') {
        rows = catRecords.map((r: ServiceChange) => ({
          '日期': r.change_date, '平台': r.platform, '修改說明': r.description, '備註': r.note,
        }))
      } else if (cat === 'VM') {
        rows = catRecords.map((r: ServiceChange) => ({
          '日期': r.change_date, '平台': r.platform, '版本': r.version, '類別': r.change_type, '備註': r.note,
        }))
      } else if (cat === 'Redhat') {
        rows = catRecords.map((r: ServiceChange) => ({
          '日期': r.change_date, '類別': r.change_type, '修改說明': r.description, '備註': r.note,
        }))
      } else if (cat === '實體機') {
        rows = catRecords.map((r: ServiceChange) => ({
          '日期': r.change_date, '設備': r.host_names?.replace(/\|\|\|/g, ', '), '修改說明': r.description, '備註': r.note,
        }))
      } else {
        // 其他系統設定
        rows = catRecords.map((r: ServiceChange) => ({
          '日期': r.change_date, '主機': r.host_names?.replace(/\|\|\|/g, ', '), '修改說明': r.description, '備註': r.note,
        }))
      }

      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}])
      // Auto column width
      if (rows.length > 0) {
        const keys = Object.keys(rows[0])
        ws['!cols'] = keys.map((k) => {
          const maxLen = Math.max(k.length * 2, ...rows.map((r) => String(r[k] || '').length))
          return { wch: Math.min(Math.max(maxLen, 8), 50) }
        })
      }
      const sheetName = cat.length > 31 ? cat.slice(0, 31) : cat
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }

    XLSX.writeFile(wb, `服務變動記錄_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const filtered = records.filter((r) => {
    const term = searchTerm.toLowerCase()
    return (
      r.platform?.toLowerCase().includes(term) ||
      r.description?.toLowerCase().includes(term) ||
      r.note?.toLowerCase().includes(term) ||
      r.host_names?.toLowerCase().includes(term) ||
      r.change_type?.toLowerCase().includes(term) ||
      r.ticket_no?.toLowerCase().includes(term) ||
      r.purpose?.toLowerCase().includes(term)
    )
  })

  // Column config per category
  const getColumns = (cat: Category) => {
    switch (cat) {
      case 'GCB': return ['日期', '平台', '修改說明', '備註']
      case 'WSUS': return ['日期', '平台', '修改說明', '備註']
      case 'Firewall': return ['日期', '駐點單號', '類型', '開通目的', '送檢核']
      case 'VM': return ['日期', '平台', '版本', '類別', '備註']
      case 'Redhat': return ['日期', '類別', '修改說明', '備註']
      case '實體機': return ['日期', '設備', '修改說明', '備註']
      case '其他系統設定': return ['日期', '主機', '修改說明', '備註']
    }
  }

  const getCellValues = (r: ServiceChange, cat: Category) => {
    switch (cat) {
      case 'GCB': return [r.change_date, r.platform, r.description, r.note]
      case 'WSUS': return [r.change_date, r.platform, r.description, r.note]
      case 'Firewall': return [r.change_date, r.ticket_no, r.change_type, r.purpose, r.is_reviewed ? '✓' : '']
      case 'VM': return [r.change_date, r.platform, r.version, r.change_type, r.note]
      case 'Redhat': return [r.change_date, r.change_type, r.description, r.note]
      case '實體機': return [r.change_date, r.host_names?.replace(/\|\|\|/g, ', '), r.description, r.note]
      case '其他系統設定': return [r.change_date, r.host_names?.replace(/\|\|\|/g, ', '), r.description, r.note]
    }
  }

  // Toggle host selection
  function toggleHost(label: string) {
    setFormHostNames((prev) =>
      prev.includes(label) ? prev.filter((h) => h !== label) : [...prev, label]
    )
  }

  const hwCategories = [...new Set(hwOptions.map((h) => h.category_key))].sort()

  const filteredHw = hwOptions.filter((h) => {
    const q = hwSearch.toLowerCase()
    const matchSearch = h.name.toLowerCase().includes(q) || h.ip_address.toLowerCase().includes(q)
    const matchCat = hwCatFilter === '全部' || h.category_key === hwCatFilter
    return matchSearch && matchCat
  })

  const filteredVms = vmOptions.filter((v) => {
    const q = hostSearch.toLowerCase()
    const matchSearch = v.hostname.toLowerCase().includes(q) || v.ip_address.toLowerCase().includes(q)
    const matchZone = hostZoneFilter === '全部' || v.network_zone === hostZoneFilter
    return matchSearch && matchZone
  })

  // ---- Render form by category ----
  const renderForm = () => {
    return (
      <div className="space-y-4">
        {/* Date - shared */}
        <div>
          <label className="block text-sm font-medium mb-1">日期</label>
          <div className="flex gap-2 items-center">
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]" />
            <button type="button" onClick={() => setQuickDate(0)}
              className="px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">今天</button>
            <button type="button" onClick={() => setQuickDate(-1)}
              className="px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">昨天</button>
            <button type="button" onClick={() => setQuickDate(-7)}
              className="px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">上週</button>
          </div>
        </div>

        {/* GCB */}
        {activeTab === 'GCB' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">平台</label>
              <select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                {GCB_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            {renderDescriptionField()}
          </>
        )}

        {/* WSUS */}
        {activeTab === 'WSUS' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">平台</label>
              <select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                {WSUS_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">修改說明</label>
              <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="輸入修改說明" />
            </div>
          </>
        )}

        {/* Firewall */}
        {activeTab === 'Firewall' && (
          <>
            {/* 駐點單號 */}
            <div>
              <label className="block text-sm font-medium mb-1">駐點單號</label>
              <div className="flex gap-2">
                <div className="flex flex-1 items-center border border-[var(--color-border)] rounded-lg overflow-hidden">
                  <span className="px-3 py-2 text-sm bg-[var(--color-table-header)] text-[var(--color-text-muted)] border-r border-[var(--color-border)]">駐點-</span>
                  <input value={formTicketNo.replace(/^駐點-/, '')}
                    onChange={(e) => setFormTicketNo(`駐點-${e.target.value.replace(/\D/g, '')}`)}
                    className="flex-1 px-3 py-2 text-sm bg-transparent outline-none" placeholder="編號" />
                </div>
                <button type="button" onClick={autoTicketNo}
                  className="px-3 py-2 text-xs border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] whitespace-nowrap">自動編號</button>
              </div>
            </div>
            {/* 類型 */}
            <div>
              <label className="block text-sm font-medium mb-1">類型</label>
              <select value={formChangeType} onChange={(e) => { setFormChangeType(e.target.value); if (e.target.value !== '其他') setFormChangeTypeCustom('') }}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                <option value="">請選擇</option>
                {FW_CHANGE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              {formChangeType === '其他' && (
                <input value={formChangeTypeCustom} onChange={(e) => setFormChangeTypeCustom(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="輸入自訂類型" />
              )}
            </div>
            {/* 開通方向 */}
            <div>
              <label className="block text-sm font-medium mb-1">開通方向</label>
              <div className="space-y-2">
                {formDirections.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)] w-6 shrink-0">從</span>
                    <select value={d.from} onChange={(e) => {
                      const next = [...formDirections]; next[i] = { ...next[i], from: e.target.value }; setFormDirections(next)
                    }} className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                      {FW_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                    <span className="text-xs text-[var(--color-text-muted)] w-6 shrink-0 text-center">到</span>
                    <select value={d.to} onChange={(e) => {
                      const next = [...formDirections]; next[i] = { ...next[i], to: e.target.value }; setFormDirections(next)
                    }} className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                      {FW_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                    {formDirections.length > 1 && (
                      <button type="button" onClick={() => setFormDirections(formDirections.filter((_, j) => j !== i))}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setFormDirections([...formDirections, { from: '中心', to: '中心' }])}
                className="mt-2 flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                <Plus className="w-3.5 h-3.5" /> 新增方向
              </button>
            </div>
            {/* 開通目的 */}
            <div>
              <label className="block text-sm font-medium mb-1">開通目的</label>
              <textarea value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} rows={4}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm resize-none" placeholder="輸入開通目的..." />
            </div>
            {/* 是否送檢核 */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_reviewed" checked={formIsReviewed} onChange={(e) => setFormIsReviewed(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]" />
              <label htmlFor="is_reviewed" className="text-sm font-medium cursor-pointer">是否送檢核</label>
            </div>
          </>
        )}

        {/* VM */}
        {activeTab === 'VM' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">平台</label>
                <select value={formPlatform} onChange={(e) => {
                  setFormPlatform(e.target.value)
                  const vers = VM_VERSION_MAP[e.target.value]
                  setFormVersion(vers ? vers[0] : '')
                }}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                  {VM_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">版本</label>
                {VM_VERSION_MAP[formPlatform] ? (
                  <select value={formVersion} onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                    {VM_VERSION_MAP[formPlatform].map((v) => <option key={v}>{v}</option>)}
                  </select>
                ) : (
                  <input value={formVersion} onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="輸入版本" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">類別</label>
              <select value={formChangeType} onChange={(e) => setFormChangeType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                <option value="">請選擇</option>
                {VM_CHANGE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Redhat */}
        {activeTab === 'Redhat' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">類別</label>
              <select value={formChangeType} onChange={(e) => setFormChangeType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                <option value="">請選擇</option>
                {RH_CHANGE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">修改說明</label>
              <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="輸入修改說明" />
            </div>
          </>
        )}

        {/* 實體機 */}
        {activeTab === '實體機' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">設備（多選）</label>
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {['全部', ...hwCategories].map((c) => (
                  <button key={c} type="button" onClick={() => setHwCatFilter(c)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      hwCatFilter === c
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'
                    }`}>{c}</button>
                ))}
              </div>
              <div className="relative">
                <input value={hwSearch} onChange={(e) => setHwSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="搜尋設備名稱或 IP..." />
              </div>
              <div className="mt-1 max-h-44 overflow-y-auto border border-[var(--color-border)] rounded-lg">
                {filteredHw.map((h) => {
                  const label = `${h.name}${h.ip_address ? ` (${h.ip_address})` : ''}`
                  const selected = formHostNames.includes(label)
                  return (
                    <div key={h.id} onClick={() => toggleHost(label)}
                      className={`px-3 py-1.5 text-sm cursor-pointer flex items-center gap-2 hover:bg-[var(--color-hover)] ${selected ? 'bg-[var(--color-primary-dim)]' : ''}`}>
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${selected ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'}`}>
                        {selected && '✓'}
                      </span>
                      <span className="font-mono">{h.name}</span>
                      {h.ip_address && <span className="text-[var(--color-text-muted)]">{h.ip_address}</span>}
                      <span className="ml-auto text-[10px] text-[var(--color-text-dim)]">{h.category_key}</span>
                      {h.location && <span className="text-[10px] text-[var(--color-text-dim)]">{h.location}</span>}
                    </div>
                  )
                })}
                {filteredHw.length === 0 && <div className="px-3 py-2 text-sm text-[var(--color-text-muted)]">無符合設備</div>}
              </div>
              {formHostNames.length > 0 && (
                <div className="mt-2 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1.5">已選擇 {formHostNames.length} 台設備</div>
                  <div className="flex flex-wrap gap-1.5">
                    {formHostNames.map((h) => (
                      <span key={h} className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-primary-dim)] text-[var(--color-primary)] text-xs rounded-full">
                        {h}
                        <button type="button" onClick={() => toggleHost(h)} className="hover:text-red-400">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {renderDescriptionField()}
          </>
        )}

        {/* 其他系統設定 */}
        {activeTab === '其他系統設定' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">主機（多選）</label>
              {/* Zone quick filter */}
              <div className="flex gap-1.5 mb-2">
                {['全部', '內網', '中繼', '外網'].map((z) => (
                  <button key={z} type="button" onClick={() => setHostZoneFilter(z)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      hostZoneFilter === z
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]'
                    }`}>{z}</button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <input value={hostSearch} onChange={(e) => setHostSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="搜尋主機名稱或 IP..." />
              </div>
              {/* VM list */}
              <div className="mt-1 max-h-44 overflow-y-auto border border-[var(--color-border)] rounded-lg">
                {filteredVms.map((v) => {
                  const label = `${v.hostname} (${v.ip_address})`
                  const selected = formHostNames.includes(label)
                  return (
                    <div key={label} onClick={() => toggleHost(label)}
                      className={`px-3 py-1.5 text-sm cursor-pointer flex items-center gap-2 hover:bg-[var(--color-hover)] ${selected ? 'bg-[var(--color-primary-dim)]' : ''}`}>
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${selected ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'}`}>
                        {selected && '✓'}
                      </span>
                      <span className="font-mono">{v.hostname}</span>
                      <span className="text-[var(--color-text-muted)]">{v.ip_address}</span>
                      <span className="ml-auto text-[10px] text-[var(--color-text-dim)]">{v.network_zone}</span>
                    </div>
                  )
                })}
                {filteredVms.length === 0 && <div className="px-3 py-2 text-sm text-[var(--color-text-muted)]">無符合主機</div>}
              </div>
              {/* Selected hosts */}
              {formHostNames.length > 0 && (
                <div className="mt-2 p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
                  <div className="text-xs text-[var(--color-text-muted)] mb-1.5">已選擇 {formHostNames.length} 台主機</div>
                  <div className="flex flex-wrap gap-1.5">
                    {formHostNames.map((h) => (
                      <span key={h} className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-primary-dim)] text-[var(--color-primary)] text-xs rounded-full">
                        {h}
                        <button type="button" onClick={() => toggleHost(h)} className="hover:text-red-400">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {renderDescriptionField()}
          </>
        )}

        {/* Note - shared */}
        <div>
          <label className="block text-sm font-medium mb-1">備註/說明</label>
          <textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} rows={3}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm resize-none" placeholder="輸入備註..." />
        </div>
      </div>
    )
  }

  // Shared description dropdown with "其他" custom input
  const renderDescriptionField = () => (
    <div>
      <label className="block text-sm font-medium mb-1">修改說明</label>
      <select value={formDesc} onChange={(e) => { setFormDesc(e.target.value); if (e.target.value !== '其他') setFormDescCustom('') }}
        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
        <option value="">請選擇</option>
        {DESCRIPTION_OPTIONS.map((d) => <option key={d}>{d}</option>)}
      </select>
      {formDesc === '其他' && (
        <input value={formDescCustom} onChange={(e) => setFormDescCustom(e.target.value)}
          className="w-full mt-2 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" placeholder="輸入自訂說明" />
      )}
    </div>
  )

  const tabColors: Record<string, string> = {
    'GCB': 'text-blue-400',
    'WSUS': 'text-emerald-400',
    'Firewall': 'text-orange-400',
    'VM': 'text-purple-400',
    'Redhat': 'text-red-400',
    '實體機': 'text-amber-400',
    '其他系統設定': 'text-cyan-400',
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">服務變動記錄</h2>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)] transition">
            <Download className="w-4 h-4" /> 匯出 Excel
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:brightness-110 transition">
            <Plus className="w-4 h-4" /> 新增記錄
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--color-border)] overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => { setActiveTab(cat); setSearchTerm('') }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activeTab === cat
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
            }`}>
            <span className={activeTab === cat ? '' : tabColors[cat]}>{cat}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-dim)]" />
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]"
          placeholder="搜尋..." />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /></div>
      ) : (
        <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                {getColumns(activeTab).map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">{col}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={getColumns(activeTab).length + 1} className="px-4 py-10 text-center text-[var(--color-text-muted)]">尚無記錄</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors">
                  {getCellValues(r, activeTab)?.map((val, i) => {
                    const cols = getColumns(activeTab)
                    const isWide = cols && (cols[i] === '開通目的' || cols[i] === '備註' || cols[i] === '修改說明' || cols[i] === '主機')
                    return <td key={i} className={`px-4 py-3 truncate ${isWide ? 'max-w-[400px]' : 'max-w-[200px]'}`}>{val}</td>
                  })}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-[var(--color-hover)] rounded-lg">
                        <Pencil className="w-4 h-4 text-[var(--color-text-muted)]" />
                      </button>
                      <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record count */}
      <div className="mt-3 text-xs text-[var(--color-text-dim)]">共 {filtered.length} 筆</div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? '編輯記錄' : '新增記錄'} width="max-w-2xl">
        {renderForm()}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--color-border)]">
          <div>
            {editingId && (
              <button onClick={() => { remove(editingId); setShowModal(false) }} disabled={saving}
                className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg">刪除</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:brightness-110 disabled:opacity-50">
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
