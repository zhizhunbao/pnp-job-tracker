// 运维页报警判定(2026-11-08 Frank「Claude API 额度绝不能超,快到额度要报警」)。
// 性质:额度三条线单调;没探活不算失败;失联只算等下一轮的单元;从没成功过的数据集算超线;职位与其余数据的警告线不同。
// 探针:额度比较改成 > → 「刚好到线」红;channelSignalOf 把 null 当失败 → 「没探活」红;isUnitLost 不看 state → 「正在跑」红。
import { describe, expect, it } from 'vitest'

// 测试例外:内部件直接点文件(桶只走门的规矩不管测试)
import { signalsOf, toAlertAct, toFreshFact, toOllamaProbe } from '@/lib/ops/watch/functions'

const BASE = { usedUsd: 0, degraded: 0, probes: [], units: [], stuck: 0, staleSets: [] }

function firing(f: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const s of signalsOf({ ...BASE, ...f } as never)) {
    if (s.firing) {
      out.push(s.rule)
    }
  }
  return out
}

describe('报警判定', () => {
  it('全部正常时一条也不触发', () => {
    expect(firing({})).toEqual([])
  })

  it('额度三条线,刚好到线就触发', () => {
    expect(firing({ usedUsd: 89.99 })).toEqual([])
    expect(firing({ usedUsd: 90 })).toEqual(['budget.90'])
    expect(firing({ usedUsd: 144 })).toEqual(['budget.90', 'budget.144'])
    expect(firing({ usedUsd: 180 })).toEqual(['budget.90', 'budget.144', 'budget.162'])
  })

  it('没探活不算失败,最近一次失败才触发', () => {
    expect(firing({ probes: [] })).toEqual([])
    expect(firing({ probes: [{ channel: 'friend', ok: true, ms: 1, error: null, n: 1, n_ok: 1 }] })).toEqual([])
    expect(firing({ probes: [{ channel: 'friend', ok: false, ms: 1, error: 'HTTP 502', n: 1, n_ok: 0 }] })).toEqual(['channel.friend'])
  })

  it('失联只算等下一轮的单元,正在跑的不算', () => {
    const lost = { name: 'a', state: 'wait', last_ok: true, due_s: -3601 }
    expect(firing({ units: [lost] })).toEqual(['schedule.lost'])
    expect(firing({ units: [{ ...lost, state: 'run' }] })).toEqual([])
    expect(firing({ units: [{ ...lost, due_s: -3600 }] })).toEqual([])
  })

  it('上轮失败只触发一条,条件里列出单元名', () => {
    const units = [{ name: 'a', state: 'wait', last_ok: false, due_s: 10 }, { name: 'b', state: 'wait', last_ok: false, due_s: 10 }]
    const hit = signalsOf({ ...BASE, units } as never).filter((s) => s.firing)
    expect(hit).toHaveLength(1)
    expect(hit[0]?.condition).toContain('a, b')
  })
})

describe('数据新鲜度', () => {
  it('职位两小时、其余 25 小时超线,从没成功过算超线', () => {
    expect(toFreshFact({ name: 'jobbank', last_text: 'x', age_s: 7200 }).stale).toBe(false)
    expect(toFreshFact({ name: 'jobbank', last_text: 'x', age_s: 7201 }).stale).toBe(true)
    expect(toFreshFact({ name: 'ircc', last_text: 'x', age_s: 90000 }).stale).toBe(false)
    expect(toFreshFact({ name: 'ircc', last_text: 'x', age_s: 90001 }).stale).toBe(true)
    expect(toFreshFact({ name: 'ircc', last_text: null, age_s: null }).stale).toBe(true)
  })
})

describe('信任边界', () => {
  it('事件操作只收确认和关闭', () => {
    expect(toAlertAct({ id: 1, state: 'ack' })).toEqual({ id: 1, state: 'ack' })
    expect(toAlertAct({ id: 1, state: 'closed' })).toEqual({ id: 1, state: 'closed' })
    expect(toAlertAct({ id: 1, state: 'new' })).toBeNull()
    expect(toAlertAct({ id: 1.5, state: 'ack' })).toBeNull()
    expect(toAlertAct({ id: -1, state: 'ack' })).toBeNull()
    expect(toAlertAct({ state: 'ack' })).toBeNull()
  })

  it('Ollama 探活形状不对当没报', () => {
    expect(toOllamaProbe({})).toBeNull()
    expect(toOllamaProbe({ ollama: { ok: 'yes' } } as never)).toBeNull()
    expect(toOllamaProbe({ ollama: { ok: true, ms: 12.4, error: null } })).toEqual({ channel: 'ollama', ok: true, ms: 12, error: null })
  })
})
