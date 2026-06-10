'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
  userRole?: 'admin' | 'user'
  userName?: string
}

const STORAGE_KEY = 'sidebar-pinned'

export default function AppShell({ children, userRole = 'admin', userName = '管理員' }: AppShellProps) {
  const [pinned, setPinned] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved !== null ? saved === '1' : true // default pinned
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, pinned ? '1' : '0')
  }, [pinned])

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userRole={userRole}
        userName={userName}
        pinned={pinned}
        onTogglePin={() => setPinned(!pinned)}
      />
      <main
        className={`flex-1 p-6 transition-[margin-left] duration-250 ease-in-out ${
          pinned ? 'ml-60' : 'ml-16'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
