/**
 * 合成层「等不来就别等」——超时降级成事实清单。
 *
 * 病灶(2026-08-09 Frank 实撞):朋友 qwen 冷启/单队列,chat_logs id132 整轮 112.7s(热身后 9-11s),
 * 用户那头一分钟空白。**降级机制早就有**(出口校验两次不过 → factSheet),缺的是「一直没吐字」这个触发器。
 *
 * 被测链路是真的:orchestrate → collectFacts → factSheet;只有「数据库返回什么行」和「模型的死活」是 fixture。
 * 三条金标:
 *   ① 合成第一稿停摆 → 不抛错、degraded=true、答复就是事实清单(有出处的 fact 全标 cited);
 *   ② **重写那一稿**停摆也降级(旧代码只认第一稿,第二稿挂了整轮抛错——手里攥着 facts 还报错是纯亏);
 *   ③ 契约:合成那一发真把 stallMs 发给了传输层(数值可 env 调,但「有没有装看门狗」不许悄悄回归)。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const H = vi.hoisted(() => ({
  /** 'ok' = 正常答复;'stall' = 每一稿都停摆;'stall-2nd' = 第一稿撞数字闸、第二稿停摆 */
  mode: 'ok' as 'ok' | 'stall' | 'stall-2nd',
  synthOpts: [] as any[],
  slotOpts: [] as any[],
}))

vi.mock('@/lib/llm', () => {
  class LlmError extends Error {
    constructor(msg: string, public code?: string) { super(msg); this.name = 'LlmError' }
  }
  const timeout = () => new LlmError('模型服务响应超时,请稍后再试。', 'timeout')
  return {
    LlmError,
    completeText: vi.fn(async (messages: { content: string }[], opts: any) => {
      // 抽槽那一发:SLOT_SYSTEM 里那句 "turn one message" 是它的指纹
      if (messages[0]?.content?.includes('turn one message')) {
        H.slotOpts.push(opts)
        return JSON.stringify({ occ_en: 'carpenter', noc: '72310', provs: ['ON'], exp_months: null, status: null, claims: [] })
      }
      H.synthOpts.push(opts)
      if (H.mode === 'stall') throw timeout()
      // 第一稿故意编一个 facts 里没有的数字 → 撞数字 guard → 触发重写轮;第二稿再停摆
      if (H.mode === 'stall-2nd') {
        if (H.synthOpts.length === 1) return '安省目前有 88888 个木工岗位在招。'
        throw timeout()
      }
      return '木工岗位的情况在下面这些事实里,每条都带官方出处。'
    }),
  }
})

import { orchestrate } from '@/lib/chatOrchestrate'

const CARPENTER = '72310'
const JOB_ROWS = [
  { province: 'ON', open: 129, named: 0, apprentice: 4 },
  { province: 'MB', open: 24, named: 2, apprentice: 3 },
]

/** 够产出 facts 的最小 pool:认得出职业 + 有在招岗数;其余表一律空行(四态里的「本站未收录」照旧成立)。 */
class FakePool {
  async query(sql: string) {
    if (sql.includes('etl_heartbeat')) return { rows: [{ last_seed: '2026-08-06T00:00:00.000Z' }] }
    if (sql.includes('FROM noc_descriptions')) return { rows: [{ title: 'Carpenters', teer: 2, noc: CARPENTER }] }
    if (sql.includes('FROM jobs')) return { rows: JOB_ROWS }
    return { rows: [] }
  }
}

const ask = (pool: FakePool) => orchestrate(pool, { text: '我是木工,安省现在有多少岗位在招?', lang: 'zh' })

describe('合成停摆 → 降级事实清单', () => {
  let pool: FakePool
  beforeEach(() => { pool = new FakePool(); H.mode = 'ok'; H.synthOpts.length = 0; H.slotOpts.length = 0 })

  it('先立基线:模型正常时不降级(免得下面两条是被别的原因蒙对的)', async () => {
    const r = await ask(pool)
    expect(r.degraded).toBeUndefined()
    expect(r.facts.length).toBeGreaterThan(0)
  })

  it('① 第一稿停摆 → 不抛错,degraded=true,答复就是事实清单', async () => {
    H.mode = 'stall'
    const r = await ask(pool)
    expect(r.degraded).toBe(true)
    expect(r.answer.length).toBeGreaterThan(0)
    expect(r.facts.length).toBeGreaterThan(0)
    // 降级时整张清单就是答复 → 有出处的 fact 全部标上(前端出处表要点得动)
    expect(r.facts.filter((f) => f.evidence.url).every((f) => f.cited)).toBe(true)
    expect(H.synthOpts).toHaveLength(1)          // 等不来就不再补一刀:重试只会再等一次
  })

  it('② 重写那一稿停摆也降级(旧代码在这里整轮抛错)', async () => {
    H.mode = 'stall-2nd'
    const r = await ask(pool)
    expect(H.synthOpts.length).toBe(2)           // 第一稿撞了数字闸,确实进了重写轮
    expect(r.degraded).toBe(true)
    expect(r.answer).not.toContain('88888')      // 编的那个数字一个字都不许留下
  })

  it('③ 契约:合成那一发带 stallMs(装没装看门狗不许悄悄回归)', async () => {
    await ask(pool)
    expect(H.synthOpts[0]?.stallMs).toBe(25_000)  // 默认值;env CHAT_SYNTH_STALL_MS 可调
    expect(H.synthOpts[0]?.provider).toBe('friend')
  })
})
