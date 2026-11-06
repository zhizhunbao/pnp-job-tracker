// 管理员队列页(2026-11-05 Frank「我能看到所有在排队的任务」「其他账号看不到」)。
// 性质:① 上报体是信任边界 —— 单元名 / 节奏 / 状态三格任一不对整条拒收(null),时刻格不是有限正数一律当没有(null),
//       成败格不是布尔当没有;② 调度单元的状态胶囊:正在跑蓝、等盒子黄、过点超过 10 分钟还没开跑 = 失联红、其余排队灰,
//       上一轮失败另挂一枚;③ 卡头计数截断时报「前 N 条,共 M 条」。
// 探针:toUnitFact 放过未知状态 → ①红;失联判据从 < -LOST_S 改成 < 0 → ②「刚过点」那条红;countTextOf 不看 total → ③红。
import { describe, expect, it } from 'vitest'

// 测试例外:内部件直接点文件(桶只走门的规矩不管测试)
import { countTextOf, toUnitRow } from '@/components/queue/functions'
import { toUnitFact } from '@/lib/queue/functions'

const GOOD = { name: 'findsite', intervalS: 60, state: 'run', lastOk: true, startedAt: 1_762_400_000, endedAt: null, nextAt: 1_762_400_060 }

describe('上报体收窄', () => {
  it('合规的一条原样收下', () => {
    expect(toUnitFact(GOOD)).toEqual(GOOD)
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

const BASE = { name: 'jobbank', intervalS: 3600, state: 'wait', lastOk: true, runS: null, agoS: 120, dueS: 600 }

describe('调度单元状态胶囊', () => {
  it('四种状态各一色', () => {
    expect(toUnitRow({ ...BASE, state: 'run', runS: 30 })).toMatchObject({ tagText: '正在跑', tagVariant: 'info', whenText: '已跑 30 秒' })
    expect(toUnitRow({ ...BASE, state: 'llm' })).toMatchObject({ tagText: '等盒子', tagVariant: 'warn' })
    expect(toUnitRow(BASE)).toMatchObject({ tagText: '排队', tagVariant: 'gray', whenText: '10 分钟后' })
    expect(toUnitRow({ ...BASE, dueS: -7200 })).toMatchObject({ tagText: '失联', tagVariant: 'bad', whenText: '过点 2 小时' })
  })

  it('刚过点不算失联(调度器 30 秒查一次到点)', () => {
    expect(toUnitRow({ ...BASE, dueS: -45 })).toMatchObject({ tagText: '排队', whenText: '过点 45 秒' })
  })

  it('上一轮失败另挂一枚,没跑完过不挂', () => {
    expect(toUnitRow({ ...BASE, lastOk: false }).warnText).toBe('上轮失败')
    expect(toUnitRow({ ...BASE, lastOk: null, agoS: null })).toMatchObject({ warnText: '', lastText: '—' })
  })
})

describe('卡头计数', () => {
  it('截断时报前 N 条与总数', () => {
    expect(countTextOf({ shown: 100, total: 230 })).toBe('前 100 条,共 230 条')
    expect(countTextOf({ shown: 12, total: 12 })).toBe('12 条')
    expect(countTextOf({ shown: 0, total: 0 })).toBe('0 条')
  })
})
