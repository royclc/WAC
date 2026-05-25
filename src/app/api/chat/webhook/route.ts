import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat/webhook
 *
 * 給 LLM 主動推送訊息的 webhook endpoint
 * LLM 可以透過此 API 向前端送出訊息（透過 SSE / polling 取得）
 *
 * Request body:
 *   { message: string, sessionId?: string, type?: string }
 *
 * Response:
 *   { status: 'ok', id: string }
 *
 * 驗證: 使用 CHAT_WEBHOOK_SECRET 環境變數（選填）
 */

const WEBHOOK_SECRET = process.env.CHAT_WEBHOOK_SECRET || ''

// ── In-memory message queue（生產環境建議改用 Redis / DB） ──
interface QueuedMessage {
  id: string
  message: string
  sessionId: string
  type: string
  timestamp: string
}

const messageQueue: QueuedMessage[] = []
const MAX_QUEUE_SIZE = 200

export async function POST(req: NextRequest) {
  try {
    // ── 驗證 webhook secret ──
    if (WEBHOOK_SECRET) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace('Bearer ', '')
      if (token !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    const { message, sessionId, type } = body as {
      message: string
      sessionId?: string
      type?: string
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: '訊息不可為空' }, { status: 400 })
    }

    const entry: QueuedMessage = {
      id: crypto.randomUUID(),
      message,
      sessionId: sessionId || 'default',
      type: type || 'info',
      timestamp: new Date().toISOString(),
    }

    messageQueue.push(entry)

    // 限制 queue 大小
    while (messageQueue.length > MAX_QUEUE_SIZE) {
      messageQueue.shift()
    }

    return NextResponse.json({ status: 'ok', id: entry.id })
  } catch (err) {
    console.error('[webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET /api/chat/webhook?sessionId=xxx&after=timestamp
 *
 * 前端 polling 取得 LLM 推送的訊息
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId') || 'default'
  const after = searchParams.get('after') || ''

  const filtered = messageQueue.filter(
    (m) =>
      m.sessionId === sessionId &&
      (!after || m.timestamp > after)
  )

  return NextResponse.json({ messages: filtered })
}
