// 答案门面与字段库(统一题库,docs/design/统一题库与付费面-20260731.md)。
// 锁死三件事:① 老答案迁得过来(丢了=让用户重答,红线);② 目标省两种表示始终同步
// (只写一边 → 另一个入口会重新问一遍,那正是这次收敛掉的病);③ 档位→引擎输入的换算与重构前逐字一致。
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ANSWERS_KEY, answeredBasics, pullAndMerge, readAnswers, readScoreAnswers, toEngineAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { DECISIONS, batchLeadsFree, fieldsOf, KNOWN_NO_FREE_LEAD } from '@/lib/decisions'
import { FIELDS } from '@/lib/fields'

const OLD_QUIZ = 'jobs_quiz_v1'
const OLD_PR = 'plan_pr_v1'
const base = (p: Partial<Answers> = {}): Answers =>
  ({ status: '', nocs: [], provs: [], clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0, eduBand: 0, ageBand: 0, totalExpBand: 0, offerBand: 0, canadaEduBand: 0, permitBand: 0, resProv: '', studyMonthsBand: 0, studyLevelBand: 0, bandsV2: true, ...p })

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
  it('引擎优先使用多选的具体省份,不被兼容档位覆盖', () => {
    const out = toEngineAnswers(base({ provs: ['BC', 'SK', 'NL'], provBand: 4 }))
    expect(out.targetProvinces).toEqual(['BC', 'SK', 'NL'])
  })
})

describe('档位 → 引擎输入', () => {
  // 语言 2026-08-13 合一成**精确档**(基础卷直接问 CLB 几,分值段不再追问):
  // value 2..8 ↔ CLB 4..10;旧区间档答案由 readAnswers 按下界迁移(另测)
  it('精确档逐值直传:选 CLB 6 就传 6', () => {
    const out = toEngineAnswers(base({ status: 'working', nocs: ['31301'], clbBand: 4, expBand: 3, provBand: 1, crsBand: 4, pgwpBand: 2 }))
    expect(out).toEqual({
      noc: '31301', nocs: ['31301'], currentStatus: 'working', clb: 6, canadianExpMonths: 18,
      targetProvinces: ['BC'], crs: 480, pgwpMonthsLeft: 9,
    })
    expect(toEngineAnswers(base({ clbBand: 8 })).clb).toBe(10)
  })

  // 迁移:旧区间档读盘时按旧引擎数字对齐落到精确档 —— 引擎收到的数字前后不变
  it('旧语言/总经验区间档读盘迁移到精确档,引擎数字不变', () => {
    localStorage.setItem('o2p_answers_v1', JSON.stringify(base({ clbBand: 3, totalExpBand: 3, bandsV2: undefined })))
    const a = readAnswers()
    expect(a.clbBand).toBe(4)          // 旧 6-7 档 → 精确 CLB 6(value 4)
    expect(a.totalExpBand).toBe(4)     // 旧 1-3 年档(引擎 24 月)→ 精确 2 年档(同 24 月)
    expect(a.bandsV2).toBe(true)
    expect(toEngineAnswers(a).clb).toBe(6)
    expect(toEngineAnswers(a).totalExpMonths).toBe(24)
    localStorage.setItem('o2p_answers_v1', JSON.stringify(base({ clbBand: 5, totalExpBand: 9, bandsV2: undefined })))
    const b = readAnswers()
    expect(toEngineAnswers(b).clb).toBe(10)               // 旧 10+ 档不许被降档
    expect(b.totalExpBand).toBe(9)                        // 「不清楚」原样保留
    expect(toEngineAnswers(b).totalExpMonths).toBeUndefined()
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
    const out = toEngineAnswers(base({ eduBand: 4, ageBand: 2, totalExpBand: 7 }))
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

  // statusInCanada 拆闸(2026-08-15):许可/现居省两题只对境内处境生效
  it('许可/现居省档 → 引擎输入;境外答案残留不传(改处境后旧答案不许跟着进引擎)', () => {
    const out = toEngineAnswers(base({ status: 'jobhunting', permitBand: 2, resProv: 'MB' }))
    expect(out.permit).toBe('pgwp')
    expect(out.residenceProvince).toBe('MB')
    expect(toEngineAnswers(base({ status: 'working', permitBand: 9 })).permit).toBeUndefined()   // 「不清楚」不传
    const stale = toEngineAnswers(base({ status: 'overseas', permitBand: 3, resProv: 'ON' }))
    expect(stale.permit).toBeUndefined()
    expect(stale.residenceProvince).toBeUndefined()
  })
})

describe('题级显隐(fieldsOf 过滤)', () => {
  it('境外不问许可/现居省;学签只问现居省;在工作两道都问 —— 完整度计数与题单同源', () => {
    const names = (a: Answers) => fieldsOf('pr', 'basic', 0, a)
    expect(names(base({ status: 'overseas' }))).not.toContain('permitBand')
    expect(names(base({ status: 'overseas' }))).not.toContain('resProv')
    expect(names(base({ status: 'studying' }))).toContain('resProv')
    expect(names(base({ status: 'studying' }))).not.toContain('permitBand')
    expect(names(base({ status: 'working' }))).toEqual(expect.arrayContaining(['permitBand', 'resProv']))
    // 不传答案 = 全量清单(服务端/静态场景不误裁)
    expect(fieldsOf('pr', 'basic')).toEqual(expect.arrayContaining(['permitBand', 'resProv']))
  })
})

// 服务端答案档同步(答案入库绑账号 2026-08-15):合并规则=新者胜。fetch 用素对象桩
// (jsdom 不保证有 Response),只摸 status/ok/json 三样 —— 与 lib/answers 的用面一致。
describe('服务端答案档同步', () => {
  const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()
  const res = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body })

  it('服务端档更新 → 覆盖本地(清浏览器/换设备答案回得来)', async () => {
    const doc = {
      basic: base({ status: 'working', nocs: ['31301'], provs: ['BC'], provBand: 1 }),
      score: { ticks: { 'edu:BC': true }, rowAnswers: {}, extraAnswered: {} },
      updatedAt: iso(60_000),
    }
    vi.stubGlobal('fetch', vi.fn(async () => res(200, { answers: doc })))
    expect(await pullAndMerge()).toBe(true)
    expect(readAnswers().nocs).toEqual(['31301'])
    expect(readScoreAnswers().ticks['edu:BC']).toBe(true)
  })

  it('本地档更新 → 本地不动,整档推给服务端', async () => {
    writeAnswers({ status: 'studying' })
    const methods: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: { method?: string; body?: string }) => {
      methods.push(init?.method || 'GET')
      if ((init?.method || 'GET') === 'GET')
        return res(200, { answers: { basic: base(), score: {}, updatedAt: iso(-60_000) } })
      expect(JSON.parse(init!.body!).basic.status).toBe('studying')   // 推上去的是本地这份
      return res(200, { ok: true, updatedAt: iso(0) })
    }))
    expect(await pullAndMerge()).toBe(false)
    expect(readAnswers().status).toBe('studying')
    expect(methods).toContain('PUT')
  })

  it('未登录 401 → 本地照旧,一切静默', async () => {
    writeAnswers({ status: 'working' })
    vi.stubGlobal('fetch', vi.fn(async () => res(401, {})))
    expect(await pullAndMerge()).toBe(false)
    expect(readAnswers().status).toBe('working')
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
