/**
 * points 域的子桶 provinces/mb 的函数 —— 曼尼托巴 MPNP EOI 估分 estimateMbEoi(通用省表装不下,手写)。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

import { POINTS_ERR, fail } from '../../../error'
import { KIND, MONTHS_PER_YEAR, TICK_SEP, bonusPoints, oneGroupOf, rangeGroupOf } from '../../core'
import type { LabelIn, MatchIn, RowsOfOut } from '../../core'
import {
  MB, MB_ADAPT_RE, MB_AGE_BARE, MB_AGE_OR_OLDER, MB_AGE_RANGE, MB_CLB, MB_CTX, MB_CTX_SEP, MB_EDU, MB_EDU_ONE_YEAR,
  MB_EDU_RE, MB_EDU_TWO_YEARS, MB_FACTOR, MB_JOIN, MB_LABEL_NONE, MB_NOTE, MB_NOTE_NONE, MB_RISK_RE, MB_WORK_LESS,
  MB_WORK_WORD, WORD, WORD_NUM,
} from './constants'
import type {
  EstimateMbEoiIn, EstimateMbEoiOut, MbAgePickIn, MbBandsIn, MbBandsOut, MbConnectionPicksIn, MbConnectionPicksOut,
  MbEduReOfIn, MbEduReOfOut, MbLangPickIn, MbLangPickOut, MbMaxPointsIn, MbMaxPointsOut, MbPartIn, MbPartOut, MbPick,
  MbRiskTicksIn, MbRiskTicksOut, MbRowOut, MbRowsOfIn, MbScorePart, MbThresholdRow, MbWorkPickIn, MbWorkYearsOut,
  NeedRowIn, NeedRowOut, ScoreFactor, WordGroup, WordGroupOut,
} from './types'

// =========================================================================
// 1. 正则的具名捕获组
// =========================================================================

/**
 * 读一个捕获拼写单词的正则。
 *
 * @param input 正则与要匹的那段字。
 * @returns 那个单词;没命中则 null。
 */
function wordGroupOf(input: MatchIn): WordGroupOut {
  const m = input.re.exec(input.text)
  if (m == null || m.groups == null) {
    return null
  }
  return m.groups as WordGroup
}

// =========================================================================
// 2. 曼省 EOI
// =========================================================================

/**
 * 档案 → 曼省 EOI 估分。
 *
 * 🔴 曼省**单写一套**,不复用查表估分:语言按每项计分、标签用拼写数字与计数短语、
 * 风险因子的 `factorMax` 是下限 —— 三处都要真改通用引擎,回归面盖到别的省。
 * 完整论证见 `docs/implementation/C5-判定层pathVerdict-20260805.md` §三。
 *
 * **分值一分都不许在这里编**,全部来自官方分值表。
 *
 * @param input 官方分值表全部行与档案。
 * @returns 曼省估分。
 */
export function estimateMbEoi(input: EstimateMbEoiIn): EstimateMbEoiOut {
  const rows: ScoreFactor[] = []
  for (const f of input.factors) {
    if (f.province === MB) {
      rows.push(f)
    }
  }
  const head = rows[0]
  if (head == null) {
    throw fail({ name: POINTS_ERR.name, msg: POINTS_ERR.noMbRows, code: null })
  }
  const one: MbPartIn = { rows: rows, profile: input.profile }
  const parts: MbScorePart[] = [
    mbLanguagePart(one), mbAgePart(one), mbWorkPart(one), mbEduPart(one),
    mbAdaptPart(one), mbRiskPart(one),
  ]
  let raw = 0
  for (const p of parts) {
    raw += p.pts
  }
  let maxTotal = 0
  let capped = raw
  if (head.maxTotal != null) {
    maxTotal = head.maxTotal
    capped = Math.min(raw, head.maxTotal)
  }
  return {
    province: MB, system: head.system, maxTotal: maxTotal, url: head.url,
    guideEffective: head.guideEffective, fetched: head.fetched, parts: parts,
    total: capped,
  }
}

/**
 * 曼省语言那一块:**四项各自查表相加** + 第二官方语言一次性加分。
 *
 * 🔴 这是曼省单写一套的第一条理由:别的省语言是「查一次表 = 总分」,曼省的官方规则行写明
 * 四项各自按同一张表打分后相加(CLB6 单项 20 → 四项 80)。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbLanguagePart(input: MbPartIn): MbPartOut {
  const langRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.language, kind: KIND.row })
  const bands = mbBands({ clb: input.profile.clb })
  let pts = 0
  const hits: ScoreFactor[] = []
  for (const clb of bands) {
    const one = mbLangPick({ rows: langRows, clb: clb })
    pts += one.pts
    hits.push(one.row)
  }
  const lang2Rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.language, kind: KIND.bonus })
  let secondNote = MB_NOTE_NONE
  const lang2 = lang2Rows[0]
  if (input.profile.secondLangClb5Plus && lang2 != null) {
    if (lang2.points != null) {
      pts += lang2.points
    }
    secondNote = `${MB_JOIN.plus}${lang2.label}`
  }
  let max: number | null = null
  const langFirst = langRows[0]
  if (langFirst != null) {
    max = langFirst.factorMax
  }
  let capped = pts
  if (max != null) {
    capped = Math.min(pts, max)
  }
  let firstHitLabel = MB_LABEL_NONE
  if (hits.length > 0 && hits[0] != null) {
    firstHitLabel = hits[0].label
  }
  return {
    factor: MB_FACTOR.language, pts: capped, max: max,
    matched: `${firstHitLabel}${MB_JOIN.times}${bands.length}${secondNote}`,
  }
}

/**
 * 曼省语言单档:阈值取标签里的「CLB N」,就近取「≤ 你的值」里最高的那档。
 *
 * 一档都够不到时退到**最低档**(官方表的最低档本身就是给低分段的,不是没有分)。
 * 返回行上的 `as ScoreFactor` 是既有断言原样保留:官方语言档位行为空的表进不了这条流水线,
 * best 只在空表时才是 null。
 *
 * @param input 语言档位行与这一项的 CLB。
 * @returns 这一项得几分与命中的那一行。
 */
function mbLangPick(input: MbLangPickIn): MbLangPickOut {
  const scored: MbThresholdRow[] = []
  for (const r of input.rows) {
    const hit = oneGroupOf({ re: MB_CLB, text: r.label })
    if (hit == null) {
      continue
    }
    const th = Number(hit.n)
    if (Number.isNaN(th) === false) {
      scored.push({ r: r, th: th })
    }
  }
  let best: MbThresholdRow | null = null
  for (const x of scored) {
    if (x.th > input.clb) {
      continue
    }
    if (best == null || x.th > best.th) {
      best = x
    }
  }
  if (best == null) {
    for (const x of scored) {
      if (best == null || x.th < best.th) {
        best = x
      }
    }
  }
  let pts = 0
  if (best != null && best.r.points != null) {
    pts = best.r.points
  }
  let bestRow: ScoreFactor | null = null
  if (best != null) {
    bestRow = best.r
  }
  return { pts: pts, row: bestRow as ScoreFactor }
}

/**
 * 语言摊平成四项 —— 单一数字表示四项同档。
 *
 * @param input 语言:单一数或四项数组。
 * @returns 四项。
 */
function mbBands(input: MbBandsIn): MbBandsOut {
  const one = input.clb
  if (typeof one === 'number') {
    return [one, one, one, one]
  }
  return [one.reading, one.writing, one.listening, one.speaking]
}

/**
 * 曼省年龄那一块。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbAgePart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.age, kind: KIND.row })
  const row = mbAgePick({ rows: rows, age: input.profile.age })
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  let max: number | null = null
  const rowsFirst = rows[0]
  if (rowsFirst != null) {
    max = rowsFirst.factorMax
  }
  return {
    factor: MB_FACTOR.age, pts: pts, max: max,
    matched: row.label,
  }
}

/**
 * 曼省年龄:裸数字单年档、「21 to 45」区间、「50 or older」开区间三种写法。
 *
 * @param input 年龄档位行与他的年龄。
 * @returns 那一行。
 */
function mbAgePick(input: MbAgePickIn): MbRowOut {
  for (const r of input.rows) {
    const older = oneGroupOf({ re: MB_AGE_OR_OLDER, text: r.label })
    if (older) {
      if (input.age >= Number(older.n)) {
        return r
      }
      continue
    }
    const span = rangeGroupOf({ re: MB_AGE_RANGE, text: r.label })
    if (span) {
      if (input.age >= Number(span.low) && input.age <= Number(span.high)) {
        return r
      }
      continue
    }
    const single = oneGroupOf({ re: MB_AGE_BARE, text: r.label.trim() })
    if (single && input.age === Number(single.n)) {
      return r
    }
  }
  throw fail({
    name: POINTS_ERR.name, msg: `${POINTS_ERR.noAgeRowHead}${input.age}`, code: null,
  })
}

/**
 * 曼省工作年限那一块,含发证机构全面认可的加分。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbWorkPart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.work, kind: KIND.row })
  const row = mbWorkPick({
    rows: rows, years: Math.floor(input.profile.workMonthsSameOcc / MONTHS_PER_YEAR),
  })
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  const bonusRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.work, kind: KIND.bonus })
  let licensedNote = MB_NOTE_NONE
  const bonus = bonusRows[0]
  if (input.profile.employerLicenseRecognized && bonus != null) {
    if (bonus.points != null) {
      pts += bonus.points
    }
    licensedNote = `${MB_JOIN.plus}${bonus.label}`
  }
  let max: number | null = null
  const rowsFirst = rows[0]
  if (rowsFirst != null) {
    max = rowsFirst.factorMax
  }
  let capped = pts
  if (max != null) {
    capped = Math.min(pts, max)
  }
  return {
    factor: MB_FACTOR.work, pts: capped, max: max,
    matched: `${row.label}${licensedNote}`,
  }
}

/**
 * 曼省工作年限:就近取「≤ 你的年数」里最高的那档;一档都够不到退到最低档。
 *
 * @param input 工作年限档位行与他的整年数。
 * @returns 那一行。
 */
function mbWorkPick(input: MbWorkPickIn): MbRowOut {
  const scored: MbThresholdRow[] = []
  for (const r of input.rows) {
    const t = mbWorkYearsOf(r.label)
    if (t != null) {
      scored.push({ r: r, th: t })
    }
  }
  let best: MbThresholdRow | null = null
  for (const x of scored) {
    if (x.th > input.years) {
      continue
    }
    if (best == null || x.th > best.th) {
      best = x
    }
  }
  if (best == null) {
    for (const x of scored) {
      if (best == null || x.th < best.th) {
        best = x
      }
    }
  }
  let bestRow: ScoreFactor | null = null
  if (best != null) {
    bestRow = best.r
  }
  return bestRow as ScoreFactor
}

/**
 * 曼省工作年限档的年数 —— 官方用**拼写数字**(One / Two / Three / Four)。
 *
 * @param label 官方原文。
 * @returns 这一档的年数;读不出则 null。
 */
function mbWorkYearsOf(label: LabelIn): MbWorkYearsOut {
  if (MB_WORK_LESS.test(label)) {
    return 0
  }
  const m = wordGroupOf({ re: MB_WORK_WORD, text: label.trim() })
  if (m == null) {
    return null
  }
  const word = m.word.toLowerCase()
  if (word === WORD.one) {
    return WORD_NUM.one
  }
  if (word === WORD.two) {
    return WORD_NUM.two
  }
  if (word === WORD.three) {
    return WORD_NUM.three
  }
  return WORD_NUM.four
}

/**
 * 曼省学历那一块。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbEduPart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.education, kind: KIND.row })
  const row = needRow({
    rows: rows, re: mbEduReOf({ edu: input.profile.edu }),
    ctx: `${MB_FACTOR.education}${MB_CTX_SEP}${input.profile.edu}`,
  })
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  let max: number | null = null
  const rowsFirst = rows[0]
  if (rowsFirst != null) {
    max = rowsFirst.factorMax
  }
  return {
    factor: MB_FACTOR.education, pts: pts, max: max,
    matched: row.label,
  }
}

/**
 * 曼省学历档对应哪一条官方标签。
 *
 * @param input 学历档。
 * @returns 匹配式。
 */
function mbEduReOf(input: MbEduReOfIn): MbEduReOfOut {
  if (input.edu === MB_EDU.masterOrDoctorate) {
    return MB_EDU_RE.masterOrDoctorate
  }
  if (input.edu === MB_EDU.twoPrograms2yPlus) {
    return MB_EDU_RE.twoPrograms2yPlus
  }
  if (input.edu === MB_EDU.oneProgram3yPlus) {
    return MB_EDU_RE.oneProgram3yPlus
  }
  if (input.edu === MB_EDU.oneProgram2y) {
    return MB_EDU_RE.oneProgram2y
  }
  if (input.edu === MB_EDU.oneYearProgram) {
    return MB_EDU_RE.oneYearProgram
  }
  if (input.edu === MB_EDU.tradeCert) {
    return MB_EDU_RE.tradeCert
  }
  return MB_EDU_RE.none
}

/**
 * 曼省适应性那一块:关系分(可叠、自己封顶)+ 需求分 + 区域分,再按组封顶。
 *
 * 官方语义是 **max(关系 + 区域, 需求)**,不是三者相加封顶。但关系上限 200 + 区域上限 50 = 250
 * 恒小于组上限 500,而需求只有 0 / 500 两档 —— 于是**先加后封顶**与 max(…) 在这个数值结构下
 * **代数等价**(需求 500 时和必被封到 500;需求 0 时和 ≤250 本就摸不到 500)。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbAdaptPart(input: MbPartIn): MbPartOut {
  const adapt = input.profile.adapt
  const connRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.adaptConnection, kind: KIND.row })
  let connPts = 0
  const connHits: string[] = []
  for (const one of mbConnectionPicks({ adapt: adapt })) {
    const r = needRow({ rows: connRows, re: one.re, ctx: one.ctx })
    if (r.points != null) {
      connPts += r.points
    }
    connHits.push(r.label)
  }
  const connFirst = connRows[0]
  let connMax: number | null = null
  if (connFirst != null) {
    connMax = connFirst.factorMax
  }
  if (connMax != null) {
    connPts = Math.min(connPts, connMax)
  }

  const demandRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.adaptDemand, kind: KIND.row })
  let demandPts = 0
  if (adapt.demand) {
    demandPts = mbMaxPoints({ rows: demandRows })
  }
  const regionalRows = mbRowsOf({
    rows: input.rows, factor: MB_FACTOR.adaptRegional, kind: KIND.row,
  })
  const regionalFirst = regionalRows[0]
  let regionalPts = 0
  if (adapt.regionalOutsideWinnipeg && regionalFirst != null && regionalFirst.points != null) {
    regionalPts = regionalFirst.points
  }

  const demandFirst = demandRows[0]
  let groupMax: number | null = null
  if (connFirst != null && connFirst.groupMax != null) {
    groupMax = connFirst.groupMax
  } else if (demandFirst != null && demandFirst.groupMax != null) {
    groupMax = demandFirst.groupMax
  } else if (regionalFirst != null && regionalFirst.groupMax != null) {
    groupMax = regionalFirst.groupMax
  }
  const sum = connPts + demandPts + regionalPts
  const notes: string[] = []
  let demandNote = MB_NOTE_NONE
  if (adapt.demand) {
    demandNote = MB_NOTE.demand
  }
  let regionalNote = MB_NOTE_NONE
  if (adapt.regionalOutsideWinnipeg && regionalFirst != null) {
    regionalNote = regionalFirst.label
  }
  for (const one of [connHits.join(MB_JOIN.semi), demandNote, regionalNote]) {
    if (one) {
      notes.push(one)
    }
  }
  let capped = sum
  if (groupMax != null) {
    capped = Math.min(sum, groupMax)
  }
  return {
    factor: MB_FACTOR.adaptability, pts: capped,
    max: groupMax, matched: notes.join(MB_JOIN.plus),
  }
}

/**
 * 官方表里必须有的那一行 —— **少一行就抛**。
 *
 * 🔴 不静默补 0:官方表改版是要人去改抓取脚本的事,悄悄算出一个少了几百分的结果,
 * 比报错难查得多。
 *
 * @param input 候选行、匹配式与报错时的上下文。
 * @returns 那一行。
 */
function needRow(input: NeedRowIn): NeedRowOut {
  for (const r of input.rows) {
    if (input.re.test(r.label)) {
      return r
    }
  }
  throw fail({
    name: POINTS_ERR.name,
    msg: `${POINTS_ERR.rowMissingHead}${input.ctx}${POINTS_ERR.rowMissingTail}`,
    code: null,
  })
}

/**
 * 关系分要挑哪几条 —— 按档案逐条勾。
 *
 * 在曼省读书那一格是**互斥的两档**(两年及以上 / 一年),不是可叠加的两条。
 *
 * @param input 适应性那几格。
 * @returns 要挑的那几条。
 */
function mbConnectionPicks(input: MbConnectionPicksIn): MbConnectionPicksOut {
  const a = input.adapt
  const out: MbPick[] = []
  const head = MB_FACTOR.adaptConnection + MB_CTX_SEP
  if (a.closeRelative) {
    out.push({ re: MB_ADAPT_RE.closeRelative, ctx: head + MB_CTX.closeRelative })
  }
  if (a.priorMbWork6moPlus) {
    out.push({ re: MB_ADAPT_RE.priorWork, ctx: head + MB_CTX.priorWork })
  }
  if (a.mbEduYears === MB_EDU_TWO_YEARS) {
    out.push({ re: MB_ADAPT_RE.edu2y, ctx: head + MB_CTX.edu2y })
  } else if (a.mbEduYears === MB_EDU_ONE_YEAR) {
    out.push({ re: MB_ADAPT_RE.edu1y, ctx: head + MB_CTX.edu1y })
  }
  if (a.closeFriendOrDistantRelative) {
    out.push({ re: MB_ADAPT_RE.friend, ctx: head + MB_CTX.friend })
  }
  return out
}

/**
 * 这几行里最高的那个分。
 *
 * @param input 那几行。
 * @returns 最高分;一行都没有则负无穷(与老件同口径,调用方已保证非空)。
 */
function mbMaxPoints(input: MbMaxPointsIn): MbMaxPointsOut {
  let top = -Infinity
  for (const r of input.rows) {
    let p = 0
    if (r.points != null) {
      p = r.points
    }
    if (p > top) {
      top = p
    }
  }
  return top
}

/**
 * 曼省风险扣分那一块。
 *
 * 🔴 两条都是**负分**,互不排斥按加总计;`factorMax` 是 -200,那是**下限(floor)不是上限** ——
 * 所以这里封顶用 `Math.max` 不是 `Math.min`。这是曼省单写一套的第三条理由。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbRiskPart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.risk, kind: KIND.bonus })
  const prefix = `${MB}${TICK_SEP}${MB_FACTOR.risk}`
  let pts = bonusPoints({
    list: rows, prefix: prefix, ticks: mbRiskTicks({ rows: rows, profile: input.profile }),
  })
  const riskFirst = rows[0]
  let floor: number | null = null
  if (riskFirst != null) {
    floor = riskFirst.factorMax
  }
  if (floor != null) {
    pts = Math.max(pts, floor)
  }
  const notes: string[] = []
  if (input.profile.riskForeignWork) {
    notes.push(MB_NOTE.foreignWork)
  }
  if (input.profile.riskForeignStudy) {
    notes.push(MB_NOTE.foreignStudy)
  }
  return {
    factor: MB_FACTOR.risk, pts: pts, max: floor, matched: notes.join(MB_JOIN.plus),
  }
}

/**
 * 按因素与种类挑曼省的行。
 *
 * @param input 曼省全部行、因素名与种类。
 * @returns 那几行,保持原序。
 */
function mbRowsOf(input: MbRowsOfIn): RowsOfOut {
  const out: ScoreFactor[] = []
  for (const r of input.rows) {
    if (r.factor === input.factor && r.kind === input.kind) {
      out.push(r)
    }
  }
  return out
}

/**
 * 风险那两条按档案勾上。
 *
 * @param input 风险那几行与档案。
 * @returns 勾选状态。
 */
function mbRiskTicks(input: MbRiskTicksIn): MbRiskTicksOut {
  const ticks: Record<string, boolean> = {}
  const prefix = `${MB}${TICK_SEP}${MB_FACTOR.risk}${TICK_SEP}`
  for (const [i, row] of input.rows.entries()) {
    const label = row.label
    if (MB_RISK_RE.foreignWork.test(label) && input.profile.riskForeignWork) {
      ticks[`${prefix}${i}`] = true
    }
    if (MB_RISK_RE.foreignStudy.test(label) && input.profile.riskForeignStudy) {
      ticks[`${prefix}${i}`] = true
    }
  }
  return ticks
}
