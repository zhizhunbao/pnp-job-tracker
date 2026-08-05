/**
 * 对话留痕(docs/design/对话Case-Harness方案-20260805.md §1.1)。
 *
 * 被测的是真实 logChat/threadId/turnOf;只有 payload 是假的(录下 collection 与 data)。
 * 盯死两条铁律:① 写库失败绝不影响回答(不 throw、不返回待 await 的 Promise);
 * ② 不写任何能指向人的字段 —— data 的键里不许出现 ip / user / email / session。
 */
import { describe, expect, it, vi } from 'vitest'

import { logChat, threadId, turnOf } from '@/lib/chatLog'
import type { ChatResult, ChatTurn } from '@/lib/chatOrchestrate'

const flush = () => new Promise((r) => setImmediate(r))

class FakePayload {
  calls: { collection: string; data: any }[] = []
  fail = false
  create(args: { collection: string; data: any }) {
    this.calls.push(args)
    return this.fail ? Promise.reject(new Error('relation "chat_logs" does not exist')) : Promise.resolve({ id: 1 })
  }
}

const RESULT: ChatResult = {
  answer: '曼省在招 3 个岗位。',
  slots: { noc: '72310', occText: 'carpenter', provs: ['MB'], expMonths: 0, status: null, claims: [] },
  facts: [
    { tool: 'lookupJobs', label: 'MB 岗位', value: 3, valueText: '', unit: 'jobs', evidence: { url: 'https://x', fetched: '2026-08-05' }, cited: true },
    { tool: 'lookupJobs', label: 'SK 岗位', value: 13, valueText: '', unit: 'jobs', evidence: { url: 'https://x', fetched: '2026-08-05' } },
    { tool: 'lookupDraws', label: 'SK 抽选线', value: 68, valueText: '', unit: 'points', evidence: { url: 'https://y', fetched: '2026-08-05' } },
  ],
  followups: [],
}

describe('threadId / turnOf', () => {
  const first: ChatTurn[] = [{ role: 'user', content: '木匠去哪个省好' }, { role: 'assistant', content: '……' }]

  it('同一串追问共用一个 thread —— 认的是首轮提问,不是本轮', () => {
    expect(threadId('那曼省呢', first)).toBe(threadId('木匠去哪个省好', []))
  })

  it('不同的首轮提问 → 不同 thread', () => {
    expect(threadId('厨师好移民吗', [])).not.toBe(threadId('木匠去哪个省好', []))
  })

  it('thread 是哈希,不含原文', () => {
    const t = threadId('木匠去哪个省好', [])
    expect(t).toMatch(/^[0-9a-f]{16}$/)
    expect(t).not.toContain('木匠')
  })

  it('turn 数 user 消息,不数 assistant', () => {
    expect(turnOf([])).toBe(1)
    expect(turnOf(first)).toBe(2)
  })
})

describe('logChat', () => {
  it('成功一轮:落库的字段与预期一一对上', async () => {
    const pl = new FakePayload()
    logChat(pl, { text: '木匠去哪个省好', lang: 'zh', history: [], result: RESULT, ms: 1234.6 })
    await flush()

    expect(pl.calls).toHaveLength(1)
    expect(pl.calls[0].collection).toBe('chat-logs')
    const d = pl.calls[0].data
    expect(d.lang).toBe('zh')
    expect(d.question).toBe('木匠去哪个省好')
    expect(d.answer).toBe('曼省在招 3 个岗位。')
    expect(d.noc).toBe('72310')          // 从 slots 提到列上:最常用的 group by
    expect(d.turn).toBe(1)
    expect(d.degraded).toBe(false)
    expect(d.err).toBeNull()
    expect(d.ms).toBe(1235)              // 取整,不写小数进 integer 列
    expect(d.tools).toEqual(['lookupJobs', 'lookupDraws'])   // 去重且保序
  })

  it('facts 整份留下(含 cited)—— 复现率要靠它回算', async () => {
    const pl = new FakePayload()
    logChat(pl, { text: 'q', lang: 'zh', result: RESULT, ms: 1 })
    await flush()
    const { facts } = pl.calls[0].data
    expect(facts).toHaveLength(3)
    expect(facts[0].cited).toBe(true)
    expect(facts[0].evidence.url).toBe('https://x')
  })

  it('失败一轮:err 落库,answer/facts/tools 留空', async () => {
    const pl = new FakePayload()
    logChat(pl, { text: '你好', lang: 'en', err: 'tooShort', ms: 5 })
    await flush()
    const d = pl.calls[0].data
    expect(d.err).toBe('tooShort')
    expect(d.answer).toBeNull()
    expect(d.facts).toBeNull()
    expect(d.tools).toBeNull()
    expect(d.noc).toBeNull()
  })

  it('🔴 写库炸了绝不冒泡 —— 用户那边什么都不该发生', async () => {
    const pl = new FakePayload()
    pl.fail = true
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(() => logChat(pl, { text: 'q', lang: 'zh', result: RESULT, ms: 1 })).not.toThrow()
    await flush()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[chatlog] skipped'))
    spy.mockRestore()
  })

  it('🔴 payload 为空(getPayload 挂了)直接跳过,不炸', () => {
    expect(() => logChat(null, { text: 'q', lang: 'zh', result: RESULT, ms: 1 })).not.toThrow()
  })

  it('🔴 写进去的字段里没有任何指向人的东西', async () => {
    const pl = new FakePayload()
    logChat(pl, { text: '我叫张三,邮箱 a@b.com', lang: 'zh', result: RESULT, ms: 1 })
    await flush()
    const keys = Object.keys(pl.calls[0].data).join(' ').toLowerCase()
    for (const banned of ['ip', 'user', 'email', 'session']) expect(keys).not.toContain(banned)
    // 用户自己在提问里写的内容照原样留 —— 那是语料;我们只保证不额外附加身份字段。
    expect(pl.calls[0].data.question).toContain('张三')
  })

  it('超长输入截断,不把整篇简历灌进库', async () => {
    const pl = new FakePayload()
    logChat(pl, { text: 'x'.repeat(5000), lang: 'zh', result: { ...RESULT, answer: 'y'.repeat(20000) }, ms: 1 })
    await flush()
    expect(pl.calls[0].data.question).toHaveLength(2000)
    expect(pl.calls[0].data.answer).toHaveLength(8000)
  })
})
