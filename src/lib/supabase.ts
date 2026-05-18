import { createClient } from '@supabase/supabase-js'

// ── DB 連線設定 ──
// 支援 Supabase (雲端) 和 local PostgreSQL + PostgREST
//
// Supabase:
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
//
// Local PostgreSQL + PostgREST:
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001  (PostgREST endpoint)
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-jwt>
//
// 切換只需改 .env.local，程式碼不需變動

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[DB] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
