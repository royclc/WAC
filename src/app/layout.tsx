import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MAC - 可用率與工作月曆系統',
  description: '設備可用率追蹤與工作月曆管理系統',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen">
        {children}
      </body>
    </html>
  )
}
