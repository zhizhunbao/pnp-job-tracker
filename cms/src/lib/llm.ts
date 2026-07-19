// LLM provider 抽象(E2-03):advisor 的唯一模型出口,prompt 组装/缓存/限流都留在调用方。
// 两个后端,统一输出「纯文本增量」的字节流:
//   ollama(默认)  = 本地 dev,家里模型(OLLAMA_URL/OLLAMA_MODEL)
//   anthropic     = 线上,Claude Haiku 4.5(ANTHROPIC_API_KEY;单次 1-2k in + ≤500 out ≈ $0.004)
import Anthropic from '@anthropic-ai/sdk'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const PROVIDER = process.env.LLM_PROVIDER || 'ollama'
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'

export class LlmError extends Error {
  constructor(msg: string) { super(msg); this.name = 'LlmError' }
}

// fetchUrl(E6-03):给 anthropic 后端声明服务端 web_fetch 工具,让模型现场抓该 URL(公司官网)做 grounding。
// 只在 anthropic 生效(ollama 无此能力,忽略);域名白名单锁定到该 URL 自己的 host,输入侧 max_content_tokens 封顶。
export async function streamChat(
  messages: ChatMessage[], opts: { maxTokens: number; fetchUrl?: string },
): Promise<ReadableStream<Uint8Array>> {
  return PROVIDER === 'anthropic' ? anthropicStream(messages, opts) : ollamaStream(messages, opts)
}

// ── 非流式整段补全(E11-07 简历解析用:一次调用抽结构化 JSON,不需要流)──
export async function completeText(messages: ChatMessage[], opts: { maxTokens: number }): Promise<string> {
  if (PROVIDER === 'anthropic') {
    const client = new Anthropic() // ANTHROPIC_API_KEY 从 env 解析
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const turns = messages.filter((m) => m.role !== 'system') as { role: 'user' | 'assistant'; content: string }[]
    const res = await client.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: opts.maxTokens,
      ...(system ? { system } : {}), messages: turns,
    }).catch((e) => { throw new LlmError(`云模型错误:${e instanceof Error ? e.message : e}`) })
    if (res.stop_reason === 'refusal') throw new LlmError('模型拒绝了本次请求')
    return res.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  }
  let r: Response
  try {
    r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, think: false, stream: false, messages, options: { temperature: 0.2, num_predict: opts.maxTokens } }),
    })
  } catch { throw new LlmError('无法连接本地大模型(Ollama),请确认服务在线。') }
  if (!r.ok) throw new LlmError(`大模型返回错误(${r.status})。`)
  return (await r.json())?.message?.content ?? ''
}

// ── Ollama:NDJSON /api/chat → 文本增量 ──
async function ollamaStream(messages: ChatMessage[], opts: { maxTokens: number }): Promise<ReadableStream<Uint8Array>> {
  let upstream: Response
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL, think: false, stream: true, messages,
        options: { temperature: 0.4, num_predict: opts.maxTokens },
      }),
    })
  } catch {
    throw new LlmError('无法连接本地大模型(Ollama),请确认服务在线。')
  }
  if (!upstream.ok || !upstream.body) throw new LlmError(`大模型返回错误(${upstream.status})。`)

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buf = ''
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) { controller.close(); return }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const delta = JSON.parse(line)?.message?.content || ''
          if (delta) controller.enqueue(encoder.encode(delta))
        } catch { /* 跳过不完整行 */ }
      }
    },
    cancel() { reader.cancel().catch(() => {}) },
  })
}

// 官网 URL → web_fetch 工具声明(冒烟实测 2026-07-05:haiku-4-5 + web_fetch_20250910 无需 beta 头)。
// 非法 URL/非 http(s) → 不声明工具(行为同无 URL);max_uses=1 防多轮抓取,4K tokens 封住输入侧成本。
function webFetchTool(fetchUrl?: string): { tools?: any[] } {
  if (!fetchUrl) return {}
  try {
    const u = new URL(fetchUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return {}
    return { tools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 1, allowed_domains: [u.hostname], max_content_tokens: 4000 }] }
  } catch { return {} }
}

// ── Anthropic:messages.stream → 文本增量(system 从 messages 拆到顶层参数) ──
async function anthropicStream(messages: ChatMessage[], opts: { maxTokens: number; fetchUrl?: string }): Promise<ReadableStream<Uint8Array>> {
  const client = new Anthropic() // ANTHROPIC_API_KEY 从 env 解析
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const turns = messages.filter((m) => m.role !== 'system') as { role: 'user' | 'assistant'; content: string }[]
  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens,
    ...(system ? { system } : {}),
    ...webFetchTool(opts.fetchUrl),
    messages: turns,
  })
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      stream.on('text', (t) => controller.enqueue(encoder.encode(t)))
      stream.on('end', () => controller.close())
      stream.on('error', (e) => controller.error(new LlmError(`云模型错误:${e instanceof Error ? e.message : e}`)))
    },
    cancel() { stream.abort() },
  })
}
