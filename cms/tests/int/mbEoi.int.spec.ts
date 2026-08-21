// C5a-2 · MPNP EOI 估分器测试。
// fixture 不手抄:直接读 data/mart/pnp_score_factors.json 过滤 province=MB(C4 入库的 44 行真数据),
// 库里改版这里立刻感知得到(手抄的 fixture 感知不到)。
//
// 金标 = 案例 C01 §二曼省节(docs/design/案例C01-马龙木匠路径-路径分析-20260805.md,一个数都不许改):
// 40 岁、CLB6(四项)、两年制大专、外省(安省)学习、曼省工作 12 个月、适应性满档(500)
// → 695 = 语言80 + 年龄75 + 工作40 + 学历100 + 适应性500 − 外省学习100
// → 再叠外省(渥太华)工作 → −100 = 595(风险扣分合计封顶 −200)
// → 语言拉到 CLB8 → 只多 20 分 → 天花板 715
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { estimateMbEoi as pointsMb, type MbProfile, type ScoreFactor } from '@/lib/points'

/** 垫片:金标沿用位置参数,分值域收对象参数(换实现时用例一个字不动) */
function estimateMbEoi(factors: ScoreFactor[], profile: MbProfile) {
  return pointsMb({ factors: factors, profile: profile })
}


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const martPath = path.resolve(__dirname, '../../../data/mart/pnp_score_factors.json')
const allFactors: ScoreFactor[] = JSON.parse(fs.readFileSync(martPath, 'utf8'))
const mbRows = allFactors.filter((f) => f.province === 'MB')

describe('MB 行数据实况(改版会先在这里炸,而不是在金标断言里猜)', () => {
  it('C4 入库的 44 行都在,八个 factor 齐活', () => {
    expect(mbRows).toHaveLength(44)
    const names = new Set(mbRows.map((r) => r.factor))
    expect(names).toEqual(new Set(['language', 'age', 'work', 'education', 'adaptConnection', 'adaptDemand', 'adaptRegional', 'risk']))
  })
  it('kind=rule 的注释行不参与打分(points 为 null,estimateMbEoi 靠 kind 过滤天然跳过)', () => {
    const ruleRows = mbRows.filter((r) => r.kind === 'rule')
    expect(ruleRows.length).toBeGreaterThan(0)
    for (const r of ruleRows) expect(r.points).toBeNull()
  })
})

// 案例 C01 曼省节:木匠,外省(安省)学习 + 曼省工作 12 个月(职业获雇主/发证机构认可)达成 adaptDemand 满分
const goldBase = (): MbProfile => ({
  clb: 6,
  secondLangClb5Plus: false,
  age: 40,
  workMonthsSameOcc: 12,
  employerLicenseRecognized: false,
  edu: 'oneProgram2y',
  adapt: {
    demand: true, closeRelative: false, priorMbWork6moPlus: false,
    mbEduYears: 0, closeFriendOrDistantRelative: false, regionalOutsideWinnipeg: false,
  },
  riskForeignWork: false,
  riskForeignStudy: true,   // 安省学习
})

describe('金标:案例 C01 曼省节(逐项核对)', () => {
  it('695 = 语言80 + 年龄75 + 工作40 + 学历100 + 适应性500 − 外省学习100', () => {
    const r = estimateMbEoi(allFactors, goldBase())
    const p = (f: string) => r.parts.find((x) => x.factor === f)!
    expect(p('language').pts).toBe(80)
    expect(p('age').pts).toBe(75)
    expect(p('work').pts).toBe(40)
    expect(p('education').pts).toBe(100)
    expect(p('adaptability').pts).toBe(500)
    expect(p('risk').pts).toBe(-100)
    expect(r.total).toBe(695)
  })

  it('再叠外省(渥太华)工作过 → 再 −100 = 595;风险扣分合计封顶 −200', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), riskForeignWork: true })
    const p = (f: string) => r.parts.find((x) => x.factor === f)!
    expect(p('risk').pts).toBe(-200)
    expect(p('risk').max).toBe(-200)
    expect(r.total).toBe(595)
  })

  it('语言拉到 CLB8 → 只多 20 分,天花板 715', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), clb: 8 })
    const p = (f: string) => r.parts.find((x) => x.factor === f)!
    expect(p('language').pts).toBe(100)   // 25 × 4
    expect(r.total).toBe(715)
  })

  it('matched 字段带得出官方原文标签,供 UI 让用户核对', () => {
    const r = estimateMbEoi(allFactors, goldBase())
    const p = (f: string) => r.parts.find((x) => x.factor === f)!
    expect(p('language').matched).toContain('CLB 6')
    expect(p('age').matched).toBe('21 to 45')
    expect(p('work').matched).toBe('One year')
    expect(p('education').matched).toBe('One post-secondary program of two years')
  })
})

describe('风险扣分:负分 bonus + 下限(floor)不是上限', () => {
  it('单条触发只扣该条分值,不会被 factorMax 误拉到 -200(sign-aware 封顶的核心断言)', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), riskForeignStudy: true, riskForeignWork: false })
    expect(r.parts.find((x) => x.factor === 'risk')!.pts).toBe(-100)
  })
  it('都不触发时风险为 0', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), riskForeignStudy: false, riskForeignWork: false })
    expect(r.parts.find((x) => x.factor === 'risk')!.pts).toBe(0)
  })
  it('真实两条 bonus 行加总恰好摸到 -200 下限;合成第三条负分行让合计超过 -200 时,floor 仍要把它夹住' +
     '(证明 Math.max 分支本身在起作用,不是「两条数据凑巧等于 -200」的巧合)', () => {
    const dup: ScoreFactor = {
      ...mbRows.find((r) => r.factor === 'risk' && r.kind === 'bonus' && /studies/i.test(r.label))!,
      seq: 2, label: 'Studies in another province (duplicate, test-only)', points: -100,
    }
    const factorsWithExtra = [...allFactors, dup]
    // 真实两条(工作 -100 + 学习 -100)+ 合成重复的「学习」行也会被同一条件勾中(标签同样含
    // "studies in another province" 子串)→ 理论加总 -300,超过下限 -200
    const r = estimateMbEoi(factorsWithExtra, { ...goldBase(), riskForeignWork: true, riskForeignStudy: true })
    expect(r.parts.find((x) => x.factor === 'risk')!.pts).toBe(-200)
  })
})

describe('适应性:connection(≤200)+ regional(≤50) 可叠、与 demand(500) 不叠,组上限 500', () => {
  const p = (over: Partial<MbProfile['adapt']>): MbProfile => ({ ...goldBase(), riskForeignStudy: false, adapt: { ...goldBase().adapt, demand: false, ...over } })

  it('仅 connection(close relative 200)+ regional(50) = 250,不封顶', () => {
    const r = estimateMbEoi(allFactors, p({ closeRelative: true, regionalOutsideWinnipeg: true }))
    expect(r.parts.find((x) => x.factor === 'adaptability')!.pts).toBe(250)
  })

  it('connection 200 + regional 50 + demand 500 = 理论和 750,组上限封到 500(不是相加)', () => {
    const r = estimateMbEoi(allFactors, p({ closeRelative: true, regionalOutsideWinnipeg: true, demand: true }))
    const part = r.parts.find((x) => x.factor === 'adaptability')!
    expect(part.pts).toBe(500)
    expect(part.max).toBe(500)
  })

  it('connection 单项累加会被 connection 自己的 factorMax(200)先封顶,再进组上限', () => {
    // 直系亲属200 + 曼省工作经历100 + 好友/远亲50 = 350,先被 connection 的 factorMax=200 封顶
    const r = estimateMbEoi(allFactors, p({ closeRelative: true, priorMbWork6moPlus: true, closeFriendOrDistantRelative: true }))
    expect(r.parts.find((x) => x.factor === 'adaptability')!.pts).toBe(200)
  })

  it('什么都没有 → 适应性 0', () => {
    const r = estimateMbEoi(allFactors, p({}))
    expect(r.parts.find((x) => x.factor === 'adaptability')!.pts).toBe(0)
  })
})

describe('语言按单项 CLB 计分(四项可各自不同档)', () => {
  it('四项不同档时逐项相加,不是取平均或取最低', () => {
    // 阅读CLB8(25) + 写作CLB6(20) + 听力CLB7(22) + 口语CLB4(12) = 79
    const r = estimateMbEoi(allFactors, {
      ...goldBase(), clb: { reading: 8, writing: 6, listening: 7, speaking: 4 },
    })
    expect(r.parts.find((x) => x.factor === 'language')!.pts).toBe(79)
  })
  it('第二官方语言 CLB≥5 一次性加 25,不按项乘', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), secondLangClb5Plus: true })
    expect(r.parts.find((x) => x.factor === 'language')!.pts).toBe(80 + 25)
  })
})

describe('工作年限:拼写数字标签(One/Two/Three/Four years),月数向下取整年', () => {
  it('18 个月仍算「One year」档(未满两整年)', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), workMonthsSameOcc: 18 })
    expect(r.parts.find((x) => x.factor === 'work')!.matched).toBe('One year')
  })
  it('不足 12 个月落「Less than one year」档,0 分', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), workMonthsSameOcc: 6 })
    expect(r.parts.find((x) => x.factor === 'work')!.pts).toBe(0)
  })
  it('雇主/发证机构全面认可 → 额外 +100(work 自己的 bonus 行)', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), employerLicenseRecognized: true })
    expect(r.parts.find((x) => x.factor === 'work')!.pts).toBe(140)
  })
})

describe('年龄:裸数字单年档 + "50 or older" 开区间', () => {
  it('50 岁及以上归入 "50 or older"(0 分)', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), age: 55 })
    expect(r.parts.find((x) => x.factor === 'age')!.matched).toBe('50 or older')
    expect(r.parts.find((x) => x.factor === 'age')!.pts).toBe(0)
  })
  it('46-49 岁是逐年单独档,不落在 "21 to 45" 区间', () => {
    const r = estimateMbEoi(allFactors, { ...goldBase(), age: 47 })
    expect(r.parts.find((x) => x.factor === 'age')!.pts).toBe(30)
  })
})

describe('总分不超过 maxTotal(1000)', () => {
  it('total 挂官方 maxTotal 封顶', () => {
    const r = estimateMbEoi(allFactors, goldBase())
    expect(r.maxTotal).toBe(1000)
    expect(r.total).toBeLessThanOrEqual(1000)
  })
})
