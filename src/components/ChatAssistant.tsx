'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 自動捲到底
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  // 開啟時 focus input
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // ── Webhook polling（取得 LLM 主動推送的訊息） ──
  const lastPollRef = useRef('')
  const pollWebhook = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sessionId: 'default' })
      if (lastPollRef.current) params.set('after', lastPollRef.current)
      const res = await fetch(`/api/chat/webhook?${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.messages?.length) {
        const newMsgs: ChatMessage[] = data.messages.map(
          (m: { id: string; message: string; timestamp: string }) => ({
            id: m.id,
            role: 'assistant' as const,
            content: m.message,
            timestamp: m.timestamp,
          })
        )
        setMessages((prev) => [...prev, ...newMsgs])
        lastPollRef.current =
          data.messages[data.messages.length - 1].timestamp
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = setInterval(pollWebhook, 5000)
    return () => clearInterval(timer)
  }, [open, pollWebhook])

  // ── 送出訊息 ──
  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // 組合 history（最近 20 條）
      const history = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || data.error || '無回應',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `連線錯誤：${err instanceof Error ? err.message : '未知錯誤'}`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── 浮動按鈕 ── */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          boxShadow: open
            ? '0 0 0 3px rgba(6,182,212,0.3), 0 4px 20px rgba(0,0,0,0.4)'
            : '0 4px 20px rgba(0,0,0,0.4)',
        }}
        title="小精靈助手"
      >
        {open ? (
          // X icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Chat icon
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
            <circle cx="8" cy="10" r="1" />
            <circle cx="12" cy="10" r="1" />
            <circle cx="16" cy="10" r="1" />
          </svg>
        )}
      </button>

      {/* ── 聊天視窗 ── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: 380,
            height: 520,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.2)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-primary)">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                MAC 小精靈
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                系統助手
              </div>
            </div>
            <button
              onClick={() => setMessages([])}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ color: 'var(--color-text-dim)', background: 'var(--color-hover)' }}
              title="清除對話"
            >
              清除
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ background: 'var(--color-bg)' }}
          >
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🤖</div>
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  你好！我是 MAC 小精靈
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>
                  有任何問題都可以問我
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'var(--color-primary)',
                          color: '#fff',
                          borderBottomRightRadius: 4,
                        }
                      : {
                          background: 'var(--color-card)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          borderBottomLeftRadius: 4,
                        }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            className="shrink-0 px-3 py-3 flex gap-2"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) send()
              }}
              placeholder="輸入訊息..."
              className="flex-1 px-3 py-2 text-sm rounded-lg"
              style={{
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-input-border)',
                color: 'var(--color-text)',
              }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: loading || !input.trim() ? 'var(--color-border)' : 'var(--color-primary)',
                color: loading || !input.trim() ? 'var(--color-text-dim)' : '#fff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              送出
            </button>
          </div>
        </div>
      )}
    </>
  )
}
