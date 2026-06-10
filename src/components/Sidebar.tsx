'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  Server,
  FileText,
  Monitor,
  ChevronDown,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  key: string
  label: string
  items: NavItem[]
}

// ── 功能選單（分組） ──
const navGroups: NavGroup[] = [
  {
    key: 'daily',
    label: '日常作業',
    items: [
      { href: '/calendar', label: '工作月曆', icon: Calendar },
      { href: '/maintenance', label: '保養記錄', icon: Wrench },
      { href: '/changes', label: '服務變動記錄', icon: FileText },
    ],
  },
  {
    key: 'availability',
    label: '可用率與報表',
    items: [
      { href: '/availability/server', label: '硬體可用率', icon: HardDrive },
      { href: '/availability/network', label: '網路可用率', icon: Wifi },
      { href: '/reports', label: '統計報表', icon: BarChart3 },
    ],
  },
  {
    key: 'facility',
    label: '機房設施',
    items: [
      { href: '/rack-diagram', label: '機房機櫃圖', icon: LayoutGrid },
    ],
  },
]

// ── 管理選單（分組） ──
const adminGroups: NavGroup[] = [
  {
    key: 'asset',
    label: '設備資產',
    items: [
      { href: '/admin/servers', label: '硬體管理', icon: HardDrive },
      { href: '/admin/vms', label: 'VM 管理', icon: Server },
      { href: '/admin/office-assets', label: '辦公室資產', icon: Monitor },
    ],
  },
  {
    key: 'network',
    label: '網路線路',
    items: [
      { href: '/admin/organizations', label: '單位管理', icon: Landmark },
      { href: '/admin/units', label: '網路管理', icon: Building2 },
      { href: '/admin/circuits', label: '線路管理', icon: Cable },
    ],
  },
  {
    key: 'ops',
    label: '維運設定',
    items: [
      { href: '/admin/maintenance', label: '保養類別管理', icon: Wrench },
      { href: '/admin/event-types', label: '事件類型管理', icon: Tag },
      { href: '/admin/vendors', label: '廠商管理', icon: Store },
    ],
  },
  {
    key: 'system',
    label: '系統',
    items: [
      { href: '/admin/users', label: '使用者管理', icon: Users },
    ],
  },
]

/* ─────────────────────────────────────────── */

interface SidebarProps {
  userRole?: 'admin' | 'user'
  userName?: string
  pinned: boolean
  onTogglePin: () => void
}

function CollapsibleGroup({
  group,
  pathname,
  section,
  expanded,
}: {
  group: NavGroup
  pathname: string
  section: 'nav' | 'admin'
  expanded: boolean
}) {
  const hasActive = group.items.some((item) => pathname.startsWith(item.href))

  const storageKey = `sidebar-${section}-${group.key}`
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(storageKey)
    if (saved !== null) return saved === '1'
    return true
  })

  useEffect(() => {
    if (hasActive && !open) setOpen(true)
  }, [hasActive]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(storageKey, open ? '1' : '0')
  }, [open, storageKey])

  // Collapsed mode: show items as icon-only list (no group header)
  if (!expanded) {
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all duration-150 ${
                active
                  ? 'bg-[var(--color-sidebar-active)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text)]'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
            </Link>
          )
        })}
      </div>
    )
  }

  // Expanded mode: normal collapsible group
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] text-[var(--color-text-dim)] uppercase tracking-[0.12em] font-semibold hover:text-[var(--color-text-muted)] transition-colors rounded-md hover:bg-[var(--color-sidebar-hover)]"
      >
        <span>{group.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-0.5 mt-0.5">
          {group.items.map((item) => {
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
                <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--color-primary)]' : ''}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ userRole = 'user', userName = '使用者', pinned, onTogglePin }: SidebarProps) {
  const pathname = usePathname()
  const [hovered, setHovered] = useState(false)

  const expanded = pinned || hovered

  return (
    <aside
      onMouseEnter={() => { if (!pinned) setHovered(true) }}
      onMouseLeave={() => { if (!pinned) setHovered(false) }}
      className={`
        bg-[var(--color-sidebar)] border-r border-[var(--color-border)]
        flex flex-col h-screen fixed left-0 top-0 z-40
        transition-all duration-250 ease-in-out
        ${expanded ? 'w-60' : 'w-16'}
        ${!pinned && hovered ? 'shadow-2xl shadow-black/40' : ''}
      `}
    >
      {/* Brand */}
      <div className="p-3 border-b border-[var(--color-border)]">
        {expanded ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center shrink-0">
                <Server className="w-4.5 h-4.5 text-[var(--color-primary)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-[var(--color-text)] tracking-wide truncate">MAC 系統</h1>
                <p className="text-[10px] text-[var(--color-text-dim)] tracking-wider">DATA CENTER MGMT</p>
              </div>
            </div>
            <button
              onClick={onTogglePin}
              title={pinned ? '取消固定選單' : '固定選單'}
              className="p-1.5 rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-sidebar-hover)] transition-colors"
            >
              {pinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center">
              <Server className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
          </div>
        )}
        {/* Status indicator */}
        {expanded && (
          <div className="flex items-center gap-1.5 mt-3 px-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-400 font-medium tracking-wider">SYSTEM ONLINE</span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {expanded && (
          <p className="text-[10px] text-[var(--color-text-dim)] px-3 py-2 uppercase tracking-[0.15em] font-semibold">功能</p>
        )}
        {!expanded && <div className="h-2" />}
        {navGroups.map((group) => (
          <CollapsibleGroup key={group.key} group={group} pathname={pathname} section="nav" expanded={expanded} />
        ))}

        {userRole === 'admin' && (
          <>
            {expanded ? (
              <p className="text-[10px] text-[var(--color-text-dim)] px-3 py-2 mt-3 uppercase tracking-[0.15em] font-semibold">管理</p>
            ) : (
              <div className="my-2 mx-3 border-t border-[var(--color-border)]" />
            )}
            {adminGroups.map((group) => (
              <CollapsibleGroup key={group.key} group={group} pathname={pathname} section="admin" expanded={expanded} />
            ))}
          </>
        )}
      </nav>

      <div className="p-2 border-t border-[var(--color-border)]">
        {expanded ? (
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[var(--color-primary)]">{userName[0]}</span>
              </div>
              <span className="text-sm text-[var(--color-text-muted)] truncate">{userName}</span>
            </div>
            <button className="text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[var(--color-primary)]">{userName[0]}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
