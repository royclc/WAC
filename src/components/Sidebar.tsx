'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Wifi,
  Users,
  HardDrive,
  LogOut,
  Wrench,
  Building2,
  Tag,
  Store,
  Cable,
  Landmark,
  BarChart3,
  Activity,
  Server,
  FileText,
  Monitor,
} from 'lucide-react'

const navItems = [
  { href: '/calendar', label: '工作月曆', icon: Calendar },
  { href: '/maintenance', label: '保養記錄', icon: Wrench },
  { href: '/availability/server', label: '硬體可用率', icon: HardDrive },
  { href: '/availability/network', label: '網路可用率', icon: Wifi },
  { href: '/reports', label: '統計報表', icon: BarChart3 },
  { href: '/changes', label: '服務變動記錄', icon: FileText },
]

const adminItems = [
  { href: '/admin/organizations', label: '單位管理', icon: Landmark },
  { href: '/admin/servers', label: '硬體管理', icon: HardDrive },
  { href: '/admin/vms', label: 'VM 管理', icon: Server },
  { href: '/admin/maintenance', label: '保養類別管理', icon: Wrench },
  { href: '/admin/units', label: '網路管理', icon: Building2 },
  { href: '/admin/circuits', label: '線路管理', icon: Cable },
  { href: '/admin/vendors', label: '廠商管理', icon: Store },
  { href: '/admin/event-types', label: '事件類型管理', icon: Tag },
  { href: '/admin/office-assets', label: '辦公室資產', icon: Monitor },
  { href: '/admin/users', label: '使用者管理', icon: Users },
]

interface SidebarProps {
  userRole?: 'admin' | 'user'
  userName?: string
}

export default function Sidebar({ userRole = 'user', userName = '使用者' }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex flex-col h-screen fixed left-0 top-0">
      {/* Brand */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center">
            <Server className="w-4.5 h-4.5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--color-text)] tracking-wide">MAC 系統</h1>
            <p className="text-[10px] text-[var(--color-text-dim)] tracking-wider">DATA CENTER MGMT</p>
          </div>
        </div>
        {/* Status indicator */}
        <div className="flex items-center gap-1.5 mt-3 px-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-emerald-400 font-medium tracking-wider">SYSTEM ONLINE</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] text-[var(--color-text-dim)] px-3 py-2 uppercase tracking-[0.15em] font-semibold">功能</p>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? 'bg-[var(--color-sidebar-active)] text-[var(--color-primary-text)] font-medium border-l-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text)]'
              }`}
            >
              <item.icon className={`w-4 h-4 ${active ? 'text-[var(--color-primary)]' : ''}`} />
              {item.label}
            </Link>
          )
        })}

        {userRole === 'admin' && (
          <>
            <p className="text-[10px] text-[var(--color-text-dim)] px-3 py-2 mt-4 uppercase tracking-[0.15em] font-semibold">管理</p>
            {adminItems.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    active
                      ? 'bg-[var(--color-sidebar-active)] text-[var(--color-primary-text)] font-medium border-l-2 border-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${active ? 'text-[var(--color-primary)]' : ''}`} />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[var(--color-primary)]">{userName[0]}</span>
            </div>
            <span className="text-sm text-[var(--color-text-muted)]">{userName}</span>
          </div>
          <button className="text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
