/** 多轮上下文回归：真实 orchestrate/槽位合并/工具/出口，只替换数据库行和 LLM I/O。 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/llm', () => ({
  completeText: vi.fn(async ({ messages }: { messages: { content: string }[] }) => {
    const system = messages[0]?.content ?? ''
    const user = messages.at(-1)?.content ?? ''
    if (system.includes('turn one message')) {
      if (user.includes('NOW: 那语言要求呢?') || user.includes('NOW: 那工作经验呢?')) {
        // 故意模拟模型没有从历史捞回任何槽位；结构化 context 必须接住。
        return JSON.stringify({ occ_en: '', noc: null, provs: [], exp_months: null, status: null, claims: [] })
      }
      return JSON.stringify({
        occ_en: 'carpenter', noc: null, provs: ['MB'], exp_months: 0, status: 'graduated', claims: [],
      })
    }
    if (user.includes('QUESTION: 那工作经验呢?')) return '这轮仍按同一个木匠职业继续核对工作经验。'
    if (user.includes('QUESTION: 那语言要求呢?')) return '这轮仍按同一个木匠职业继续核对语言要求。'
    return '已按木匠职业记录你的情况，后续问题会继续沿用。'
  }),
}))

import { orchestrate } from '@/lib/chat/orchestrate'
import type { ChatTurn } from '@/lib/chat/types'

class ContextPool {
  calls: { sql: string; params: unknown[] }[] = []
  async query(sql: string, params: unknown[] = []) {
    this.calls.push({ sql, params })
    if (sql.includes('similarity(j.title, $1)')) return { rows: [{ noc: '72310' }] }
    if (sql.includes('SELECT title FROM noc_descriptions WHERE noc = $1')) return { rows: [{ title: 'Carpenters' }] }
    if (sql.includes("COALESCE(s.title_en, d.title, '') title")) return { rows: [{ title: 'Carpenters', teer: 2 }] }
    if (sql.includes('SELECT last_seed FROM etl_heartbeat')) return { rows: [{ last_seed: '2026-08-05T12:00:00Z' }] }
    return { rows: [] }
  }
}

describe('对话上下文滚动接线（真实编排 + fixture I/O）', () => {
  it('第三轮仍继承首轮职业、NOC、省份、经验与身份，即使模型在追问轮返回空槽位', async () => {
    const pool = new ContextPool()
    const q1 = '我在曼省做木匠，刚毕业还没有工作经验。'
    const first = await orchestrate(pool, { text: q1, lang: 'zh' })
    expect(first.slots).toMatchObject({
      noc: '72310', occText: 'carpenter', provs: ['MB'], expMonths: 0, status: 'graduated',
    })

    const h1: ChatTurn[] = [{ role: 'user', content: q1 }, { role: 'assistant', content: first.answer }]
    const second = await orchestrate(pool, {
      text: '那语言要求呢?', lang: 'zh', history: h1, context: first.slots,
    })
    expect(second.slots).toMatchObject(first.slots)

    const h2: ChatTurn[] = [...h1,
      { role: 'user', content: '那语言要求呢?' }, { role: 'assistant', content: second.answer }]
    const third = await orchestrate(pool, {
      text: '那工作经验呢?', lang: 'zh', history: h2, context: second.slots,
    })
    expect(third.slots).toMatchObject(first.slots)

    // 只有首轮需要把职业名解析成 NOC；追问轮直接使用服务端已经确认的上下文。
    expect(pool.calls.filter((c) => c.sql.includes('similarity(j.title, $1)'))).toHaveLength(1)
  })
})
