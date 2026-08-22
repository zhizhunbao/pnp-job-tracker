/**
 * SQL 原始行 → 本域形状的构造器(一条 SQL 一个)+ 两个 json 行的原样透传。
 * 体内只许词汇表 + 纯拼装,不许业务判断 —— difficulty/info 两列 json 的解析是
 * 真会抛的 JSON.parse,归 `functions.ts` 的接缝函数,不进这里。
 *
 * 🔴 数字一律走 db 的 `numOrNull`:pnp_draws 的 score/invitations 与分值表的 points
 * 都是 numeric,pg 直连交回来是**字符串**;并入前经 Payload Local API 拿到的是数字 ——
 * 一套词汇两条路都对(jobs 域老坑:`typeof x === 'number'` 换路后整列静默判 null)。
 *
 * @author Frank
 * @time 2026-08-22 12:10:00
 */

import { count, jsonOrNull, numOrNull, text } from '../db'
import { COMP_KEY, MONTH_NUM, PERIOD_SEP } from './constants'
import type {
  DifficultyDbRow, DifficultyFact, DrawFact, FlowSeriesEntryJson, MaybeCompFactor, MaybeDifficulty,
  MaybeFlow, MaybeNum, MaybeProvInfo, MaybeSeries, NumCell, ProvFlowYear, ProvInfoDbRow, ProvInfoExtra,
  ProvInfoFact, ProvInfoJson, ProvQuotaYears, ProvStockYear, Row, ScoreFactor,
} from './types'

/**
 * 一行抽选(SQL.DIMS_PNP_DRAWS,列已按 camelCase 起别名)→ 抽选事实。
 * invitations 必须带出来 —— 理由见 `DrawFact` 上那条 2026-08-12 红线。
 *
 * @param r 库里的一行。
 * @returns 洗净的抽选事实。
 */
export function toDrawFact(r: Row): DrawFact {
  return {
    province: text(r.province), kind: text(r.kind), drawDate: text(r.drawDate),
    stream: text(r.stream), streamZh: text(r.streamZh),
    score: numOrNull(r.score), invitations: numOrNull(r.invitations),
  }
}

/**
 * 一行官方分值表(SQL.PNP_SCORE_FACTORS)→ `ScoreFactor`。
 * 档位顺序由 SQL 的 `ORDER BY province, factor, seq` 定死 —— 只按 province 排的话,
 * 同一道题的官方档位顺序随 DB 返回(2026-08-16 Frank 实拍:BC 工作地区出成
 * 「Area 3 / Area 1 / Area 2」),并入时把这条红线从 payload.find 的 sort 参数搬进 SQL 消费侧。
 *
 * @param r 库里的一行。
 * @returns 评分域认的形状。
 */
export function toScoreFactor(r: Row): ScoreFactor {
  return {
    province: text(r.province), system: text(r.system), factor: text(r.factor),
    kind: text(r.kind), seq: count(r.seq), label: text(r.label),
    points: numOrNull(r.points), xorPrev: Boolean(r.xor_prev), rule: text(r.rule),
    factorMax: numOrNull(r.factor_max), factorGroup: text(r.factor_group), groupMax: numOrNull(r.group_max),
    passMark: numOrNull(r.pass_mark), maxTotal: numOrNull(r.max_total),
    guideEffective: text(r.guide_effective), fetched: text(r.fetched), url: text(r.url),
  }
}

/**
 * 词汇:解析好的难度 json 里名额竞争那个因子(key='comp')。
 *
 * @param d 解析好的 difficulty json。
 * @returns 因子;没有则 null。
 */
function compFactorOf(d: MaybeDifficulty): MaybeCompFactor {
  if (d == null || d.factors == null) {
    return null
  }
  for (const f of d.factors) {
    if (f != null && f.key === COMP_KEY) {
      return f
    }
  }
  return null
}

/**
 * 词汇:数字格 → 数,缺位折 0(pool/quota/quotaYear 合计列,并入前就是 `|| 0` 的口径)。
 *
 * @param x json 里的数字格。
 * @returns 数;缺位是 0。
 */
function numOrZero(x: NumCell): number {
  const n = numOrNull(x)
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 词汇:上一年流量格 —— 官方缺位或 0 都落 null,0 在这一格的历史含义是「没取到」
 * (IRCC 月度表上一年缺位时源数据是 0),照旧不展示。
 *
 * @param x json 里的上一年格。
 * @returns 上一年数;没有则 null。
 */
function prevYearOf(x: NumCell): MaybeNum {
  const n = numOrNull(x)
  if (n == null || n === 0) {
    return null
  }
  return n
}

/**
 * 词汇:英文月份缩写 → 两位月数;认不出空串(口径期就不带月)。
 *
 * @param name 英文月份缩写(如 'May')。
 * @returns 两位月数或空串。
 */
function monthNumOf(name: string): string {
  const mm = MONTH_NUM[name]
  if (mm == null) {
    return ''
  }
  return mm
}

/**
 * 词汇:流量进行年 complete=false → 口径期带「至几月」;整年空串。
 *
 * @param v 某年的流量格。
 * @returns 两位月数或空串。
 */
function flowMonthOf(v: FlowSeriesEntryJson): string {
  if (v.complete === false) {
    return monthNumOf(text(v.throughMonth))
  }
  return ''
}

/**
 * studyFlow 格 → 新发学签流量(口径红线见 `ProvFlow`)。
 *
 * @param info 解析好的 info json。
 * @returns 流量;缺年份或缺数是 null。
 */
function flowOf(info: ProvInfoJson): MaybeFlow {
  const f = info.studyFlow
  if (f == null) {
    return null
  }
  const n = numOrNull(f.n)
  const year = text(f.year)
  if (year === '' || n == null) {
    return null
  }
  const mm = monthNumOf(text(f.throughMonth))
  let period = year
  if (mm !== '') {
    period = year + PERIOD_SEP + mm
  }
  return { period: period, n: n, prevYear: prevYearOf(f.prev) }
}

/**
 * info json → 年份筛选序列(2026-08-14:存量近 3 年、流量近 5 年、名额 2024–2026)。
 * 流量进行年带「至几月」;缺位一律 null,前端显「—」。三格全缺 = 没有序列。
 *
 * @param info 解析好的 info json。
 * @returns 序列;三格全缺是 null。
 */
function seriesOf(info: ProvInfoJson): MaybeSeries {
  if (info.trSeries == null && info.flowSeries == null && info.alloc == null) {
    return null
  }
  const stocks: Record<string, ProvStockYear> = {}
  if (info.trSeries != null) {
    for (const [y, v] of Object.entries(info.trSeries)) {
      if (v == null) {
        continue
      }
      stocks[y] = { study: numOrNull(v.study), work: numOrNull(v.work), asOf: text(v.asOf) }
    }
  }
  const flow: Record<string, ProvFlowYear> = {}
  if (info.flowSeries != null) {
    for (const [y, v] of Object.entries(info.flowSeries)) {
      if (v == null) {
        continue
      }
      const n = numOrNull(v.n)
      if (n == null) {
        continue
      }
      let period = y
      const mm = flowMonthOf(v)
      if (mm !== '') {
        period = y + PERIOD_SEP + mm
      }
      flow[y] = { n: n, period: period }
    }
  }
  let quota: ProvQuotaYears = { y2024: null, y2025: null, y2026: null }
  if (info.alloc != null) {
    quota = { y2024: numOrNull(info.alloc.y2024), y2025: numOrNull(info.alloc.y2025), y2026: numOrNull(info.alloc.y2026) }
  }
  return { stocks: stocks, flow: flow, quota: quota }
}

/**
 * 词汇:解析好的 info json → flow/series 两格增补(没有 json 就是两格 null)。
 *
 * @param info 解析好的 info json。
 * @returns 两格增补。
 */
function infoExtraOf(info: MaybeProvInfo): ProvInfoExtra {
  if (info == null) {
    return { flow: null, series: null }
  }
  return { flow: flowOf(info), series: seriesOf(info) }
}

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY_FETCHED)→ 难度事实。json 解析(词汇 `jsonOrNull`)
 * 与逐格拆解都在这里做完 —— functions 拿到的每格即有效,那边只剩「这行入不入选」的业务取舍
 * (2026-08-22 Frank:值级清洗不进 functions)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toDifficultyFact(r: DifficultyDbRow): DifficultyFact {
  const d = jsonOrNull(r.difficulty)
  const f = compFactorOf(d)
  let tier = ''
  let generated = ''
  if (d != null) {
    tier = text(d.tier)
    generated = text(d.generated)
  }
  if (generated === '') {
    generated = text(r.fetched)
  }
  let ratio: MaybeNum = null
  let pool = 0
  let quota = 0
  let poolStudy: MaybeNum = null
  let poolWork: MaybeNum = null
  let poolYear = ''
  let quotaYear = 0
  let source = ''
  if (f != null) {
    ratio = numOrNull(f.value)
    pool = numOrZero(f.pool)
    quota = numOrZero(f.quota)
    poolStudy = numOrNull(f.poolStudy)
    poolWork = numOrNull(f.poolWork)
    poolYear = text(f.asOf)
    quotaYear = numOrZero(f.quotaYear)
    source = text(f.source)
  }
  return {
    province: text(r.province), ratio: ratio, tier: tier,
    pool: pool, quota: quota, poolStudy: poolStudy, poolWork: poolWork,
    poolYear: poolYear, quotaYear: quotaYear, generated: generated, source: source,
  }
}

/**
 * 一行省份维度(SQL.PROVINCES_INFO)→ 省份维度事实(json 解析与增补拼装同上口径)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toProvInfoFact(r: ProvInfoDbRow): ProvInfoFact {
  return { code: text(r.code), extra: infoExtraOf(jsonOrNull(r.info)) }
}
