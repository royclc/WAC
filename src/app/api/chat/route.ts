import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat
 *
 * 前端聊天視窗 → 此 API → 轉發到 LLM (Langflow / OpenAI / 自訂) → 回傳結果
 *
 * Request body:
 *   { message: string, history?: { role: 'user'|'assistant', content: string }[] }
 *
 * Response:
 *   { reply: string, timestamp: string }
 *
 * 環境變數:
 *   LLM_TYPE       - langflow | openai | custom (預設 langflow)
 *   LLM_API_URL    - LLM 的 API endpoint (必填)
 *                    Langflow: http://localhost:7860/api/v1/run/{flow_id}
 *   LLM_API_KEY    - 選填，驗證用
 *   LLM_MODEL      - 選填，模型名稱
 *   LANGFLOW_TWEAKS - 選填，Langflow tweaks JSON 字串
 */

const LLM_TYPE = process.env.LLM_TYPE || 'langflow'
const LLM_API_URL = process.env.LLM_API_URL || ''
const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_MODEL = process.env.LLM_MODEL || ''
const LANGFLOW_TWEAKS = process.env.LANGFLOW_TWEAKS || '{}'

// ── 組合送給 LLM 的 payload ──
function buildPayload(message: string, history?: { role: string; content: string }[]) {
  switch (LLM_TYPE) {
    case 'langflow': {
      // Langflow API format
      // 將 history 組合成 session 概念，Langflow 用 input_value 接收
      const payload: Record<string, unknown> = {
        input_value: message,
        output_type: 'chat',
        input_type: 'chat',
      }
      try {
        const tweaks = JSON.parse(LANGFLOW_TWEAKS)
        if (Object.keys(tweaks).length > 0) {
          payload.tweaks = tweaks
        }
      } catch { /* ignore */ }
      // 若有 history，可透過 tweaks 傳入（視 Langflow flow 設計）
      if (history?.length) {
        payload.session_id = 'mac-chat'
      }
      return payload
    }

    case 'openai': {
      const messages = [...(history || []), { role: 'user', content: message }]
      const payload: Record<string, unknown> = { messages }
      if (LLM_MODEL) payload.model = LLM_MODEL
      return payload
    }

    default: {
      // custom: 直接送 messages 格式
      const messages = [...(history || []), { role: 'user', content: message }]
      const payload: Record<string, unknown> = { messages }
      if (LLM_MODEL) payload.model = LLM_MODEL
      return payload
    }
  }
}

// ── 解析 LLM 回傳 ──
function extractReply(data: Record<string, unknown>): string {
  try {
    switch (LLM_TYPE) {
      case 'langflow': {
        // Langflow response: outputs[0].outputs[0].results.message.text
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any
        // 嘗試多種 Langflow 回傳路徑
        const text =
          d?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
          d?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message ||
          d?.outputs?.[0]?.outputs?.[0]?.artifacts?.message ||
          d?.outputs?.[0]?.outputs?.[0]?.results?.text?.text ||
          d?.result?.output ||
          d?.result?.message ||
          d?.output ||
          d?.message
        return text || JSON.stringify(data)
      }

      case 'openai': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any
        return d?.choices?.[0]?.message?.content || JSON.stringify(data)
      }

      default: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any
        return (
          d?.choices?.[0]?.message?.content ||
          d?.message?.content ||
          d?.reply ||
          d?.content ||
          d?.output ||
          JSON.stringify(data)
        )
      }
    }
  } catch {
    return JSON.stringify(data)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, history } = body as {
      message: string
      history?: { role: string; content: string }[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: '訊息不可為空' }, { status: 400 })
    }

    // ── 若未設定 LLM_API_URL，回傳 echo 模式 ──
    if (!LLM_API_URL) {
      return NextResponse.json({
        reply: `[Echo] 收到：${message}\n\n⚠️ 尚未設定 LLM_API_URL，目前為測試模式。\n\n請在 .env.local 設定：\nLLM_TYPE=langflow\nLLM_API_URL=http://localhost:7860/api/v1/run/{flow_id}`,
        timestamp: new Date().toISOString(),
        mode: 'echo',
      })
    }

    // ── 組合 payload ──
    const payload = buildPayload(message, history)

    // ── 轉發到 LLM ──
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (LLM_API_KEY) {
      headers['Authorization'] = `Bearer ${LLM_API_KEY}`
    }
    // Langflow 也支援 x-api-key
    if (LLM_API_KEY && LLM_TYPE === 'langflow') {
      headers['x-api-key'] = LLM_API_KEY
    }

    const llmRes = await fetch(LLM_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000), // Langflow 可能較慢，120s
    })

    if (!llmRes.ok) {
      const errText = await llmRes.text().catch(() => 'unknown error')
      console.error('[chat] LLM error:', llmRes.status, errText)
      return NextResponse.json(
        { error: `LLM 回應錯誤 (${llmRes.status})`, detail: errText },
        { status: 502 }
      )
    }

    const llmData = await llmRes.json()
    const reply = extractReply(llmData)

    return NextResponse.json({
      reply,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[chat] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/chat
 * 健康檢查 / 取得設定狀態
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    llm_type: LLM_TYPE,
    llm_configured: !!LLM_API_URL,
    model: LLM_MODEL || null,
    timestamp: new Date().toISOString(),
  })
}
