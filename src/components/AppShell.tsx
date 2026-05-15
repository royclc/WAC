'use client'

import Sidebar from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
  userRole?: 'admin' | 'user'
  userName?: string
}

export default function AppShell({ children, userRole = 'admin', userName = '管理員' }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={userRole} userName={userName} />
      <main className="flex-1 ml-60 p-6">{children}</main>
    </div>
  )
}
