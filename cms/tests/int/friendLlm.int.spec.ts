/**
 * 朋友模型服务传输层(2026-08-04 换 OpenAI 兼容端点 /v1/chat/completions)。
 * 测的是**换道后最容易悄悄回归的四件事**,全部用 stub fetch(不打网络,CI 不看朋友服务死活):
 *   ① 主通道走 /v1、真发 max_tokens/temperature、prompt 上**没有** [ref:] 指纹(上游缓存键已覆盖全文);
 *   ② 上游标准错误 → 我们的错误码(「各说各话」的地基);
 *   ③ upstream_error 才回退旧 /api/chat,且回退链上 [ref:] 指纹**必须还在**(那条链的缓存 bug 我们只抽样过一次);
 *   ④ webSearch 只走旧链(/v1 实测没有联网能力),以及超上限本地就拦(不浪费一趟网络)。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FRIEND_INPUT_MAX, FriendLlmError, friendChatOrThrow } from '@/lib/friendLlm'

type Call = { url: string; body: any; headers: Record<string, string> }

// 每个用例给一串「按调用顺序返回的响应」;顺便把请求录下来断言
function stubFetch(responses: Array<{ status: number; body: any; headers?: Record<string, string> }>) {
  const calls: Call[] = []
  let i = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), headers: init.headers })
    const r = responses[Math.min(i++, responses.length - 1)]
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json', ...(r.headers || {}) } })
  }))
  return calls
}

const V1_OK = { status: 200, body: { choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 1 } }, headers: { 'x-cache': 'MISS' } }
const LEGACY_OK = { status: 200, body: { answer: 'legacy hello', sources: [], cached: false } }
const errBody = (type: string, message = 'x') => ({ error: { type, message, param: null, code: type } })

afterEach(() => vi.unstubAllGlobals())

describe('friendLlm 主通道 = /v1/chat/completions', () => {
  it('打 /v1、max_tokens/temperature 真发出去、prompt 不再带 [ref:] 指纹、x-cache 透出', async () => {
    const calls = stubFetch([V1_OK])
    const r = await friendChatOrThrow({ prompt: 'hi', system: 'sys', maxTokens: 24, temperature: 0.1 })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toMatch(/\/v1\/chat\/completions$/)
    expect(calls[0].body.max_tokens).toBe(24)
    expect(calls[0].body.temperature).toBe(0.1)
    expect(calls[0].body.messages).toEqual([{ role: 'system', content: 'sys' }, { role: 'user', content: 'hi' }])
    expect(calls[0].body.messages[1].content).not.toContain('[ref:')   // 上游缓存键已哈希完整请求
    expect(calls[0].headers.Authorization).toMatch(/^Bearer /)
    expect(r).toMatchObject({ answer: 'hello', via: 'v1', xCache: 'MISS', cached: false })
  })

  it('max_tokens 封到上游上限 8192;x-cache: HIT → cached=true', async () => {
    const calls = stubFetch([{ ...V1_OK, headers: { 'x-cache': 'HIT' } }])
    const r = await friendChatOrThrow({ prompt: 'hi', maxTokens: 99_999 })
    expect(calls[0].body.max_tokens).toBe(8192)
    expect(r.cached).toBe(true)
    expect(r.xCache).toBe('HIT')
  })

  it('超 20000 字符本地就拦(报 tooLong 且一个请求都不发)', async () => {
    const calls = stubFetch([V1_OK])
    await expect(friendChatOrThrow({ prompt: 'x'.repeat(FRIEND_INPUT_MAX + 1) }))
      .rejects.toMatchObject({ code: 'tooLong' })
    expect(calls).toHaveLength(0)
  })
})

describe('friendLlm 错误码映射(各说各话的地基)', () => {
  const cases: Array<[string, number, string]> = [
    ['context_length_exceeded', 400, 'tooLong'],
    ['upstream_timeout', 504, 'timeout'],
    ['invalid_api_key', 401, 'authKey'],
    ['invalid_request_error', 400, 'badRequest'],
  ]
  for (const [type, status, code] of cases) {
    it(`${type} → ${code},且**不回退**(旧链只会换个说法再失败一次)`, async () => {
      const calls = stubFetch([{ status, body: errBody(type) }])
      const e = await friendChatOrThrow({ prompt: 'hi' }).catch((x) => x)
      expect(e).toBeInstanceOf(FriendLlmError)
      expect(e.code).toBe(code)
      expect(calls).toHaveLength(1)
    })
  }

  it('200 但内容为空 → empty(别把空串当成功答案往下游灌)', async () => {
    stubFetch([{ status: 200, body: { choices: [{ message: { content: '   ' } }] } }])
    await expect(friendChatOrThrow({ prompt: 'hi' })).rejects.toMatchObject({ code: 'empty' })
  })
})

describe('friendLlm 回退旧 /api/chat', () => {
  it('upstream_error → 退回旧链,且旧链 prompt 上 [ref:] 指纹还在', async () => {
    const calls = stubFetch([{ status: 502, body: errBody('upstream_error') }, LEGACY_OK])
    const r = await friendChatOrThrow({ prompt: 'hi', system: 'sys' })

    expect(calls.map((c) => new URL(c.url).pathname)).toEqual(['/v1/chat/completions', '/api/chat'])
    expect(calls[1].body.prompt).toMatch(/^\[ref:[a-z]{14}\]\n/)
    expect(calls[1].body.system).toBe('sys')
    expect(r).toMatchObject({ answer: 'legacy hello', via: 'legacy', xCache: null })
  })

  it('回退也挂 → 抛旧链那次的错(不吞)', async () => {
    stubFetch([{ status: 502, body: errBody('upstream_error') }, { status: 502, body: errBody('upstream_error') }])
    await expect(friendChatOrThrow({ prompt: 'hi' })).rejects.toMatchObject({ code: 'upstream' })
  })

  it('webSearch 直走旧链(/v1 没有联网能力),sources 收得回来', async () => {
    const calls = stubFetch([{ status: 200, body: { answer: 'a', sources: [{ url: 'https://x.ca' }], cached: true } }])
    const r = await friendChatOrThrow({ prompt: 'hi', webSearch: true, searchQuery: 'q' })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toMatch(/\/api\/chat$/)
    expect(calls[0].body.web_search).toBe(true)
    expect(r).toMatchObject({ sources: ['https://x.ca'], cached: true, via: 'legacy' })
  })
})

/**
 * 停摆看门狗(stallMs,2026-08-09)。补的是一个**结构性**的口子:原来的 timeoutMs 在响应头到手那一刻
 * 就 clearTimeout 了,SSE body 读多久都没人管 —— 上游把头发回来再卡住,我们能一直读到天荒地老。
 * 这几条全部用 stub fetch + 毫秒级阈值,不打网络、不睡秒。
 */
describe('friendLlm 停摆看门狗', () => {
  const enc = new TextEncoder()
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const sse = (t: string) => enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`)

  /** 响应头永远不来(冷启动卡在连接那头):只有 abort 能结束它 */
  function stubHang() {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn((url: string, init: any) => new Promise((_ok, rej) => {
      calls.push(String(url))
      init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
    })))
    return calls
  }

  /** 头秒回,body 按 script 逐块吐;close=false → 吐完就装死(还连着,但一个字都不来) */
  function stubStream(script: Array<{ text: string; delay: number }>, close: boolean) {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      const signal: AbortSignal = init.signal
      let ctl!: ReadableStreamDefaultController<Uint8Array>
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          ctl = c
          void (async () => {
            for (const s of script) {
              await sleep(s.delay)
              if (signal.aborted) return
              c.enqueue(sse(s.text))
            }
            if (close) c.close()
          })()
        },
      })
      signal.addEventListener('abort', () => { try { ctl.error(new DOMException('aborted', 'AbortError')) } catch { /* 已经关了 */ } })
      return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream', 'x-cache': 'MISS' } })
    }))
  }

  it('响应头一直不来 → stallMs 到点报 timeout,且**不回退旧链**(旧链只会再卡一次)', async () => {
    const calls = stubHang()
    const e = await friendChatOrThrow({ prompt: 'hi', stallMs: 60, timeoutMs: 5_000, onDelta: () => {} }).catch((x) => x)
    expect(e).toBeInstanceOf(FriendLlmError)
    expect(e.code).toBe('timeout')
    expect(e.message).toMatch(/stalled 60ms/)
    expect(calls).toHaveLength(1)
  })

  it('🔴 流吐了两块然后装死 → 也报 timeout(旧代码在这儿是永久挂住:112s 那次的口子)', async () => {
    stubStream([{ text: '安省', delay: 5 }, { text: '目前', delay: 5 }], false)
    const got: string[] = []
    const e = await friendChatOrThrow({ prompt: 'hi', stallMs: 80, timeoutMs: 5_000, onDelta: (c) => got.push(c) }).catch((x) => x)
    expect(e).toBeInstanceOf(FriendLlmError)
    expect(e.code).toBe('timeout')
    expect(e.message).toMatch(/^stream stalled 80ms after 4ch/)   // 已经吐出来的字数留在错误里,便于对账
    expect(got).toEqual(['安省', '目前'])                          // 停摆之前流出去的照旧算数
  })

  it('慢但一直在吐字的流不误杀:块间隔 30ms、stallMs 80 → 正常收全', async () => {
    stubStream([{ text: 'a', delay: 30 }, { text: 'b', delay: 30 }, { text: 'c', delay: 30 }], true)
    const r = await friendChatOrThrow({ prompt: 'hi', stallMs: 80, timeoutMs: 5_000, onDelta: () => {} })
    expect(r.answer).toBe('abc')
  })

  it('不传 stallMs = 一字不改的老行为:120ms 才吐第一块也照收(看门狗根本没装)', async () => {
    stubStream([{ text: 'slow', delay: 120 }], true)
    const r = await friendChatOrThrow({ prompt: 'hi', timeoutMs: 5_000, onDelta: () => {} })
    expect(r.answer).toBe('slow')
  })

  it('硬上限仍然管到 body 读完:timeoutMs 到点掐断装死的流', async () => {
    stubStream([{ text: 'x', delay: 5 }], false)
    const e = await friendChatOrThrow({ prompt: 'hi', timeoutMs: 60, onDelta: () => {} }).catch((x) => x)
    expect(e.code).toBe('timeout')
    expect(e.message).toMatch(/aborted after 60ms/)
  })
})
