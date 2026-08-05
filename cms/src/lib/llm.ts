// LLM provider 抽象(E2-03):advisor 的唯一模型出口,prompt 组装/缓存/限流都留在调用方。
// 三个后端,统一输出「纯文本增量」的字节流:
//   ollama(默认)  = 本地 dev,家里模型(OLLAMA_URL/OLLAMA_MODEL)
//   anthropic     = Claude Haiku 4.5(ANTHROPIC_API_KEY;单次 1-2k in + ≤500 out ≈ $0.004)
//   friend        = 朋友公网 API(ngrok→qwen3.6,friendLlm 传输层;2026-07-19 Frank 拍板初判切本地生态,
//                   #102 自动生成后 Haiku 调用量翻倍→账单归零;Render 置 LLM_PROVIDER=friend 即切,回退=删该 env)
import Anthropic from '@anthropic-ai/sdk'
import { friendChat, friendChatOrThrow, FriendLlmError, type FriendErrCode } from './friendLlm'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const PROVIDER = process.env.LLM_PROVIDER || 'ollama'
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'

// code 透到路由层:让「各说各话」成立(项目踩过「什么都报稍后再试」的坑)。
// 不带 code 的老抛点 = undefined,路由按兜底处理,零改动。
export class LlmError extends Error {
  constructor(msg: string, public code?: FriendErrCode) { super(msg); this.name = 'LlmError' }
}

// friend 后端的错误码 → 给用户看的话术(路由再决定 HTTP 状态/错误字段,见 api/resume-match)
const FRIEND_MSG: Record<FriendErrCode, string> = {
  offline: '无法连接本地模型服务,请稍后再试。',
  tooLong: '输入太长,超过模型服务的单次上限。',
  timeout: '模型服务响应超时,请稍后再试。',
  upstream: '模型服务暂时不可用,请稍后再试。',
  authKey: '模型服务鉴权失败(API key 无效)。',
  badRequest: '模型服务拒绝了本次请求(请求格式不对)。',
  empty: '模型没有返回内容,请稍后再试。',
}
function toLlmError(e: unknown): LlmError {
  if (e instanceof FriendLlmError) return new LlmError(FRIEND_MSG[e.code], e.code)
  return new LlmError('无法连接本地模型服务,请稍后再试。')
}

// fetchUrl(E6-03):给 anthropic 后端声明服务端 web_fetch 工具,让模型现场抓该 URL(公司官网)做 grounding。
// 只在 anthropic 生效(ollama 无此能力,忽略);域名白名单锁定到该 URL 自己的 host,输入侧 max_content_tokens 封顶。
export async function streamChat(
  messages: ChatMessage[], opts: { maxTokens: number; fetchUrl?: string },
): Promise<ReadableStream<Uint8Array>> {
  if (PROVIDER === 'friend') return friendStream(messages, opts)
  return PROVIDER === 'anthropic' ? anthropicStream(messages, opts) : ollamaStream(messages, opts)
}

// ── friend:非流式后端——整段答案包成单 chunk 流,advisor 路由/前端打字机零改动;fetchUrl grounding 忽略(同 ollama)──
function friendMsgSplit(messages: ChatMessage[]) {
  return {
    system: messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n') || undefined,
    prompt: messages.filter((m) => m.role !== 'system').map((m) => m.content).join('\n\n'),
  }
}
async function friendStream(messages: ChatMessage[], opts: { maxTokens: number }): Promise<ReadableStream<Uint8Array>> {
  const { system, prompt } = friendMsgSplit(messages)
  // maxTokens 现在真生效(2026-08-04 换 /v1 端点,实测 finish_reason=length);temperature 沿用对话侧的 0.4
  const r = await friendChat({ prompt, system, timeoutMs: 90_000, maxTokens: opts.maxTokens, temperature: 0.4 })
  if (!r) throw new LlmError('无法连接本地模型服务,请稍后再试。')
  return new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(r.answer)); c.close() } })
}

// ── 非流式整段补全(E11-07 简历解析用:一次调用抽结构化 JSON,不需要流)──
// opts.provider = 按调用点定向通道(2026-08-03 Frank「简历对照不用 Haiku 用朋友的大模型」:
// resume-match 传 'friend';不传照旧走全局 LLM_PROVIDER,其他调用点零影响)
// opts.onMeta = 把后端的元信息回传给调用方打日志——上游缓存串答类事故只能靠它发现,不透出来下次
// 还得靠人肉撞见(2026-08-04 事故)。**xCache 是上游 `x-cache: HIT|MISS` 响应头的原值**(换 /v1 端点后
// 直接读头,不再靠我们自己推断);via 记这次走的是新端点还是回退到了旧 /api/chat。
// opts.temperature = 要确定性的调用点(抽 JSON、对照打分)显式压低;不传走上游默认 0.4。
// opts.onDelta = 流式增量(**只 friend 通道**;传了就让 friendLlm 发 stream:true)。返回值照旧是整段答案 ——
// 对话侧拿它测首字延迟,**不往前端发**:出口五道校验是整段跑的,流答案 = 用户可能读到随后被撤回的数字。
export async function completeText(messages: ChatMessage[], opts: {
  maxTokens: number
  provider?: 'friend' | 'anthropic' | 'ollama'
  temperature?: number
  onMeta?: (m: { cached: boolean; via: 'v1' | 'legacy'; xCache: string | null }) => void
  onDelta?: (chunk: string) => void
}): Promise<string> {
  const prov = opts.provider || PROVIDER
  if (prov === 'friend') {
    const { system, prompt } = friendMsgSplit(messages)
    // maxTokens 现在真发出去(旧结论「上游不收长度参数」已随 /v1 端点作废,见 friendLlm 文件头)
    const r = await friendChatOrThrow({
      prompt, system, timeoutMs: 90_000, maxTokens: opts.maxTokens, temperature: opts.temperature,
      ...(opts.onDelta ? { onDelta: opts.onDelta } : {}),
    }).catch((e) => { throw toLlmError(e) })
    opts.onMeta?.({ cached: r.cached, via: r.via, xCache: r.xCache })
    return r.answer
  }
  if (prov === 'anthropic') {
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
