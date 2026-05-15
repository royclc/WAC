export type UserRole = 'admin' | 'user'
export type AssetType = 'server' | 'network'
export type EventType = 'downtime' | 'maintenance' | 'other'
export type LeaveType = 'annual' | 'sick' | 'personal' | 'official' | 'other'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  type: AssetType
  name: string
  ip_address: string | null
  location: string | null
  description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AvailabilityEvent {
  id: string
  asset_id: string
  event_type: EventType
  title: string
  description: string | null
  start_time: string
  end_time: string
  duration_minutes: number
  created_by: string | null
  created_at: string
  updated_at: string
  asset?: Asset
}

export interface WorkEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  color: string
  created_by: string | null
  created_at: string
  updated_at: string
  assignees?: User[]
}

export interface LeaveRecord {
  id: string
  user_id: string
  leave_type: LeaveType
  leave_date: string
  is_half_day: boolean
  half_day_period: 'morning' | 'afternoon' | null
  note: string | null
  created_at: string
  updated_at: string
  user?: User
}

export interface MonthlyAvailability {
  asset_id: string
  asset_type: AssetType
  asset_name: string
  month: string
  event_count: number
  total_downtime_minutes: number
  availability_pct: number
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>; Update: Partial<User> }
      assets: { Row: Asset; Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Asset> }
      availability_events: { Row: AvailabilityEvent; Insert: Omit<AvailabilityEvent, 'id' | 'duration_minutes' | 'created_at' | 'updated_at'>; Update: Partial<AvailabilityEvent> }
      work_events: { Row: WorkEvent; Insert: Omit<WorkEvent, 'id' | 'created_at' | 'updated_at'>; Update: Partial<WorkEvent> }
      leave_records: { Row: LeaveRecord; Insert: Omit<LeaveRecord, 'id' | 'created_at' | 'updated_at'>; Update: Partial<LeaveRecord> }
    }
  }
}
