'use client'

import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Search, Monitor, Loader2, Server, Laptop, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface OfficeAsset {
  id: string
  asset_type: string
  asset_type_other: string
  is_cht_asset: boolean
  user_name: string
  note: string
  tax_property_number: string
  property_number: string
  cht_asset_id: string
  network_zone: string
  ip_address: string
  hostname: string
}

const ASSET_TYPES = ['主機', '螢幕', '筆電', '其他']
const NETWORK_ZONES = ['內網', '外網', '中華駐辦internet']
const NEEDS_NETWORK = ['主機', '筆電']
const NEEDS_IP = ['內網', '外網']

export default function OfficeAssetsPage() {
  const [assets, setAssets] = useState<OfficeAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<OfficeAsset | null>(null)
  const [saving, setSaving] = useState(false)
  const [userList, setUserList] = useState<string[]>([])

  // Form state
  const [formType, setFormType] = useState('主機')
  const [formTypeOther, setFormTypeOther] = useState('')
  const [formIsCht, setFormIsCht] = useState(false)
  const [formUser, setFormUser] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formTaxPropNum, setFormTaxPropNum] = useState('')
  const [formProp1, setFormProp1] = useState('')
  const [formProp2, setFormProp2] = useState('')
  const [formProp3, setFormProp3] = useState('')
  const [formChtId, setFormChtId] = useState('')
  const [formZone, setFormZone] = useState('')
  const [formIp, setFormIp] = useState('')
  const [formHostname, setFormHostname] = useState('')

  const fetchAssets = useCallback(async () => {
    const { data, error } = await supabase
      .from('office_assets')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setAssets(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  useEffect(() => {
    supabase.from('users').select('name').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setUserList(data.map((u) => u.name).filter(Boolean))
    })
  }, [])

  const filtered = assets.filter((a) => {
    if (filterType !== 'all') {
      const displayType = a.asset_type === '其他' ? a.asset_type_other : a.asset_type
      if (displayType !== filterType) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const displayType = a.asset_type === '其他' ? a.asset_type_other : a.asset_type
      return (
        displayType.toLowerCase().includes(q) ||
        a.user_name.toLowerCase().includes(q) ||
        a.hostname.toLowerCase().includes(q) ||
        a.ip_address.includes(q) ||
        (a.tax_property_number || '').includes(q) ||
        a.property_number.includes(q) ||
        a.cht_asset_id.toLowerCase().includes(q) ||
        a.note.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Get unique types for filter dropdown
  const uniqueTypes = [...new Set(assets.map((a) => a.asset_type === '其他' ? a.asset_type_other : a.asset_type))].sort()

  function resetForm() {
    setFormType('主機'); setFormTypeOther(''); setFormIsCht(false)
    setFormUser(''); setFormNote(''); setFormTaxPropNum(''); setFormProp1(''); setFormProp2(''); setFormProp3(''); setFormChtId('')
    setFormZone(''); setFormIp(''); setFormHostname('')
  }

  function openNew() {
    setEditing(null)
    resetForm()
    setShowModal(true)
  }

  function openEdit(a: OfficeAsset) {
    setEditing(a)
    setFormType(a.asset_type); setFormTypeOther(a.asset_type_other)
    setFormIsCht(a.is_cht_asset); setFormUser(a.user_name)
    setFormNote(a.note); setFormTaxPropNum(a.tax_property_number || '')
    const parts = (a.property_number || '').split('-')
    setFormProp1(parts[0] || ''); setFormProp2(parts[1] || ''); setFormProp3(parts[2] || '')
    setFormChtId(a.cht_asset_id === '國稅局' ? '' : a.cht_asset_id); setFormZone(a.network_zone)
    setFormIp(a.ip_address); setFormHostname(a.hostname)
    setShowModal(true)
  }

  async function save() {
    if (formType === '其他' && !formTypeOther.trim()) { alert('請輸入自訂資產類型'); return }
    if (!formUser.trim()) { alert('請輸入使用者'); return }

    setSaving(true)
    const payload = {
      asset_type: formType,
      asset_type_other: formType === '其他' ? formTypeOther.trim() : '',
      is_cht_asset: formIsCht,
      user_name: formUser.trim(),
      note: formNote.trim(),
      tax_property_number: !formIsCht ? formTaxPropNum.trim() : '',
      property_number: formIsCht && (formProp1 || formProp2 || formProp3) ? [formProp1.trim(), formProp2.trim(), formProp3.trim()].join('-') : '',
      cht_asset_id: formIsCht ? formChtId.trim() : '國稅局',
      network_zone: NEEDS_NETWORK.includes(formType) ? formZone : '',
      ip_address: NEEDS_NETWORK.includes(formType) && NEEDS_IP.includes(formZone) ? formIp.trim() : '',
      hostname: NEEDS_NETWORK.includes(formType) && NEEDS_IP.includes(formZone) ? formHostname.trim() : '',
    }

    if (editing) {
      await supabase.from('office_assets').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('office_assets').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchAssets()
  }

  async function remove(id: string) {
    if (!confirm('確定要刪除此資產？')) return
    await supabase.from('office_assets').delete().eq('id', id)
    fetchAssets()
  }

  function displayType(a: OfficeAsset) {
    return a.asset_type === '其他' ? a.asset_type_other : a.asset_type
  }

  function assetIcon(type: string) {
    switch (type) {
      case '主機': return <Server className="w-4 h-4 inline mr-2 text-blue-500" />
      case '螢幕': return <Monitor className="w-4 h-4 inline mr-2 text-emerald-500" />
      case '筆電': return <Laptop className="w-4 h-4 inline mr-2 text-purple-500" />
      default: return <Package className="w-4 h-4 inline mr-2 text-amber-500" />
    }
  }

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">辦公室資產管理</h1>
        <button onClick={openNew} className="px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-1">
          <Plus className="w-4 h-4" /> 新增資產
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3">
          <span className="text-2xl font-bold text-[var(--color-primary)]">{assets.length}</span>
          <span className="text-sm text-[var(--color-text-muted)] ml-2">筆資產</span>
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg">
          <option value="all">全部類型</option>
          {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋使用者、IP、主機名稱、財產編號..." className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-border)] rounded-lg" />
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-table-header)]">
                <th className="text-left px-4 py-3 font-medium">資產類型</th>
                <th className="text-left px-4 py-3 font-medium">中華資產</th>
                <th className="text-left px-4 py-3 font-medium">使用者</th>
                <th className="text-left px-4 py-3 font-medium">國稅局編號</th>
                <th className="text-left px-4 py-3 font-medium">財產編號</th>
                <th className="text-left px-4 py-3 font-medium">資產歸屬/ID</th>
                <th className="text-left px-4 py-3 font-medium">網段</th>
                <th className="text-left px-4 py-3 font-medium">IP</th>
                <th className="text-left px-4 py-3 font-medium">HostName</th>
                <th className="text-left px-4 py-3 font-medium">備註</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)]">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {assetIcon(a.asset_type)}
                    {displayType(a)}
                  </td>
                  <td className="px-4 py-3">
                    {a.is_cht_asset ? (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">中華</span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{a.user_name}</td>
                  <td className="px-4 py-3 text-xs font-mono">{a.tax_property_number || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{a.property_number || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{a.cht_asset_id || '—'}</td>
                  <td className="px-4 py-3">{a.network_zone || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{a.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{a.hostname || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] max-w-[200px] truncate">{a.note || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(a)} className="p-1 hover:bg-[var(--color-hover)] rounded mr-1"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(a.id)} className="p-1 hover:bg-[var(--color-danger-dim)] text-[var(--color-danger)] rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-8 text-[var(--color-text-muted)]">無符合條件的資產</div>}
      </div>

      {/* ── Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? '編輯資產' : '新增資產'} width="max-w-xl">
        <div className="space-y-4">
          {/* 資產類型 */}
          <div>
            <label className="block text-sm font-medium mb-1">資產類型 *</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {formType === '其他' && (
            <div>
              <label className="block text-sm font-medium mb-1">自訂類型名稱 *</label>
              <input value={formTypeOther} onChange={(e) => setFormTypeOther(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="請輸入資產類型" />
            </div>
          )}

          {/* 使用者 */}
          <div>
            <label className="block text-sm font-medium mb-1">使用者 *</label>
            <select value={formUser} onChange={(e) => setFormUser(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
              <option value="">請選擇使用者</option>
              {userList.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          {/* 是否為中華資產 */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="chtAsset" checked={formIsCht} onChange={(e) => setFormIsCht(e.target.checked)} className="w-4 h-4 rounded border-[var(--color-border)]" />
            <label htmlFor="chtAsset" className="text-sm font-medium">是否為中華資產</label>
          </div>

          {/* 非中華資產：國稅局財產編號 */}
          {!formIsCht && (
            <div>
              <label className="block text-sm font-medium mb-1">國稅局財產編號</label>
              <input value={formTaxPropNum} onChange={(e) => setFormTaxPropNum(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono text-sm" placeholder="國稅局財產編號" />
            </div>
          )}

          {/* 中華資產欄位 */}
          {formIsCht && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">財產編號</label>
                <div className="flex items-center gap-1.5">
                  <input value={formProp1} onChange={(e) => setFormProp1(e.target.value)} className="w-[5.5rem] px-2 py-2 border border-[var(--color-border)] rounded-lg text-center font-mono text-sm" placeholder="3010103" maxLength={10} />
                  <span className="text-base font-bold text-[var(--color-text-muted)]">-</span>
                  <input value={formProp2} onChange={(e) => setFormProp2(e.target.value)} className="w-[5.5rem] px-2 py-2 border border-[var(--color-border)] rounded-lg text-center font-mono text-sm" placeholder="0148629" maxLength={10} />
                  <span className="text-base font-bold text-[var(--color-text-muted)]">-</span>
                  <input value={formProp3} onChange={(e) => setFormProp3(e.target.value)} className="w-14 px-2 py-2 border border-[var(--color-border)] rounded-lg text-center font-mono text-sm" placeholder="000" maxLength={5} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">資產ID</label>
                <input value={formChtId} onChange={(e) => setFormChtId(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="PC2025016243" />
              </div>
            </div>
          )}

          {/* 網段（主機/筆電才顯示） */}
          {NEEDS_NETWORK.includes(formType) && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">網段</label>
                <select value={formZone} onChange={(e) => setFormZone(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                  <option value="">請選擇網段</option>
                  {NETWORK_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              {/* IP / HostName（內網/外網才顯示） */}
              {NEEDS_IP.includes(formZone) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">IP</label>
                    <input value={formIp} onChange={(e) => setFormIp(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" placeholder="192.168.1.100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">HostName</label>
                    <input value={formHostname} onChange={(e) => setFormHostname(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* 備註 */}
          <div>
            <label className="block text-sm font-medium mb-1">備註</label>
            <textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} rows={2} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-hover)]">取消</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 flex items-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              儲存
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
