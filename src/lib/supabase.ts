import { createClient } from '@supabase/supabase-js'

// ── DB 連線設定 ──
// 支援 Supabase (雲端) 和 local PostgreSQL + PostgREST
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[DB] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// ── 終極修正版：在建立 Client 時，強迫它在打本地自建 API 時認得 api 這個 Schema ──
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    // 如果連線網址包含 'local'，代表是在 K8s 本地端，我們強制切換到 'api' schema
    // 如果是雲端 Supabase (.supabase.co)，就自動回退用預設的 'public'
    schema: supabaseUrl.includes('local') || supabaseUrl.includes('localhost') ? 'api' : 'public'
  }
})