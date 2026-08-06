// C5a-2 · MPNP EOI 估分器(曼省)。
// docs/implementation/C5-判定层pathVerdict-20260805.md §三:MPNP 优先走 scoreProvince(pnpSelfScore.ts,
// BC/SK/ON 查表估分先例)泛化;吃不动 MB 表才单写本文件。**判断结论:吃不动,单写。**判断依据如下——
//
// ① 语言按「每项 CLB」计分,不是「查一次总分」:MB 表 rule 行原文写明「阅读/写作/听力/口语四项各自
//    按本表同一档打分后相加」(CLB6 单项 20 → 四项 80)。scoreProvince 的 AUTO_PICK['language'] 用
//    pickByThreshold() 只返回**一条**命中行的 points,BC/SK/ON 的语言就是「一次查表 = 总分」——
//    要让同一个 AUTO_PICK 键在 MB 分支里 ×4,得把「单行=总分」的假设打个洞,牵连三省已锁的分档。
// ② 标签词汇体系完全不同,现成的正则解析器一个都吃不进:
//    - work:MB 用拼写数字「One year / Two years / Three years / Four years or more」,
//      pnpSelfScore.yearsOf() 只认阿拉伯数字(`\d+\s*years?`),连「One year」都匹配不上;
//    - age:MB 是裸数字单年档「18」「19」...「46」...「50 or older」,
//      pnpSelfScore.ageRangeOf() 认「N – M years」/「less than/more than N」,「50 or older」
//      和裸数字「46」都不在它的语法里;
//    - education:MB 是「两个 2 年制」「一个 3 年制」这类计数+学制组合短语,跟 EDU_LADDER 的关键词
//      阶梯(bachelor/master/associate…)完全不搭,110/115 这两档甚至没法塞进现有 EduKey 枚举。
//    四个可比对因素没有一个能直接吃通用解析器;硬改 yearsOf/ageRangeOf/EDU_LADDER 是在为一个省
//    的词汇表改所有省共用的正则,回归面盖到 BC/SK/ON。
// ③ risk 因子 factorMax=-200 是**下限**(floor)不是上限:scoreProvince 现有封顶
//    `Math.min(pts, max || pts)` 只对正向上限成立(pts 不超过 max);对负数 max,
//    `Math.min(-100, -200)` 会算出 -200(封死),`Math.min(-100, -200)` 在 pts=-100(只触发一条)时
//    错误地把它拉到 -200——符号感知封顶(负 max 用 Math.max)是本文件才需要的分支,BC/SK/ON 都不会走到。
//
// 巧合可复用的一点:适应性三因子共享 group='adaptability'、groupMax=500,官方语义是
// **max(connection+regional, demand)**,不是把三者相加封顶。但 connection 上限 200 + regional 上限 50
// = 250 恒小于 500,demand 本身只有 0/500 两档(非连续值)——sum-then-cap(500) 与 max(...) 在这个
// 数值结构下**代数等价**(demand=500 时 sum≥500 必被封到 500;demand=0 时 sum=connection+regional≤250
// 本就摸不到 500 的封顶)。scoreProvince 的分组求和逻辑因此对 MB 这一块恰好是对的,但这单独一点
// 不足以支撑复用整个引擎(①②③ 三处都要真改)。
//
// 不变的铁律:分值一分都不许在这里编,全部来自 pnp_score_factors(province='MB')的 points 字段——
// 本文件只负责「挑对哪一行 / 按官方 rule 字段已写明的规则组合」。

import type { ScoreFactor } from './pnpSelfScore'
import { bonusPoints } from './pnpSelfScore'

export type MbEduKey =
  | 'masterOrDoctorate'
  | 'twoPrograms2yPlus'
  | 'oneProgram3yPlus'
  | 'oneProgram2y'
  | 'oneYearProgram'
  | 'tradeCert'
  | 'none'

export type MbAdaptInput = {
  demand: boolean                        // 曼省持续就业6月+长期offer,或战略计划 ITA(二选一即满分,不叠加)
  closeRelative: boolean                 // 曼省有直系亲属(200)
  priorMbWork6moPlus: boolean            // 曾在曼省 authorized 工作 6 月+(100)
  mbEduYears: 0 | 1 | 2                  // 在曼省完成的学制年数档(2=完成2年+/1=完成1年/0=无)
  closeFriendOrDistantRelative: boolean  // 曼省有好友或远亲(50)
  regionalOutsideWinnipeg: boolean       // 移民目的地在温尼伯以外(50)
}

export type MbProfile = {
  clb: number | [number, number, number, number]  // 单一数 = 四项同档;数组 = 阅读/写作/听力/口语分别给
  secondLangClb5Plus: boolean            // 第二官方语言总体 CLB≥5(一次性 +25,不按项乘)
  age: number
  workMonthsSameOcc: number              // 同职业曼省(或官方认可)工作月数
  employerLicenseRecognized: boolean     // 该职业已获省内发证/监管机构全面认可(work 加分 +100)
  edu: MbEduKey
  adapt: MbAdaptInput
  riskForeignWork: boolean               // 有外省工作经历(-100)
  riskForeignStudy: boolean              // 有外省学习经历(-100)
}

export type MbScorePart = { factor: string; pts: number; max: number | null; matched: string }
export type MbEoiScore = {
  province: 'MB'; system: string; maxTotal: number
  url: string; guideEffective: string; fetched: string
  parts: MbScorePart[]; total: number
}

const rowsOf = (rows: ScoreFactor[], factor: string, kind: 'row' | 'bonus' = 'row') =>
  rows.filter((r) => r.factor === factor && r.kind === kind)

const need = (rows: ScoreFactor[], re: RegExp, ctx: string): ScoreFactor => {
  const hit = rows.find((r) => re.test(r.label))
  if (!hit) throw new Error(`MB score row missing for ${ctx}(检查 pnp_score_factors 是否改版)`)
  return hit
}

/** 语言单档:「CLB N or higher/or lower/纯数字」,阈值取标签里第一个数字,就近取「≤你的值」里最高档 */
function langPick(rows: ScoreFactor[], clb: number): { pts: number; row: ScoreFactor } {
  const scored = rows.map((r) => ({ r, th: Number(/CLB\s*(\d+)/i.exec(r.label)?.[1]) })).filter((x) => !Number.isNaN(x.th))
  const ok = scored.filter((x) => x.th <= clb)
  const best = ok.length ? ok.reduce((a, b) => (b.th > a.th ? b : a)) : scored.reduce((a, b) => (b.th < a.th ? b : a))
  return { pts: best.r.points ?? 0, row: best.r }
}

/** 年龄:裸数字单年档("18".."49") / "21 to 45" 区间 / "50 or older" 开区间 */
function agePick(rows: ScoreFactor[], age: number): ScoreFactor {
  for (const r of rows) {
    const older = /(\d+)\s*or older/i.exec(r.label)
    if (older) { if (age >= Number(older[1])) return r; continue }
    const range = /(\d+)\s*to\s*(\d+)/i.exec(r.label)
    if (range) { if (age >= Number(range[1]) && age <= Number(range[2])) return r; continue }
    const single = /^(\d+)$/.exec(r.label.trim())
    if (single && age === Number(single[1])) return r
  }
  throw new Error(`no MB age row for age=${age}`)
}

/** 工作年限:MB 用拼写数字(One/Two/Three/Four years),向下取整年后就近取「≤你的年数」里最高档 */
const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
function workPick(rows: ScoreFactor[], years: number): ScoreFactor {
  const th = (label: string): number | null => {
    if (/less than one/i.test(label)) return 0
    const m = /^(one|two|three|four)\b/i.exec(label.trim())
    return m ? WORD_NUM[m[1].toLowerCase()] : null
  }
  const scored = rows.map((r) => ({ r, t: th(r.label) })).filter((x): x is { r: ScoreFactor; t: number } => x.t != null)
  const ok = scored.filter((x) => x.t <= years)
  return (ok.length ? ok.reduce((a, b) => (b.t > a.t ? b : a)) : scored.reduce((a, b) => (b.t < a.t ? b : a))).r
}

const EDU_RE: Record<MbEduKey, RegExp> = {
  masterOrDoctorate: /master|doctorate/i,
  twoPrograms2yPlus: /two post-secondary programs/i,
  oneProgram3yPlus: /one post-secondary program of three years or more/i,
  oneProgram2y: /one post-secondary program of two years/i,
  oneYearProgram: /one-year post-secondary program/i,
  tradeCert: /trade certificate/i,
  none: /no formal post-secondary/i,
}

export function estimateMbEoi(allFactors: ScoreFactor[], profile: MbProfile): MbEoiScore {
  const rows = allFactors.filter((f) => f.province === 'MB')
  if (!rows.length) throw new Error('no MB rows in pnp_score_factors')
  const head = rows[0]
  const parts: MbScorePart[] = []

  // ── 语言:四项各自查表相加 + 第二官方语言一次性加分 ──
  const langRows = rowsOf(rows, 'language', 'row')
  const bands = Array.isArray(profile.clb) ? profile.clb : [profile.clb, profile.clb, profile.clb, profile.clb]
  let langPts = 0
  const langHits: ScoreFactor[] = []
  for (const clb of bands) { const { pts, row } = langPick(langRows, clb); langPts += pts; langHits.push(row) }
  const lang2 = rowsOf(rows, 'language', 'bonus')[0]
  if (profile.secondLangClb5Plus && lang2) langPts += lang2.points ?? 0
  const langMax = langRows[0]?.factorMax ?? null
  parts.push({
    factor: 'language', pts: Math.min(langPts, langMax ?? langPts), max: langMax,
    matched: `${langHits[0]?.label ?? ''} × ${bands.length}${profile.secondLangClb5Plus && lang2 ? ` + ${lang2.label}` : ''}`,
  })

  // ── 年龄 ──
  const ageRows = rowsOf(rows, 'age', 'row')
  const ageRow = agePick(ageRows, profile.age)
  parts.push({ factor: 'age', pts: ageRow.points ?? 0, max: ageRows[0]?.factorMax ?? null, matched: ageRow.label })

  // ── 工作年限 + 雇主/发证机构全面认可加分 ──
  const workRows = rowsOf(rows, 'work', 'row')
  const wRow = workPick(workRows, Math.floor(profile.workMonthsSameOcc / 12))
  let workPts = wRow.points ?? 0
  const workBonusRow = rowsOf(rows, 'work', 'bonus')[0]
  if (profile.employerLicenseRecognized && workBonusRow) workPts += workBonusRow.points ?? 0
  const workMax = workRows[0]?.factorMax ?? null
  parts.push({
    factor: 'work', pts: Math.min(workPts, workMax ?? workPts), max: workMax,
    matched: `${wRow.label}${profile.employerLicenseRecognized && workBonusRow ? ` + ${workBonusRow.label}` : ''}`,
  })

  // ── 学历 ──
  const eduRows = rowsOf(rows, 'education', 'row')
  const eduRow = need(eduRows, EDU_RE[profile.edu], `education:${profile.edu}`)
  parts.push({ factor: 'education', pts: eduRow.points ?? 0, max: eduRows[0]?.factorMax ?? null, matched: eduRow.label })

  // ── 适应性:connection(≤200)+ regional(≤50)可叠、与 demand(500)不叠,组上限 500 ──
  // 证明见文件头注:demand 只有 0/500 两档、connection+regional 上限恒 ≤250 < 500,
  // 三项各自按 factorMax 封顶后相加、group 再按 groupMax(500) 封顶,数值上与 max(...) 等价。
  const connRows = rowsOf(rows, 'adaptConnection', 'row')
  let connPts = 0
  const connHits: string[] = []
  if (profile.adapt.closeRelative) {
    const r = need(connRows, /close relative in manitoba/i, 'adaptConnection:closeRelative'); connPts += r.points ?? 0; connHits.push(r.label)
  }
  if (profile.adapt.priorMbWork6moPlus) {
    const r = need(connRows, /previous authorized work experience/i, 'adaptConnection:priorWork'); connPts += r.points ?? 0; connHits.push(r.label)
  }
  if (profile.adapt.mbEduYears === 2) {
    const r = need(connRows, /completed post-secondary program in manitoba \(two years or more\)/i, 'adaptConnection:edu2y'); connPts += r.points ?? 0; connHits.push(r.label)
  } else if (profile.adapt.mbEduYears === 1) {
    const r = need(connRows, /completed post-secondary program in manitoba \(one year\)/i, 'adaptConnection:edu1y'); connPts += r.points ?? 0; connHits.push(r.label)
  }
  if (profile.adapt.closeFriendOrDistantRelative) {
    const r = need(connRows, /close friend or distant relative/i, 'adaptConnection:friend'); connPts += r.points ?? 0; connHits.push(r.label)
  }
  const connMax = connRows[0]?.factorMax ?? null
  connPts = Math.min(connPts, connMax ?? connPts)

  const demandRows = rowsOf(rows, 'adaptDemand', 'row')
  const demandPts = profile.adapt.demand ? Math.max(...demandRows.map((r) => r.points ?? 0)) : 0

  const regionalRows = rowsOf(rows, 'adaptRegional', 'row')
  const regionalPts = profile.adapt.regionalOutsideWinnipeg ? (regionalRows[0]?.points ?? 0) : 0

  const adaptGroupMax = connRows[0]?.groupMax ?? demandRows[0]?.groupMax ?? regionalRows[0]?.groupMax ?? null
  const adaptSum = connPts + demandPts + regionalPts
  const adaptTotal = adaptGroupMax == null ? adaptSum : Math.min(adaptSum, adaptGroupMax)
  parts.push({
    factor: 'adaptability', pts: adaptTotal, max: adaptGroupMax,
    matched: [connHits.join('; '), profile.adapt.demand ? 'Manitoba Demand' : '', profile.adapt.regionalOutsideWinnipeg ? (regionalRows[0]?.label ?? '') : '']
      .filter(Boolean).join(' + '),
  })

  // ── 风险扣分:两条 bonus 行都是负分、互不排斥按加总计(rule 行已注明);factorMax=-200 是下限(floor)。
  // bonusPoints() 本身对符号无感知(纯求和),真正需要符号感知的是这里的封顶方向:Math.max 不是 Math.min。
  const riskBonus = rowsOf(rows, 'risk', 'bonus')
  const ticks: Record<string, boolean> = {}
  riskBonus.forEach((r, i) => {
    if (/work experience in another province/i.test(r.label) && profile.riskForeignWork) ticks[`MB:risk:${i}`] = true
    if (/studies in another province/i.test(r.label) && profile.riskForeignStudy) ticks[`MB:risk:${i}`] = true
  })
  let riskPts = bonusPoints(riskBonus, 'MB:risk', ticks)
  const riskMax = riskBonus[0]?.factorMax ?? null   // -200:负数=下限,不是上限
  if (riskMax != null) riskPts = Math.max(riskPts, riskMax)
  parts.push({
    factor: 'risk', pts: riskPts, max: riskMax,
    matched: [profile.riskForeignWork ? 'Work experience in another province' : '', profile.riskForeignStudy ? 'Studies in another province' : '']
      .filter(Boolean).join(' + '),
  })

  const rawTotal = parts.reduce((s, p) => s + p.pts, 0)
  const total = head.maxTotal == null ? rawTotal : Math.min(rawTotal, head.maxTotal)
  return { province: 'MB', system: head.system, maxTotal: head.maxTotal ?? 0, url: head.url, guideEffective: head.guideEffective, fetched: head.fetched, parts, total }
}
