import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/chat
 *
 * 前端聊天視窗 → 此 API → 轉發到 LLM → 回傳結果
 *
 * Request body:
 *   { message: string, history?: { role: 'user'|'assistant', content: string }[] }
 *
 * Response:
 *   { reply: string, timestamp: string }
 *
 * 環境變數:
 *   LLM_API_URL    - LLM 的 API endpoint (必填)
 *   LLM_API_KEY    - 選填，驗證用
 *   LLM_MODEL      - 選填，模型名稱
 */

const LLM_API_URL = process.env.LLM_API_URL || ''
const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_MODEL = process.env.LLM_MODEL || ''

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

    // ── 若未設定 LLM_API_URL，回傳 echo 模式（方便測試） ──
    if (!LLM_API_URL) {
      return NextResponse.json({
        reply: `[Echo] 收到：${message}\n\n⚠️ 尚未設定 LLM_API_URL，目前為測試模式。`,
        timestamp: new Date().toISOString(),
        mode: 'echo',
      })
    }

    // ── 組合 messages ──
    const messages = [
      ...(history || []),
      { role: 'user', content: message },
    ]

    // ── 轉發到 LLM ──
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (LLM_API_KEY) {
      headers['Authorization'] = `Bearer ${LLM_API_KEY}`
    }

    const llmPayload: Record<string, unknown> = { messages }
    if (LLM_MODEL) llmPayload.model = LLM_MODEL

    const llmRes = await fetch(LLM_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(llmPayload),
      signal: AbortSignal.timeout(60000), // 60s timeout
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

    // ── 嘗試從常見格式取得回覆 ──
    const reply =
      // OpenAI 格式
      llmData?.choices?.[0]?.message?.content ||
      // Ollama 格式
      llmData?.message?.content ||
      // 直接 reply 欄位
      llmData?.reply ||
      // 直接 content 欄位
      llmData?.content ||
      // fallback: 整個 response
      JSON.stringify(llmData)

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
    llm_configured: !!LLM_API_URL,
    model: LLM_MODEL || null,
    timestamp: new Date().toISOString(),
  })
}
