// 朋友的模型服务(ngrok FastAPI → qwen3.6)通用调用:JD 整理(J2)与公司调查(K)共用。
// env 复用 news 懒翻译同款 TRANSLATE_API_BASE / TRANSLATE_API_KEY;未配置 → null(调用方降级)。
// /api/chat:{prompt, system?, web_search?, search_query?} → {answer, sources?: [{url,...}], web_search_used}
// 红线:这里只管传输;内容校验(不得新增数字/URL 等)在各调用方做。

const BASE = (process.env.TRANSLATE_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.TRANSLATE_API_KEY || ''

export const friendLlmReady = () => Boolean(BASE && KEY)

export async function friendChat(opts: {
  prompt: string
  system?: string
  webSearch?: boolean
  searchQuery?: string
  timeoutMs?: number
}): Promise<{ answer: string; sources: string[] } | null> {
  if (!friendLlmReady()) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60_000)
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
      body: JSON.stringify({
        prompt: opts.prompt,
        ...(opts.system ? { system: opts.system } : {}),
        ...(opts.webSearch ? { web_search: true } : {}),
        ...(opts.searchQuery ? { search_query: opts.searchQuery } : {}),
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const d = await res.json().catch(() => null)
    const answer = String(d?.answer ?? '').trim()
    if (!answer) return null
    const sources = Array.isArray(d?.sources)
      ? d.sources.map((s: any) => String(s?.url || s || '')).filter(Boolean).slice(0, 6)
      : []
    return { answer, sources }
  } catch {
    return null   // 超时/掉线一律 null,调用方静默降级(设计红线:不报错不重试轰炸)
  } finally {
    clearTimeout(timer)
  }
}
