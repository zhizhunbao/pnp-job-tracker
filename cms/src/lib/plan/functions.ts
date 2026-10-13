/**
 * 路径规划域的行为:初评排序(#307 唯一的尺)、方案计算器(C3)、政策时间线取数。
 * 🔴 本文件**不 import payload**(池由调用方注进来,拍板③)。
 *
 * 方案计算器的四条红线(比功能更重要,改代码前先读):
 *  ① **不许编时长。** 库里没有的一律 months=null,并说清是「官方不公布」还是「本站未收录」——
 *     四态原样带出,绝不折成 0。凡是本层算出的数字,都必须有 evidence.url 撑着;
 *     出处没了,这一段就判不可用(stepOf 的出处闸),**不许静默沿用**。
 *  ② **不做概率、不做成功率预测。** draw 段只回答「官方多久开一轮」(历史平均间隔,可核验),
 *     **永不回答「你要等几轮才被抽中」**。谁想加 chanceOfInvite 之类字段,先回来读这段。
 *  ③ **金额不做结论性差额。** 官方规费与中介报价是两个口径,并列摆出、**绝不相减**、
 *     绝不出 saved 字段 —— 两个数根本不在同一个口径上(中介费里含不含规费?我们不知道)。
 *  ④ **只出结构化 Plan,不生成自然语言。** 措辞归上层(渲染/LLM 复述),计算归这里;
 *     basis/why 的模板在 constants(字符串表;prompts 只放与 AI 交互的内容,2026-08-22 拍板)。
 * 纯函数、无 IO、前后端同构:同一份输入永远出同一份 Plan —— 可测、可复现、可对账。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */

import { count, queryRows, queryRowsOrEmpty, SQL, numOrNull, text } from '../db'
import { DAY_MS } from '@/lib/time'
import type { Db } from '../db'
import {
  AV, BAND_A, BAND_NONE, BAND_Y, BAND_Z, BASIS_NONE, CADENCE_FACTOR, CERT, CMP, DATE10_LEN, DATE_NONE, DAYS_PER_MONTH,
  DAYS_PER_WEEK, DRAW_ROWS_MIN, GROUP_SEP, MONTHS_PER_YEAR, NA_TEXT, NOT_TIME_CONVERTIBLE, PLAN_NOTES,
  PLAN_TEXT, PROCESSING_KEY, PROV_FED, PROV_RE, RANK_OK, RANK_QUOTA, RANK_STATUSES, ROUND_TENTHS_SCALE, SLOT_NONE, SPACE, STEP,
  SUBJECT_EMPLOYER,
  TEXT_NONE, THIN_MIN, TV, UNIT_HEADS, WHY_NONE,
} from './constants'
import { fill } from '../template'
import type {
  Availability, ComparisonsIn, CoversCell, DaysIn, DecoratedRows, DrawRankDbRow, DrawRow, MaybeNum, MaybeOutside,
  MonthsIn, OpsMetric, OutsideIn, Plan, PlanBlockers, PlanComparisons, PlanIn, PlanPath, PlanPathInput, PlanStep,
  PlanSteps, RankableRow, RankedRows, RankIn, ThresholdRows, TimelineOut, StreamsCell, TlCovers, TlEvent, TlRank, TlStatus, TlStreams, Row,
  TimeLike,
  DecoratedRow,
} from './types'
// =========================================================================
// 1. 初评排序(#307;八键次序全部 Frank 逐条拍板,见 callbacks.byPlanOrder)
// =========================================================================

/**
 * 主排序:输入 = 引擎序(pathVerdict 原样,区域线已拆省、竞争比已挂),输出 = 展示序。
 * 服务端排完序下发,客户端只渲染不再重排;省外提示与主排序共用同一把尺(#302)。
 *
 * @param input 行与上下文。
 * @returns 展示序的行。
 */
export function rankRows<T extends RankableRow>(input: RankIn<T>): RankedRows<T> {
  const ranked = decorate(input)
  ranked.sort(byPlanOrder)
  const out: RankedRows<T> = []
  for (const d of ranked) {
    out.push(d.row)
  }
  return out
}

/**
 * 装饰:判据全部先算好挂上(band 首现定档 —— 引擎输出本身按障碍难度排,首现即档位次序)。
 *
 * @param input 行与上下文。
 * @returns 装饰行。
 */
function decorate<T extends RankableRow>(input: RankIn<T>): DecoratedRows<T> {
  const bandRank = new Map<string, number>()
  for (const row of input.rows) {
    const k = bandOf(row)
    if (bandRank.has(k) === false) {
      bandRank.set(k, bandRank.size)
    }
  }
  const out: DecoratedRows<T> = []
  for (const [i, row] of input.rows.entries()) {
    const n = input.ctx.jobsOf(row)
    let band = 0
    const hit = bandRank.get(bandOf(row))
    if (hit != null) {
      band = hit
    }
    let ratio = Number.POSITIVE_INFINITY
    if (row.competition != null) {
      ratio = row.competition.ratio
    }
    out.push({
      row: row, i: i, band: band, n: n,
      home: PROV_RE.test(row.province) && input.ctx.homeProvs.has(row.province),
      ratio: ratio,
      sunk: row.availability !== AV.ok || row.belowLine,
      zero: n === 0,
      thin: n == null || n < THIN_MIN,
    })
  }
  return out
}

/**
 * 一行的档位键:availability/belowLine/verdict/blockedBy/tier 五样拼串。
 *
 * @param row 通道行。
 * @returns 档位键。
 */
function bandOf(row: RankableRow): string {
  let avail: string = BAND_A
  if (row.availability !== AV.ok) {
    avail = BAND_Y
  }
  let below: string = BAND_A
  if (row.belowLine) {
    below = BAND_Z
  }
  let blocked = BAND_NONE
  if (row.blockedBy != null) {
    blocked = row.blockedBy
  }
  let tier = BAND_NONE
  if (row.tier != null) {
    tier = String(row.tier)
  }
  return avail + GROUP_SEP + below + GROUP_SEP + row.verdict + GROUP_SEP + blocked + GROUP_SEP + tier
}

/**
 * 省外提示(#302/#303):与主排序**同一把尺**(byPlanOrder 全量,含 0 岗/thin/本省/竞争比)。
 * 只在省外候选严格排在场内第一名之前、且自身不是空盘/薄盘、且竞争比有数时才提;
 * 判据不再只比档位 —— 竞争比与地理成本都参与。措辞层拿 insideBest 摆对照。
 *
 * @param input 全量行、目标省与上下文。
 * @returns 候选与场内第一名;提不出则 null。
 */
export function pickOutside<T extends RankableRow>(input: OutsideIn<T>): MaybeOutside<T> {
  if (input.targets.length === 0) {
    return null
  }
  const ranked = decorate({ rows: input.rows, ctx: input.ctx })
  ranked.sort(byPlanOrder)
  let insideIdx = -1
  let insideBest: T | null = null
  for (const [i, d] of ranked.entries()) {
    if (input.targets.includes(d.row.province)) {
      insideIdx = i
      insideBest = d.row
      break
    }
  }
  for (const [i, d] of ranked.entries()) {
    if (insideIdx >= 0 && i >= insideIdx) {
      break
    }
    if (PROV_RE.test(d.row.province) === false || input.targets.includes(d.row.province)) {
      continue
    }
    if (d.n === 0 || d.n == null || d.n < THIN_MIN) {
      continue
    }
    if (Number.isFinite(d.ratio) === false) {
      continue
    }
    return { row: d.row, insideBest: insideBest }
  }
  return null
}

// =========================================================================
// 2. 方案计算器(C3;红线见文件头)
// =========================================================================

/**
 * 核心算法:每条路 = 三类段 → 分组(全确定 / 含未知)→ 组内升序 → 只在算术站得住时生成快慢差。
 *
 * @param input 门槛、路径与费用。
 * @returns 整份方案。
 */
export function buildPlan(input: PlanIn): Plan {
  const paths: PlanPath[] = []
  for (const p of input.paths) {
    let t = p.thresholds
    if (t == null) {
      for (const x of input.thresholds.provinces) {
        if (x.province === p.province) {
          t = x
          break
        }
      }
    }
    let rows: ThresholdRows = []
    if (t != null) {
      rows = t.rows
    }
    const steps = gapSteps(rows)
    steps.push(drawStep(p))
    steps.push(processingStep(p))
    const unknownSteps: PlanSteps = []
    let determined = 0
    for (const s of steps) {
      if (s.months == null) {
        unknownSteps.push(s)
      } else {
        determined += s.months
      }
    }
    const determinedMonths = round1(determined)
    let totalMonths: MaybeNum = determinedMonths
    let certainty: PlanPath['timelineCertainty'] = CERT.complete
    if (unknownSteps.length > 0) {
      totalMonths = null
      certainty = CERT.partial
    }
    let stream = TEXT_NONE
    if (p.stream != null) {
      stream = p.stream
    }
    let availability: Availability = AV.notCollected
    let note = TEXT_NONE
    if (t != null) {
      availability = t.availability
      if (t.note != null) {
        note = t.note
      }
    }
    paths.push({
      province: p.province, stream: stream, steps: steps, determinedMonths: determinedMonths,
      totalMonths: totalMonths, timelineCertainty: certainty,
      unknownSteps: unknownSteps, unresolved: blockersOf(rows),
      availability: availability, note: note,
    })
  }
  const ranked: PlanPath[] = []
  const partial: PlanPath[] = []
  for (const p of paths) {
    if (p.timelineCertainty === CERT.complete) {
      ranked.push(p)
    } else {
      partial.push(p)
    }
  }
  ranked.sort(byTotalMonths)
  partial.sort(byDeterminedMonths)
  return {
    noc: input.thresholds.noc, title: input.thresholds.title, teer: input.thresholds.teer,
    ranked: ranked, partial: partial, comparisons: comparisonsOf({ ranked: ranked, partial: partial }),
    officialCosts: input.officialCosts, quotedCosts: input.quotedCosts,
    notes: PLAN_NOTES,
  }
}

/**
 * 门槛判不了的行(verdict=unknown)→ blocker。**不计月数**:判不了 ≠ 要等多久。
 *
 * @param rows 门槛行。
 * @returns blockers。
 */
function blockersOf(rows: ThresholdRows): PlanBlockers {
  const out: PlanBlockers = []
  for (const r of rows) {
    if (r.verdict !== TV.unknown) {
      continue
    }
    let why: string = PLAN_TEXT.applicantBlockerWhy
    if (r.subject === SUBJECT_EMPLOYER) {
      why = PLAN_TEXT.employerBlockerWhy
    }
    out.push({ factor: r.factor, subject: r.subject, need: r.need, unit: r.unit, why: why, evidence: r.evidence })
  }
  return out
}

/**
 * 四舍五入到 0.1 个月(精度到此为止 —— 官方颗粒度就是「2 weeks」,两位小数是假精确)。
 *
 * @param n 原数。
 * @returns 一位小数。
 */
function round1(n: number): number {
  return Math.round(n * ROUND_TENTHS_SCALE) / ROUND_TENTHS_SCALE
}

/**
 * ③ 递交后官方处理多久 = ops 的 processing_weeks。省内多条通道又没指明 scope = 不替你挑。
 * ops 整体 ok 但独独没有处理时长 = 本站未收录这一项,不能沿用整体的 ok。
 * 🔴 value=null 是官方的隐私抑制 / 不适用(valueText 原文如 "N/A"),**不是 0 周**。
 *
 * @param p 该省的路径输入。
 * @returns processing 段。
 */
function processingStep(p: PlanPathInput): PlanStep {
  const o = p.ops
  const all: OpsMetric[] = []
  if (o != null) {
    for (const m of o.metrics) {
      if (m.key === PROCESSING_KEY) {
        all.push(m)
      }
    }
  }
  if (all.length === 0) {
    let availability: Availability = AV.notCollected
    let why = fill({ tpl: PLAN_TEXT.processingNoneWhy, params: { province: p.province } })
    if (o != null && o.availability === AV.ok) {
      why = fill({ tpl: PLAN_TEXT.processingMissingWhy, params: { province: p.province } })
    } else if (o != null) {
      availability = o.availability
      if (o.note !== '') {
        why = o.note
      }
    }
    return { kind: STEP.processing, factor: PROCESSING_KEY, months: null, basis: BASIS_NONE, availability: availability, why: why, evidence: null }
  }
  let scoped = all
  if (p.processingScope != null && p.processingScope !== '') {
    scoped = all.filter(function scopeHit(m) {
      return m.scope === p.processingScope
    })
  }
  const m = scoped[0]
  if (scoped.length !== 1 || m == null) {
    let factor = PROCESSING_KEY
    if (p.processingScope != null && p.processingScope !== '') {
      factor = p.processingScope
    }
    let why = fill({ tpl: PLAN_TEXT.scopeManyWhy, params: { province: p.province, n: scoped.length } })
    if (scoped.length === 0) {
      why = fill({ tpl: PLAN_TEXT.scopeMissWhy, params: { province: p.province, scope: factor } })
    }
    return { kind: STEP.processing, factor: factor, months: null, basis: BASIS_NONE, availability: AV.notCollected, why: why, evidence: null }
  }
  let months: MaybeNum = null
  if (m.value != null) {
    months = monthsFromUnit({ value: m.value, unit: m.unit })
  }
  let basis = BASIS_NONE
  let availability: Availability = AV.notCollected
  let why = WHY_NONE
  if (months != null) {
    let period = SLOT_NONE
    if (m.period !== '') {
      period = SPACE + m.period
    }
    basis = fill({ tpl: PLAN_TEXT.processingBasis, params: { period: period, label: m.label, value: m.value as number, unit: m.unit } })
    availability = AV.ok
  } else {
    let valueText: string = NA_TEXT
    if (m.valueText !== '') {
      valueText = m.valueText
    }
    why = fill({ tpl: PLAN_TEXT.valueNaWhy, params: { text: valueText } })
    if (o != null) {
      availability = o.availability
    }
  }
  let factor = PROCESSING_KEY
  if (m.scope !== '') {
    factor = m.scope
  }
  return stepOf({ kind: STEP.processing, factor: factor, months: months, basis: basis, availability: availability, why: why, evidence: m.evidence })
}

/**
 * 出处闸(反向验证的着力点):数字段没有 evidence.url 就地降级为不可用,**不静默沿用**。
 * 这是红线①在代码里的唯一执行点 —— 所有段构造都必须过它。
 *
 * @param s 一段。
 * @returns 原段;数字没出处则降级段。
 */
function stepOf(s: PlanStep): PlanStep {
  if (s.months == null) {
    return s
  }
  if (s.evidence != null && s.evidence.url !== '') {
    return s
  }
  return {
    kind: s.kind, factor: s.factor, months: null, basis: BASIS_NONE, availability: AV.notCollected,
    why: fill({ tpl: PLAN_TEXT.noEvidenceWhy, params: { factor: s.factor } }), evidence: s.evidence,
  }
}

/**
 * 差值 → 月数。认得出的单位才换算,认不出返回 null(宁缺不猜,同 rules.areaOfPlace 的先例)。
 *
 * @param input 差值与官方单位。
 * @returns 月数;换算不了 null。
 */
function monthsFromUnit(input: MonthsIn): MaybeNum {
  const u = input.unit.toLowerCase()
  if (u.startsWith(UNIT_HEADS.month)) {
    return round1(input.value)
  }
  if (u.startsWith(UNIT_HEADS.year)) {
    return round1(input.value * MONTHS_PER_YEAR)
  }
  if (u.startsWith(UNIT_HEADS.week)) {
    return round1((input.value * DAYS_PER_WEEK) / DAYS_PER_MONTH)
  }
  if (u.startsWith(UNIT_HEADS.day)) {
    return round1(input.value / DAYS_PER_MONTH)
  }
  return null
}

/**
 * ② 然后要等多久 —— **官方多久开一轮**(历史平均间隔),不是「你要等几轮才被抽中」(红线②)。
 * ≥2 轮才有间隔可算;只有 1 轮 = 算不出节奏(1 个点画不出周期)。
 *
 * @param p 该省的路径输入。
 * @returns draw 段。
 */
function drawStep(p: PlanPathInput): PlanStep {
  if (p.noDrawStep != null && p.noDrawStep.evidence.url !== '') {
    return stepOf({
      kind: STEP.draw, factor: CADENCE_FACTOR, months: 0, basis: PLAN_TEXT.noDrawBasis,
      availability: AV.notApplicable, why: WHY_NONE, evidence: p.noDrawStep.evidence,
    })
  }
  const d = p.draws
  let rows: DrawRow[] = []
  if (d != null) {
    rows = d.rows
  }
  if (d == null || d.availability !== AV.ok || rows.length < DRAW_ROWS_MIN) {
    let availability: Availability = AV.notCollected
    if (d != null) {
      availability = d.availability
    }
    let why = fill({ tpl: PLAN_TEXT.noRoundsWhy, params: { province: p.province } })
    if (d != null && d.note != null && d.note !== '') {
      why = d.note
    } else if (rows.length === 1) {
      why = fill({ tpl: PLAN_TEXT.oneRoundWhy, params: { province: p.province } })
    }
    let evidence: PlanStep['evidence'] = null
    const rowsFirst = rows[0]
    if (rowsFirst != null) {
      evidence = rowsFirst.evidence
    }
    return { kind: STEP.draw, factor: CADENCE_FACTOR, months: null, basis: BASIS_NONE, availability: availability, why: why, evidence: evidence }
  }
  const seen = new Set<string>()
  const days: string[] = []
  for (const r of rows) {
    if (r.drawDate !== '' && seen.has(r.drawDate) === false) {
      seen.add(r.drawDate)
      days.push(r.drawDate)
    }
  }
  days.sort(byDateAsc)
  let sum = 0
  let prevDay: string | null = null
  for (const day of days) {
    if (prevDay != null) {
      sum += (Date.parse(day) - Date.parse(prevDay)) / DAY_MS
    }
    prevDay = day
  }
  const avg = sum / (days.length - 1)
  const dayFirst = days[0]
  const evFirst = rows[0]
  if (dayFirst == null || evFirst == null) {
    return stepOf({ kind: STEP.draw, factor: CADENCE_FACTOR, months: null, basis: BASIS_NONE, availability: AV.ok, why: WHY_NONE, evidence: null })
  }
  return stepOf({
    kind: STEP.draw, factor: CADENCE_FACTOR, months: round1(avg / DAYS_PER_MONTH),
    basis: fill({ tpl: PLAN_TEXT.cadenceBasis, params: { from: dayFirst, rounds: days.length, avgDays: Math.round(avg) } }),
    availability: AV.ok, why: WHY_NONE, evidence: evFirst.evidence,
  })
}

/**
 * ① 还缺什么:门槛 fail 的差值 → 月数。fail 之外的行不进时间线(pass 无缺口,unknown 进 unresolved)。
 *
 * @param rows 门槛行。
 * @returns gap 段。
 */
function gapSteps(rows: ThresholdRows): PlanSteps {
  const out: PlanSteps = []
  for (const r of rows) {
    if (r.verdict !== TV.fail) {
      continue
    }
    const blocked = NOT_TIME_CONVERTIBLE[r.factor]
    let months: MaybeNum = null
    if (blocked == null && r.short != null) {
      months = monthsFromUnit({ value: r.short, unit: r.unit })
    }
    let basis = BASIS_NONE
    let availability: Availability = AV.notCollected
    let why = WHY_NONE
    if (months != null) {
      let have = 0
      if (r.have != null) {
        have = r.have
      }
      let need: string | number = SLOT_NONE
      if (r.need != null) {
        need = r.need
      }
      let short: string | number = SLOT_NONE
      if (r.short != null) {
        short = r.short
      }
      basis = fill({ tpl: PLAN_TEXT.gapBasis, params: { need: need, have: have, short: short, unit: r.unit } })
      availability = AV.ok
    } else if (blocked != null) {
      why = blocked
    } else {
      why = fill({ tpl: PLAN_TEXT.gapUnitWhy, params: { unit: r.unit } })
    }
    out.push(stepOf({
      kind: STEP.gap, factor: r.factor, months: months, basis: basis,
      availability: availability, why: why, evidence: r.evidence,
    }))
  }
  return out
}

/**
 * 快慢差:只有「快的那条全段确定」才敢说 —— 它的总数同时也是上界,慢的那条拿下界比才成立。
 *
 * @param input 两组路径。
 * @returns 站得住的差值。
 */
function comparisonsOf(input: ComparisonsIn): PlanComparisons {
  const out: PlanComparisons = []
  for (const a of input.ranked) {
    if (a.totalMonths == null) {
      continue
    }
    for (const b of input.ranked) {
      if (b === a || b.totalMonths == null || b.totalMonths <= a.totalMonths) {
        continue
      }
      out.push({
        fasterProvince: a.province, slowerProvince: b.province,
        monthsDelta: round1(b.totalMonths - a.totalMonths), kind: CMP.exact,
        basis: fill({ tpl: PLAN_TEXT.exactBasis, params: { slowProv: b.province, slow: b.totalMonths, fastProv: a.province, fast: a.totalMonths } }),
      })
    }
    for (const b of input.partial) {
      if (b.determinedMonths <= a.totalMonths) {
        continue
      }
      out.push({
        fasterProvince: a.province, slowerProvince: b.province,
        monthsDelta: round1(b.determinedMonths - a.totalMonths), kind: CMP.atLeast,
        basis: fill({ tpl: PLAN_TEXT.atLeastBasis, params: {
          slowProv: b.province, slowLow: b.determinedMonths, unknownN: b.unknownSteps.length,
          fastProv: a.province, fast: a.totalMonths,
        } }),
      })
    }
  }
  return out
}

// =========================================================================
// 3. 政策时间线(C6-01;零 schema 改动,SQL 只 SELECT)
// =========================================================================

/**
 * 三路在库事件源合并 + 抽选节奏统计。诚实红线循 E6-04:省分数带分制标注(≠CRS);
 * 节奏只报历史统计不预测下一次(伪权威红线)。#135:联邦 EE 历次抽选已并进 pnp_draws,
 * FED 行不混省节奏(另走 eeCadence,历史未入库只报「距今」;二期历史入库后并入 cadence)。
 * 省级节奏按 省×项目 分组(kind=draw 且有日期);分组键 = label||stream(项目级)——
 * stream 每期写法不同(BC 各 ITA 因素/AB 各期描述),按它分组会碎成一期一卡。
 * 2026-09-26 lead 定(Frank 批的「补完整」范围):节奏只收日期齐到日(`YYYY-MM-DD`)的抽选 —— NS 按月公布选取人数、
 * 日期只到月(`2026-07`),拿它算「距今 N 天 / 平均间隔」会被当成当月 1 号,多算最多一个月、还误上「拖长了」;
 * 这种行照旧进事件流(日期原样到月),只是不进节奏统计。
 * 2026-10-03 资讯页签四分(Frank「这个是不是拆成两个 tab」→ 提案「可以,做吧」):时间线页签改叫「抽选」,
 * 政策公告那一路(news 表最近 90 条)撤出事件流 —— 与「最新公告」页签读的是同一张表,政策公告只在那里看;事件流只剩抽选与省通告。
 * 2026-10-12 抽选页三段式(Frank 看效果图拍「定稿,开工」;docs/design/资讯/抽选-三段式-20261012.md):节奏统计整段下沉数据层 ——
 * etl/mart/rank 子域按通道一张卡算好平均间隔 / 今年次数与人数 / 状态 / 综合名次,另出配额卡(联邦 + 各省),写进 draw_rank 表;
 * 本函数不再分组求间隔,只读那张表(上面几段说的省×项目分组、eeCadence 两套口径随之作废,NS 只到月照旧不进间隔,规则搬到了数据层)。
 * draw_rank 还没建表时(生产 DDL 未跑)查挂回空,事件流照出。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 事件流、配额卡与抽选节奏卡(两种卡各按名次)。
 */
export async function fetchTimeline(db: Db): TimelineOut {
  const [draws, ranks] = await Promise.all([
    queryRows({ db: db, sql: SQL.PNP_DRAWS_ALL, params: [], map: toDrawEvent }),
    queryRowsOrEmpty({ db: db, sql: SQL.DRAW_RANK_ALL, params: [], map: toTlRank }),
  ])
  draws.sort(byDateDesc)
  const quota: TlRank[] = []
  const cadence: TlRank[] = []
  for (const r of ranks) {
    if (r.kind === RANK_QUOTA) {
      quota.push(r)
    } else {
      cadence.push(r)
    }
  }
  return { events: draws, quota: quota, cadence: cadence }
}

/**
 * 两个十位日期的天数差。
 *
 * @param input 起止日期。
 * @returns 天数(四舍五入)。
 */
function daysBetween(input: DaysIn): number {
  return Math.round((Date.parse(input.to) - Date.parse(input.from)) / DAY_MS)
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * `PNP_DRAWS_ALL` 一行 → 时间线事件(FED 行 label=类别 key、stream=官方 drawName → 标题取 stream;
 * prov 留空 = 联邦口径不变)。
 * 2026-10-12 抽选页三段式:省行标题也改取 stream(通道名)—— 节奏卡拆到一条通道一张,事件标题若还写项目名(BC 五条都叫
 * 「BC PNP Skills Immigration」)就分不出是哪条通道,点卡片按流名筛也对不上;项目名退出标题。多带 titleZh(stream_zh,
 * 中文界面灰字)与 label(联邦类别键,前端按它查 ee.* 词条出中 / 韩灰字)。
 *
 * @param r 原始行。
 * @returns 事件。
 */
export function toDrawEvent(r: Row): TlEvent {
  const fed = r.province === PROV_FED
  let prov = text(r.province)
  let title = text(r.stream)
  if (title === '') {
    title = text(r.label)
  }
  let label = ''
  if (fed) {
    prov = ''
    label = text(r.label)
  }
  return {
    date: day(r.draw_date), prov: prov,
    title: title, titleZh: text(r.stream_zh), label: label, score: numOrNull(r.score), scale: text(r.scale),
    invitations: numOrNull(r.invitations),
    url: text(r.url), unit: text(r.unit),
  }
}

/**
 * 时间格 → YYYY-MM-DD(pg timestamp 回 Date、文本列回字符串,一网收干净;空落空串)。
 *
 * @param v 库回的时间格。
 * @returns 十位日期;没有则空串。
 */
// eslint-disable-next-line local/no-undefined-type, local/typed-signature -- 消化点:行索引缺席就是 undefined,照实收(开灯批)
export function day(v: TimeLike | undefined): string {
  if (v instanceof Date) {
    return v.toISOString().slice(0, DATE10_LEN)
  }
  if (v == null) {
    return DATE_NONE
  }
  return String(v).slice(0, DATE10_LEN)
}

/**
 * `DRAW_RANK_ALL` 一行 → 一张排名卡(2026-10-12 抽选页三段式)。联邦省码折成 ''(与事件流同口径,点卡片按它筛);
 * 距今按今天现算(统计日之后过了几天也准),状态照数据层判的原样读;jsonb 两格(covers / streams)是本站 ETL 自产的形,
 * 不是数组就当空。
 *
 * @param r 原始行。
 * @returns 排名卡。
 */
export function toTlRank(r: DrawRankDbRow): TlRank {
  let prov = text(r.province)
  if (prov === PROV_FED) {
    prov = ''
  }
  const lastDate = text(r.last_date)
  let daysSince: MaybeNum = null
  if (lastDate.length === DATE10_LEN) {
    daysSince = daysBetween({ from: lastDate, to: new Date().toISOString().slice(0, DATE10_LEN) })
  }
  let kind: TlRank['kind'] = 'cadence'
  if (r.kind === RANK_QUOTA) {
    kind = 'quota'
  }
  return {
    key: text(r.key), kind: kind, rank: count(r.rank), prov: prov, label: text(r.label),
    nameEn: text(r.name_en), nameZh: text(r.name_zh), nameKo: text(r.name_ko), covers: toCovers(r.covers),
    streams: toStreams(r.streams), scale: text(r.scale), lastDate: lastDate, daysSince: daysSince,
    avgGapDays: numOrNull(r.avg_gap_days), status: statusOf(text(r.status)), drawsYtd: count(r.draws_ytd),
    invitationsYtd: numOrNull(r.invitations_ytd), inviteUnit: text(r.invite_unit),
    nominationsYtd: numOrNull(r.nominations_ytd), allocation: numOrNull(r.allocation),
    allocationKind: text(r.allocation_kind),
  }
}

/**
 * 节奏状态串 → 三态(数据层只写 ok / late / idle;认不出的当正常)。
 *
 * @param s 库里的状态串。
 * @returns 三态之一。
 */
function statusOf(s: string): TlStatus {
  for (const st of RANK_STATUSES) {
    if (st === s) {
      return st
    }
  }
  return RANK_OK
}

/**
 * covers jsonb → 覆盖通道清单(NULL 当空;每项三格缺了当空串)。
 *
 * @param v 库回的 jsonb 格。
 * @returns 覆盖通道清单。
 */
function toCovers(v: CoversCell): TlCovers {
  const out: TlCovers = []
  if (v == null) {
    return out
  }
  for (const c of v) {
    out.push({ en: text(c.en), zh: text(c.zh), ko: text(c.ko) })
  }
  return out
}

/**
 * streams jsonb → 抽选流名清单(NULL 当空)。
 *
 * @param v 库回的 jsonb 格。
 * @returns 流名清单。
 */
function toStreams(v: StreamsCell): TlStreams {
  const out: TlStreams = []
  if (v == null) {
    return out
  }
  for (const s of v) {
    out.push(text(s))
  }
  return out
}

// =========================================================================
// 回调(callbacks 抽屉 2026-08-23 撤编后的固定尾段;签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * 初评主排序(#307 唯一的尺):① 0 岗跨档沉底 ② 沉降段(缺数据/够不着线)③ 本省优先跨档
 * ④ 档位 band ⑤ 档内够得着优先 ⑥ thin 沉同档尾 ⑦ thin 组内岗数多→少、足量组竞争比松→紧
 * ⑧ 引擎原序兜底。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byPlanOrder<T extends RankableRow>(a: DecoratedRow<T>, b: DecoratedRow<T>): number {
  if (a.zero !== b.zero) {
    if (a.zero) {
      return 1
    }
    return -1
  }
  if (a.sunk !== b.sunk) {
    if (a.sunk) {
      return 1
    }
    return -1
  }
  if (a.home !== b.home) {
    if (a.home) {
      return -1
    }
    return 1
  }
  if (a.band !== b.band) {
    return a.band - b.band
  }
  if (a.row.aboveLine !== b.row.aboveLine) {
    if (a.row.aboveLine) {
      return -1
    }
    return 1
  }
  if (a.thin !== b.thin) {
    if (a.thin) {
      return 1
    }
    return -1
  }
  if (a.thin && b.thin && a.n !== b.n) {
    let an = -1
    if (a.n != null) {
      an = a.n
    }
    let bn = -1
    if (b.n != null) {
      bn = b.n
    }
    return bn - an
  }
  if (a.ratio !== b.ratio) {
    return a.ratio - b.ratio
  }
  return a.i - b.i
}

/**
 * 时间线事件:日期新在前。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byDateDesc(a: TlEvent, b: TlEvent): number {
  if (a.date < b.date) {
    return 1
  }
  if (a.date > b.date) {
    return -1
  }
  return 0
}

/**
 * 全段确定的路径:总月数升序,同数按省码(totalMonths 在 complete 组恒非 null)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byTotalMonths(a: PlanPath, b: PlanPath): number {
  let at = 0
  if (a.totalMonths != null) {
    at = a.totalMonths
  }
  let bt = 0
  if (b.totalMonths != null) {
    bt = b.totalMonths
  }
  if (at !== bt) {
    return at - bt
  }
  return a.province.localeCompare(b.province)
}

/**
 * 含 unknown 段的路径:下界升序,同数按省码。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byDeterminedMonths(a: PlanPath, b: PlanPath): number {
  if (a.determinedMonths !== b.determinedMonths) {
    return a.determinedMonths - b.determinedMonths
  }
  return a.province.localeCompare(b.province)
}

/**
 * 日期字符串升序(节奏分组内排期)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byDateAsc(a: string, b: string): number {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}
