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

export async function streamChat(
  messages: ChatMessage[], opts: { maxTokens: number },
): Promise<ReadableStream<Uint8Array>> {
  return PROVIDER === 'anthropic' ? anthropicStream(messages, opts) : ollamaStream(messages, opts)
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

// ── Anthropic:messages.stream → 文本增量(system 从 messages 拆到顶层参数) ──
async function anthropicStream(messages: ChatMessage[], opts: { maxTokens: number }): Promise<ReadableStream<Uint8Array>> {
  const client = new Anthropic() // ANTHROPIC_API_KEY 从 env 解析
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const turns = messages.filter((m) => m.role !== 'system') as { role: 'user' | 'assistant'; content: string }[]
  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens,
    ...(system ? { system } : {}),
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
