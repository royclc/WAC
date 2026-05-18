'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--color-overlay)]" onClick={onClose} />
      <div className={`relative bg-[var(--color-modal-bg)] rounded-xl shadow-2xl ${width} w-full mx-4 max-h-[90vh] flex flex-col border border-[var(--color-border)]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-hover)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
