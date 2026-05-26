import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/data/query
 *
 * 給 Langflow 呼叫的資料查詢 webhook
 * 可查詢 PostgreSQL（透過 Supabase / PostgREST）中的任意資料表
 *
 * ── Request body ──
 * {
 *   "table": "hardware_assets",           // 必填：資料表名稱
 *   "select": "name, ip_address, vendor", // 選填：欄位（預設 *）
 *   "filters": [                          // 選填：篩選條件
 *     { "column": "is_active", "op": "eq", "value": true },
 *     { "column": "category_key", "op": "eq", "value": "server" }
 *   ],
 *   "order": { "column": "created_at", "ascending": false },  // 選填
 *   "limit": 50,    // 選填，預設 100，最大 500
 *   "offset": 0     // 選填
 * }
 *
 * ── Response ──
 * { "data": [...], "count": 42, "table": "hardware_assets" }
 *
 * ── 驗證 ──
 * 環境變數 DATA_WEBHOOK_SECRET（選填）
 * Header: Authorization: Bearer {secret}
 *
 * ── 允許的資料表 ──
 * 以白名單控制，防止查詢敏感資料
 */

const DATA_WEBHOOK_SECRET = process.env.DATA_WEBHOOK_SECRET || ''

// ── 白名單：允許查詢的資料表 ──
const ALLOWED_TABLES = new Set([
  'hardware_assets',
  'hardware_categories',
  'hardware_models',
  'vendors',
  'circuits',
  'organizations',
  'org_devices',
  'org_circuits',
  'maintenance_categories',
  'maintenance_events',
  'work_events',
  'leave_records',
  'downtime_events',
  'circuit_events',
  'event_types',
  'vm_instances',
  'service_changes',
])

// ── 支援的 filter 運算子 ──
type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is'
const ALLOWED_OPS = new Set<FilterOp>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'])

interface QueryFilter {
  column: string
  op: FilterOp
  value: unknown
}

interface QueryOrder {
  column: string
  ascending?: boolean
}

interface QueryBody {
  table: string
  select?: string
  filters?: QueryFilter[]
  order?: QueryOrder
  limit?: number
  offset?: number
}

// 建立 server-side supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
  	db: {
  	  schema: 'api'
  	}
  })
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    // ── 驗證 ──
    if (DATA_WEBHOOK_SECRET) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace('Bearer ', '')
      if (token !== DATA_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = (await req.json()) as QueryBody
    const { table, select, filters, order, limit, offset } = body

    // ── 驗證 table ──
    if (!table) {
      return NextResponse.json({ error: '缺少 table 參數' }, { status: 400 })
    }
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json(
        { error: `不允許查詢 ${table}，可用：${[...ALLOWED_TABLES].join(', ')}` },
        { status: 403 }
      )
    }

    // ── 建立查詢 ──
    const supabase = getSupabase()
    let query = supabase.from(table).select(select || '*', { count: 'exact' })

    // ── 套用篩選 ──
    if (filters?.length) {
      for (const f of filters) {
        if (!f.column || !f.op || !ALLOWED_OPS.has(f.op)) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = (query as any)[f.op](f.column, f.value)
      }
    }

    // ── 排序 ──
    if (order?.column) {
      query = query.order(order.column, { ascending: order.ascending ?? false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // ── 分頁 ──
    const queryLimit = Math.min(Math.max(limit || 100, 1), 500)
    const queryOffset = Math.max(offset || 0, 0)
    query = query.range(queryOffset, queryOffset + queryLimit - 1)

    // ── 執行 ──
    const { data, count, error } = await query

    if (error) {
      console.error('[data/query] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      table,
      returned: data?.length || 0,
    })
  } catch (err) {
    console.error('[data/query] Error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/data/query
 * 回傳可查詢的資料表清單與使用說明
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'MAC 系統資料查詢 API，供 Langflow 或外部系統使用',
    allowed_tables: [...ALLOWED_TABLES],
    usage: {
      method: 'POST',
      body: {
        table: '(必填) 資料表名稱',
        select: '(選填) 欄位，預設 *',
        filters: '(選填) [{ column, op, value }]，op: eq/neq/gt/gte/lt/lte/like/ilike/in/is',
        order: '(選填) { column, ascending }',
        limit: '(選填) 筆數上限，預設 100，最大 500',
        offset: '(選填) 跳過筆數',
      },
      examples: [
        {
          description: '查詢所有啟用中的伺服器',
          body: { table: 'hardware_assets', filters: [{ column: 'is_active', op: 'eq', value: true }, { column: 'category_key', op: 'eq', value: 'server' }] },
        },
        {
          description: '查詢本月停機事件',
          body: { table: 'downtime_events', filters: [{ column: 'start_time', op: 'gte', value: '2026-05-01' }], order: { column: 'start_time', ascending: true } },
        },
        {
          description: '查詢所有 VM',
          body: { table: 'vm_instances', select: 'hostname, ip_address, os_name, ram_gb, cpu_cores, is_owner_vm' },
        },
        {
          description: '查詢業主 VM',
          body: { table: 'vm_instances', filters: [{ column: 'is_owner_vm', op: 'eq', value: true }] },
        },
      ],
    },
  })
}
