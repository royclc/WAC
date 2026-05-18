'use client'

/*
 * 需要在 Supabase 建立以下 RPC function：
 *
 * CREATE OR REPLACE FUNCTION verify_password(user_email TEXT, user_password TEXT)
 * RETURNS TABLE(id UUID, name TEXT, email TEXT, role TEXT) AS $$
 * BEGIN
 *   RETURN QUERY
 *   SELECT u.id, u.name, u.email, u.role
 *   FROM users u
 *   WHERE u.email = user_email
 *     AND u.password_hash = crypt(user_password, u.password_hash)
 *     AND u.is_active = true;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Server, Activity, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('請輸入帳號和密碼')
      setLoading(false)
      return
    }

    try {
      // 透過 Supabase RPC 驗證密碼（使用 pgcrypto crypt）
      const { data, error: rpcError } = await supabase.rpc('verify_password', {
        user_email: email,
        user_password: password,
      })

      if (rpcError) {
        console.error('[Login] RPC error:', rpcError)
        setError('登入失敗，請稍後再試')
        setLoading(false)
        return
      }

      const users = data as UserInfo[] | null
      if (!users || users.length === 0) {
        setError('帳號或密碼錯誤')
        setLoading(false)
        return
      }

      const user = users[0]
      localStorage.setItem('user', JSON.stringify(user))
      router.push('/calendar')
    } catch (err) {
      console.error('[Login] unexpected error:', err)
      setError('登入時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--color-primary)] opacity-[0.06] rounded-full blur-[120px]" />

      <div className="relative bg-[var(--color-card)] rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-[var(--color-border)]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-dim)] flex items-center justify-center mx-auto mb-4 border border-[var(--color-primary)]/20">
            <Server className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">MAC 系統</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">可用率與工作月曆管理</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-[var(--color-text-dim)] tracking-wider">
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> MONITORING</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> SECURE</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--color-text-muted)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--color-text-muted)]">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  )
}
