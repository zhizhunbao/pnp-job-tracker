// 管理员运维页的写入(2026-11-05 Frank「我能看到所有在排队的任务」「其他账号看不到」;2026-11-08 随老 queue 域搬进 lib/ops/write)。
// 性质:上报体是信任边界 —— 单元名 / 节奏 / 状态三格任一不对整条拒收(null),时刻格不是有限正数一律当没有(null),成败格不是布尔当没有。
// 探针:toUnitFact 放过未知状态 → 红。
import { describe, expect, it } from 'vitest'

// 测试例外:内部件直接点文件(桶只走门的规矩不管测试)
import { toRemoveFact, toUnitFact } from '@/lib/ops/write/functions'

const GOOD = { name: 'findsite', intervalS: 60, state: 'run', lastOk: true, startedAt: 1_762_400_000, endedAt: null, nextAt: 1_762_400_060 }

describe('上报体收窄', () => {
  it('合规的一条原样收下', () => {
    expect(toUnitFact(GOOD)).toEqual({ ...GOOD, round: null })
  })

  it('跑完那次带 round 才记一轮:成败是布尔、两个时刻都在', () => {
    const done = { ...GOOD, state: 'wait', endedAt: 1_762_400_030, round: { ok: false, error: '✗ boom' } }
    expect(toUnitFact(done)?.round).toEqual({ startedAt: 1_762_400_000, endedAt: 1_762_400_030, ok: false, error: '✗ boom' })
    expect(toUnitFact({ ...done, round: { ok: true, error: null } })?.round).toMatchObject({ ok: true, error: null })
    expect(toUnitFact({ ...done, round: { ok: 'yes' } } as never)?.round).toBeNull()
    expect(toUnitFact({ ...done, endedAt: null })?.round).toBeNull()
  })

  it('必填三格任一不对整条拒收', () => {
    expect(toUnitFact({ ...GOOD, name: 'Find Site' })).toBeNull()
    expect(toUnitFact({ ...GOOD, name: 'x'.repeat(65) })).toBeNull()
    expect(toUnitFact({ ...GOOD, intervalS: 0 })).toBeNull()
    expect(toUnitFact({ ...GOOD, intervalS: 1.5 })).toBeNull()
    expect(toUnitFact({ ...GOOD, state: 'done' })).toBeNull()
    expect(toUnitFact({})).toBeNull()
  })

  it('时刻格与成败格不对一律当没有', () => {
    const bad = { ...GOOD, lastOk: 'yes', startedAt: -1, endedAt: Number.NaN, nextAt: '1762400060' }
    const got = toUnitFact(bad as never)
    expect(got).not.toBeNull()
    expect(got?.lastOk).toBeNull()
    expect(got?.startedAt).toBeNull()
    expect(got?.endedAt).toBeNull()
    expect(got?.nextAt).toBeNull()
  })
})

describe('删除请求收窄', () => {
  it('三种对象与非空键才收', () => {
    expect(toRemoveFact({ kind: 'site', key: 'd-s-malhi-transport-ltd' })).toEqual({ kind: 'site', key: 'd-s-malhi-transport-ltd' })
    expect(toRemoveFact({ kind: 'users', key: '11' })).toBeNull()
    expect(toRemoveFact({ kind: 'unit', key: 'jobbank' })).toBeNull()
    expect(toRemoveFact({ kind: 'apply', key: '' })).toBeNull()
    expect(toRemoveFact({ kind: 'alias', key: 'x'.repeat(301) })).toBeNull()
    expect(toRemoveFact({})).toBeNull()
  })
})
