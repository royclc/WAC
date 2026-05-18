// ── Shared default data across pages ──
// 各頁面以此作為初始值載入，未來可改為 API / Context

// ── 廠商 ──
export interface VendorItem {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  description: string
}

export const DEFAULT_VENDORS: VendorItem[] = [
  { id: 'v1', name: '宏華', contact_person: '李經理', phone: '02-1234-5678', email: 'lee@honghua.com', description: '網路設備供應商' },
  { id: 'v2', name: 'HPE', contact_person: '張業務', phone: '02-8765-4321', email: 'chang@hpe.com', description: 'x86伺服器供應商' },
  { id: 'v3', name: 'NetApp', contact_person: '王工程師', phone: '02-2222-3333', email: 'wang@netapp.com', description: '儲存設備供應商' },
  { id: 'v4', name: '大金空調', contact_person: '陳先生', phone: '02-3333-4444', email: 'chen@daikin.com', description: '空調設備維護' },
  { id: 'v5', name: '永安消防', contact_person: '林主任', phone: '02-5555-6666', email: 'lin@yongan.com', description: '消防設備維護' },
  { id: 'v6', name: '台電機電', contact_person: '吳工程師', phone: '02-7777-8888', email: 'wu@taipower.com', description: '發電機與機電維護' },
]

// ── 保養類別 ──
export interface MaintenanceCategoryDef {
  id: string
  key: string
  label: string
  color: string
}

export const DEFAULT_MAINTENANCE_CATEGORIES: MaintenanceCategoryDef[] = [
  { id: 'mc1', key: 'hvac', label: '空調', color: '#3B82F6' },
  { id: 'mc2', key: 'fire', label: '消防', color: '#EF4444' },
  { id: 'mc3', key: 'electrical', label: '機電', color: '#F59E0B' },
  { id: 'mc4', key: 'generator', label: '發電機', color: '#8B5CF6' },
  { id: 'mc5', key: 'server', label: '伺服器', color: '#10B981' },
  { id: 'mc6', key: 'network', label: '網路設備', color: '#06B6D4' },
]
