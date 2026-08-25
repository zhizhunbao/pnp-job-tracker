// 答案门面与字段库(统一题库,docs/design/统一题库与付费面-20260731.md)。
// 锁死三件事:① 老答案迁得过来(丢了=让用户重答,红线);② 目标省两种表示始终同步
// (只写一边 → 另一个入口会重新问一遍,那正是这次收敛掉的病);③ 档位→引擎输入的换算与重构前逐字一致。
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ANSWERS_KEY, DECISIONS, getFields, KNOWN_NO_FREE_LEAD, answeredBasics, batchLeadsFree, fieldsOf, pullAndMerge, readAnswers, readScoreAnswers, resetAnswersMemory, toEngineAnswers, writeAnswers, type Answers } from '@/lib/quiz'

const OLD_QUIZ = 'jobs_quiz_v1'
const OLD_PR = 'plan_pr_v1'
const base = (p: Partial<Answers> = {}): Answers =>
  ({ status: '', nocs: [], provs: [], clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0, eduBand: 0, ageBand: 0, totalExpBand: 0, offerBand: 0, goalBand: 0, canadaEduBand: 0, permitBand: 0, resProv: '', fieldMatchBand: 0, eduProv: '', eduYearsBand: 0, frenchBand: 0, studyMonthsBand: 0, studyLevelBand: 0, bandsV2: true, ...p })

beforeEach(() => { localStorage.clear(); resetAnswersMemory() })

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
    // 2026-08-16 起答案不再落 localStorage(服务端唯一真相):迁移的结果直接从门面读
    expect(a.expBand).toBe(3)
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

  // #316 学制年数(2026-08-15):档位 → 整年数,消费端(pathVerdict/mbEoiEstimate/crsEstimate)按年收。
  // 只对「有加拿大学历」的人生效 —— 学历闸没过,残留答案不许进引擎(与 permitBand 同款防串)
  it('学制年数档 → 引擎 eduYears(整年):不到 1 年=0 是答案;不清楚/没过学历闸不传', () => {
    const with316 = (canadaEduBand: number, eduYearsBand: number) =>
      toEngineAnswers({ ...base({ canadaEduBand }), eduYearsBand } as Answers).eduYears
    expect(with316(1, 4)).toBe(3)            // 3 年及以上 → 3(下界,与 CLB/经验同口径)
    expect(with316(1, 3)).toBe(2)            // 2 年 → 2(pathVerdict ≥2 / mbEduYears 2 档吃这个)
    expect(with316(1, 2)).toBe(1)
    expect(with316(1, 1)).toBe(0)            // 「不到 1 年」= 0 整年,是答案不是缺答
    expect(with316(1, 9)).toBeUndefined()    // 不清楚
    expect(with316(2, 4)).toBeUndefined()    // 没有加拿大学历 → 残留答案不传
    expect(with316(0, 4)).toBeUndefined()
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
  // 2026-08-16 Frank「这个上面的问题也没问,你是否有工签啊?」:境内**一律**问许可 ——
  // 先前拿「在加拿大读书」推定学签,推出来的却是「差工签」这种结论,等于没问就替他认定
  it('境外不问许可/现居省;境内(在读也算)两道都问 —— 完整度计数与题单同源', () => {
    const names = (a: Answers) => fieldsOf('pr', 'basic', 0, a)
    expect(names(base({ status: 'overseas' }))).not.toContain('permitBand')
    expect(names(base({ status: 'overseas' }))).not.toContain('resProv')
    expect(names(base({ status: 'studying' }))).toEqual(expect.arrayContaining(['permitBand', 'resProv']))
    expect(names(base({ status: 'working' }))).toEqual(expect.arrayContaining(['permitBand', 'resProv']))
    // 不传答案 = 全量清单(服务端/静态场景不误裁)
    expect(fieldsOf('pr', 'basic')).toEqual(expect.arrayContaining(['permitBand', 'resProv']))
  })

  // #316:学制年数与 fieldMatch/eduProv 同闸 —— 只对「有加拿大学历」的人出,而且排在 eduProv 后面
  it('学制年数题只对「有加拿大学历」的人出,题序紧跟学历省', () => {
    const names = (a: Answers) => fieldsOf('pr', 'basic', 0, a)
    const withEdu = names(base({ canadaEduBand: 1 }))
    expect(withEdu.indexOf('eduYearsBand')).toBe(withEdu.indexOf('eduProv') + 1)
    expect(names(base({ canadaEduBand: 2 }))).not.toContain('eduYearsBand')
    expect(names(base())).not.toContain('eduYearsBand')
  })
})

// 服务端答案档同步(答案入库绑账号 2026-08-15):合并规则=新者胜。fetch 用素对象桩
// (jsdom 不保证有 Response),只摸 status/ok/json 三样 —— 与 lib/quiz/answers 的用面一致。
describe('服务端答案档同步', () => {
  const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()
  const res = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body })
  // #311 登录迹象闸:payload-token 是 httpOnly 读不到,answers 层用伴随 cookie o2p_li 当迹象,
  // 没有迹象挂载不发请求(匿名每页一条 console 401 的病根)。登录态用例先种上迹象。
  beforeEach(() => { document.cookie = 'o2p_li=1; path=/' })

  it('匿名(无登录迹象)→ 挂载不发请求,console 零 401', async () => {
    document.cookie = 'o2p_li=; path=/; max-age=0'
    const fetchSpy = vi.fn(async () => res(401, {}))
    vi.stubGlobal('fetch', fetchSpy)
    expect(await pullAndMerge()).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

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

  // 2026-08-16 缓存撤了之后不再有「本地比服务端新」这种状态 —— 改动立即推,服务端就是真相。
  // 剩下唯一的反向推:服务端还没有档,而手上这份已经答过(注册闸承诺「注册后答案自动存档」)
  it('服务端空档 + 手上有答案 → 立即推上去(不等防抖)', async () => {
    writeAnswers({ status: 'studying' })
    const methods: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: { method?: string; body?: string }) => {
      methods.push(init?.method || 'GET')
      if ((init?.method || 'GET') === 'GET') return res(200, { answers: null })
      expect(JSON.parse(init!.body!).basic.status).toBe('studying')   // 推上去的是手上这份
      return res(200, { ok: true, updatedAt: iso(0) })
    }))
    expect(await pullAndMerge()).toBe(false)
    expect(readAnswers().status).toBe('studying')
    expect(methods).toContain('PUT')
  })

  it('新页面挂载:服务端有档 → 直接以它为准,不再比新旧', async () => {
    writeAnswers({ status: 'working' })
    resetAnswersMemory()                   // = 换台设备/刷新页面,手上没有未推送的改动
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: { method?: string }) => (
      (init?.method || 'GET') === 'GET'
        ? res(200, { answers: { basic: base({ status: 'studying' }), score: {}, updatedAt: iso(-60_000) } })
        : res(200, { ok: true, updatedAt: iso(0) })
    )))
    expect(await pullAndMerge()).toBe(true)
    expect(readAnswers().status).toBe('studying')
  })

  it('刚答过题还没推上去 → 这轮拉档不覆盖(不许把人刚答的顶掉)', async () => {
    resetAnswersMemory()
    vi.stubGlobal('fetch', vi.fn(async () => res(200, { answers: { basic: base({ status: 'studying' }), score: {}, updatedAt: iso(0) } })))
    await pullAndMerge()                   // ① 页面挂载先拉档(用户能答题必然在这之后)
    writeAnswers({ status: 'working' })    // ② 他答了一题,防抖还没到
    expect(await pullAndMerge()).toBe(false)   // ③ 第二次拉档不许把 ② 顶掉
    expect(readAnswers().status).toBe('working')
  })

  // 🔴 2026-08-16 实撞:Frank 刷新后页面 0/11,而库里 845 字节完好 —— 差一步就被空档盖掉。
  // 根因是「还没拉档就把空内存推上去」。这条钉死:没拉过档,一个字节都不许发。
  it('没拉过档 → 任何写入都不推(不许拿空内存覆盖用户的真档案)', async () => {
    resetAnswersMemory()
    const methods: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init?: { method?: string }) => {
      methods.push(init?.method || 'GET'); return res(200, { ok: true, updatedAt: iso(0) })
    }))
    writeAnswers({ status: 'working' })
    await new Promise((r) => setTimeout(r, 1200))   // 越过 800ms 防抖
    expect(methods).not.toContain('PUT')
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
    for (const [name, def] of Object.entries(getFields())) {
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
