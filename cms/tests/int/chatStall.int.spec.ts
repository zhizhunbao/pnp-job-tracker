/**
 * 合成层「等不来就别等」——停摆 → 报 busy(系统繁忙),**不降级成事实清单**。
 *
 * 病灶(2026-08-09 Frank 实撞):朋友 qwen 冷启/单队列,chat_logs id132 整轮 112.7s(热身后 9-11s),
 * 用户那头一分钟空白。触发器=停摆闸(friendLlm.stallMs);**出口是什么** Frank 当天拍板:
 * 「不用降级 就显示稍后再试,系统繁忙」——让人等了半天再塞一张表格,读的人只会更烦。
 *
 * 被测链路是真的:orchestrate → collectFacts;只有「数据库返回什么行」和「模型的死活」是 fixture。
 * 四条金标:
 *   ① 合成停摆 → 抛 ChatError('busy'),**不返回事实清单**;
 *   ② 上一稿本来就干净、只是重写那稿停摆 → 把干净那稿发出去(手里有能用的答复还报错是纯亏);
 *   ③ 不是等待的失败(掉线/上游炸)照旧降级发清单 —— 这条没被 busy 顺手改掉;
 *   ④ 契约:合成那一发真把 stallMs 发给了传输层(数值可 env 调,但「有没有装看门狗」不许悄悄回归)。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const H = vi.hoisted(() => ({
  /**
   * 'ok'        = 正常答复
   * 'stall'     = 每一稿都停摆
   * 'stall-2nd' = 第一稿干净(只是句式要重写)、第二稿停摆
   * 'offline'   = 不是等待:连不上(照旧降级发清单)
   */
  mode: 'ok' as 'ok' | 'stall' | 'stall-2nd' | 'offline',
  synthOpts: [] as any[],
  slotOpts: [] as any[],
}))

// 硬拦全过、只撞软检查(连着三句同一个开头 → findSameOpening;zh 的 openKey = 句首四个字)的一稿。
// 一个数字都不写:数字 guard 只认 facts 里有的数,写了就变成硬拦,那测的就不是重写轮了。
const CLEAN_DRAFT = '木工这行的情况看下面。木工这行的口径写在出处里。木工这行的其他省也一样。'

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
      if (H.mode === 'offline') throw new LlmError('无法连接本地模型服务,请稍后再试。', 'offline')
      // 第一稿硬拦全过、只是连着三句同一个开头(软重写)→ 进第二轮;第二轮再停摆
      if (H.mode === 'stall-2nd') {
        if (H.synthOpts.length === 1) return CLEAN_DRAFT
        throw timeout()
      }
      return '木工岗位的情况在下面这些事实里,每条都带官方出处。'
    }),
  }
})

import { ChatError, orchestrate } from '@/lib/chatOrchestrate'

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

describe('合成停摆 → 系统繁忙', () => {
  let pool: FakePool
  beforeEach(() => { pool = new FakePool(); H.mode = 'ok'; H.synthOpts.length = 0; H.slotOpts.length = 0 })

  it('先立基线:模型正常时不降级(免得下面两条是被别的原因蒙对的)', async () => {
    const r = await ask(pool)
    expect(r.degraded).toBeUndefined()
    expect(r.facts.length).toBeGreaterThan(0)
  })

  it('① 停摆 → 报 busy,不发事实清单(Frank 08-09 拍板)', async () => {
    H.mode = 'stall'
    const e = await ask(pool).catch((x) => x)
    expect(e).toBeInstanceOf(ChatError)
    expect(e.code).toBe('busy')
    expect(e.slots?.noc).toBe(CARPENTER)         // 槽带出去:留痕与前端上下文都要它
    expect(H.synthOpts).toHaveLength(1)          // 等不来就不再补一刀:重试只会再等一次
  })

  it('② 上一稿本来就干净、只是重写那稿停摆 → 把干净那稿发出去,不报 busy', async () => {
    H.mode = 'stall-2nd'
    const r = await ask(pool)
    expect(H.synthOpts.length).toBe(2)           // 第一稿撞了软检查,确实进了重写轮
    expect(r.answer).toContain('木工这行')
    expect(r.degraded).toBeUndefined()
  })

  it('③ 不是等待的失败(掉线)照旧降级发清单——busy 没顺手把它改掉', async () => {
    H.mode = 'offline'
    const r = await ask(pool)
    expect(r.degraded).toBe(true)
    expect(r.facts.length).toBeGreaterThan(0)
    // 降级时整张清单就是答复 → 有出处的 fact 全部标上(前端出处表要点得动)
    expect(r.facts.filter((f) => f.evidence.url).every((f) => f.cited)).toBe(true)
  })

  it('④ 契约:合成那一发带 stallMs(装没装看门狗不许悄悄回归)', async () => {
    await ask(pool)
    expect(H.synthOpts[0]?.stallMs).toBe(15_000)  // 默认值;env CHAT_SYNTH_STALL_MS 可调
    expect(H.synthOpts[0]?.provider).toBe('friend')
  })
})
