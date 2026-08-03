// 答案门面与字段库(统一题库,docs/design/统一题库与付费面-20260731.md)。
// 锁死三件事:① 老答案迁得过来(丢了=让用户重答,红线);② 目标省两种表示始终同步
// (只写一边 → 另一个入口会重新问一遍,那正是这次收敛掉的病);③ 档位→引擎输入的换算与重构前逐字一致。
import { describe, it, expect, beforeEach } from 'vitest'
import { ANSWERS_KEY, answeredBasics, readAnswers, toEngineAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { DECISIONS, batchLeadsFree, KNOWN_NO_FREE_LEAD } from '@/lib/decisions'
import { FIELDS } from '@/lib/fields'

const OLD_QUIZ = 'jobs_quiz_v1'
const OLD_PR = 'plan_pr_v1'
const base = (p: Partial<Answers> = {}): Answers =>
  ({ status: '', nocs: [], provs: [], clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0, eduBand: 0, ageBand: 0, totalExpBand: 0, offerBand: 0, ...p })

beforeEach(() => localStorage.clear())

describe('旧 key 迁移', () => {
  it('两个旧 key 合并进新 key,旧 key 迁完即删', () => {
    localStorage.setItem(OLD_QUIZ, JSON.stringify({ status: 'studying', nocs: ['31301'], provs: ['BC'], done: true }))
    localStorage.setItem(OLD_PR, JSON.stringify({ status: 'working', clbBand: 2, expBand: 3, provBand: 1, crsBand: 0, pgwpBand: 2 }))
    const a = readAnswers()
    expect(a.status).toBe('working')        // 处境两处都有 → 答得更细的拿 PR 那份优先
    expect(a.nocs).toEqual(['31301'])
    expect(a.done).toBe(true)
    expect(a.clbBand).toBe(2)
    expect(localStorage.getItem(OLD_QUIZ)).toBeNull()
    expect(localStorage.getItem(OLD_PR)).toBeNull()
    expect(JSON.parse(localStorage.getItem(ANSWERS_KEY)!).expBand).toBe(3)
  })

  it('只答过三问也迁得过来,目标省档位从省份数组推出来', () => {
    localStorage.setItem(OLD_QUIZ, JSON.stringify({ status: 'overseas', nocs: [], provs: ['ON'], done: true }))
    expect(readAnswers().provBand).toBe(2)   // 单选 ON → 2 档(与重构前 readBands 同式)
  })

  it('没有任何旧答案 → 空答案,不炸', () => {
    expect(readAnswers()).toEqual(base())
    expect(answeredBasics(readAnswers())).toBe(false)
  })
})

describe('目标省两种表示同步', () => {
  it('写档位 → 省份数组跟着变', () => {
    expect(writeAnswers({ provBand: 3 }).provs).toEqual(['AB', 'SK', 'MB'])
  })
  it('写省份数组 → 档位跟着变(三问答过省,拿 PR 不再问)', () => {
    expect(writeAnswers({ provs: ['BC'] }).provBand).toBe(1)
    expect(writeAnswers({ provs: ['ON', 'BC'] }).provBand).toBe(4)   // 多选 → 先看哪个够得着
  })
})

describe('档位 → 引擎输入', () => {
  // 语言 2026-08-02 从自评(初级/中级/流利)改成**实测 CLB 档**,取每档下界 ——
  // 自评映射是本站编的,报告却写成「你报的 CLB 9」(Frank 实拍点名),而且偏乐观会把不达标说成达标
  it('每档取下界:CLB 6-7 那档按 6 传,不按 7', () => {
    const out = toEngineAnswers(base({ status: 'working', nocs: ['31301'], clbBand: 3, expBand: 3, provBand: 1, crsBand: 4, pgwpBand: 2 }))
    expect(out).toEqual({
      noc: '31301', nocs: ['31301'], currentStatus: 'working', clb: 6, canadianExpMonths: 18,
      targetProvinces: ['BC'], crs: 480, pgwpMonthsLeft: 9,
    })
    expect(toEngineAnswers(base({ clbBand: 5 })).clb).toBe(10)
  })

  // 多职业(2026-08-02):选几个报几个;`noc` 保留单值只为老前端与 advisor 不受影响
  it('选了两个职业就报两个,单值 noc 仍是第一个', () => {
    const out = toEngineAnswers(base({ nocs: ['31301', '21232'] }))
    expect(out.nocs).toEqual(['31301', '21232'])
    expect(out.noc).toBe('31301')
  })

  it('「没有」加拿大经验 = 0 个月,是答案不是缺答', () => {
    expect(toEngineAnswers(base({ expBand: 1 })).canadianExpMonths).toBe(0)
  })

  // 题库扩充 20260802:三个新字段的换算也只此一处(学历给引擎枚举、年龄给区间中点、总经验给月数)
  it('学历/年龄/总经验档 → 引擎输入', () => {
    const out = toEngineAnswers(base({ eduBand: 4, ageBand: 2, totalExpBand: 5 }))
    expect(out.edu).toBe('master')
    expect(out.age).toBe(28)
    expect(out.totalExpMonths).toBe(60)
  })

  it('「没有」总经验 = 0 个月是答案;三个新字段未答一律不传', () => {
    expect(toEngineAnswers(base({ totalExpBand: 1 })).totalExpMonths).toBe(0)
    const empty = toEngineAnswers(base())
    expect(empty.edu).toBeUndefined()
    expect(empty.age).toBeUndefined()
    expect(empty.totalExpMonths).toBeUndefined()
  })

  it('「还没考」英语 / 「没算过」CRS 不传(引擎照旧出缺口行)', () => {
    const out = toEngineAnswers(base({ clbBand: 1, crsBand: 1 }))
    expect(out.clb).toBeUndefined()
    expect(out.crs).toBeUndefined()
  })

  it('境外不传签证剩余 —— 没有加拿大签证,拿档位造时间窗=编数', () => {
    expect(toEngineAnswers(base({ status: 'overseas', pgwpBand: 2 })).pgwpMonthsLeft).toBeUndefined()
    expect(toEngineAnswers(base({ status: 'studying', pgwpBand: 2 })).pgwpMonthsLeft).toBe(9)
  })
})

describe('题库铁律', () => {
  it('每个字段都挂着引擎里真实存在的结论 key', () => {
    for (const [name, def] of Object.entries(FIELDS)) {
      expect(def.unlocks.length, `${name} 挂不上结论就不该入库`).toBeGreaterThan(0)
      // p = 卡③ 选省份的结论命名空间(rpt.p.best / mostJobs / notExcluded …),2026-08-03 加 goalBand 时补进白名单
      for (const k of def.unlocks) expect(k).toMatch(/^rpt\.[cgnaps]\./)   // s = 换省对照节(L2-08)
    }
  })

  it('每批探索题第一道是 free 题(先兑现一次再谈钱),例外必须在白名单里', () => {
    for (const [decision, d] of Object.entries(DECISIONS)) {
      d.explore.forEach((batch, i) => {
        if (KNOWN_NO_FREE_LEAD.has(`${decision}:${i}`)) return
        expect(batchLeadsFree(batch), `${decision} 探索批 ${i} 全是 pro 题`).toBe(true)
      })
    }
  })
})
