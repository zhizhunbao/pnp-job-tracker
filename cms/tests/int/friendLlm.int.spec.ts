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
