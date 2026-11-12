/**
 * points 域的子桶 tables 的函数 —— 官方表取数、单件缓存与行构造(getScoreTables 一族),/api/points/factors 的省过滤小件。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

import { SQL, count, jsonOrNull, numOrNull, queryRowsOrEmpty, text } from '../../db'
import type { Db } from '../../db'
import { CACHE } from './variables'
import { COMP_KEY, MONTH_NUM, PERIOD_SEP, PNP_PROV_CODES, RECENT_ROUNDS, SCORE_TTL_MS } from './constants'
import type {
  CompetitionExtrasIn, DifficultyDbRow, DifficultyFact, DrawFact, DrawFacts, DrawRow, DrawRows, ExtrasMap,
  FlowSeriesEntryJson, MaybeCompFactor, MaybeCompetition, MaybeDifficulty, MaybeFlow, MaybeNum, MaybeProvInfo,
  MaybeSeries, NumCell, OverviewDraws, ProvCompetition, ProvCompetitions, ProvFlowYear, ProvHitFn, ProvInfoDbRow,
  ProvInfoExtra, ProvInfoFact, ProvInfoFacts, ProvInfoJson, ProvKeyed, ProvQuotaYears, ProvSet, ProvStockYear, Row,
  ScoreFactor, ScoreFactors, ScoreTablesOut, StrList,
} from './types'

// =========================================================================
// 1. 决策页官方表包（取数 + 单件缓存；2026-08-22 自 lib/score 并入）
// =========================================================================

/**
 * 决策页首屏的官方表包(进程内单件缓存;2026-08-12 立,2026-08-22 自 lib/score 并入本域)。
 * 抽选表(overview)留在 SSR:它是这页唯一的免费硬事实,要被爬到,不能等水合;
 * 分值表由 `/api/points/factors` 按省懒取,不再随页面下发。
 * topNocs 2026-08-22 起不进包 —— 那是 jobs 的题材,页面另取 `getTopNocs`(同 TTL)。
 * 两张主表都空 = 多半是查挂了,不把一次抖动钉死 10 分钟。
 *
 * @param db 能打 SQL 的东西(池由调用方注进来)。
 * @returns 表包(TTL 内直接给缓存那一份)。
 */
export async function getScoreTables(db: Db): ScoreTablesOut {
  if (CACHE.scoreTables != null && Date.now() - CACHE.scoreTables.at <= SCORE_TTL_MS) {
    return CACHE.scoreTables.data
  }
  const data = await loadScoreTables(db)
  if (data.draws.length > 0 || data.factors.length > 0) {
    CACHE.scoreTables = { at: Date.now(), data: data }
  }
  return data
}

/**
 * 真去库里取一版表包(缓存判断在 `getScoreTables`):四条查询并行 ——
 * 抽选近 200 轮、分值表全表、各省难度、省份维度 info。
 *
 * @param db 能打 SQL 的东西(池由调用方注进来)。
 * @returns 组装好的表包。
 */
async function loadScoreTables(db: Db): ScoreTablesOut {
  const [facts, factors, diffRows, infoRows] = await Promise.all([
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_PNP_DRAWS, params: [false], map: toDrawFact }),
    queryRowsOrEmpty({ db: db, sql: SQL.PNP_SCORE_FACTORS, params: [], map: toScoreFactor }),
    queryRowsOrEmpty({ db: db, sql: SQL.PROV_DIFFICULTY_FETCHED, params: [], map: toDifficultyFact }),
    queryRowsOrEmpty({ db: db, sql: SQL.PROVINCES_INFO, params: [], map: toProvInfoFact }),
  ])
  const competition: ProvCompetitions = []
  for (const r of diffRows) {
    const row = competitionRowOf(r)
    if (row != null) {
      competition.push(row)
    }
  }
  attachExtras({ rows: competition, extras: infoExtrasOf(infoRows) })
  competition.sort(byRatioAsc)
  return {
    overview: overviewOf(facts), drawsRecent: recentOf(facts), competition: competition,
    draws: facts.map(drawOf), factors: factors, factorProvinces: factorProvincesOf(factors),
  }
}

/**
 * 一行难度事实 → 名额竞争基础行(flow/series 由 `attachExtras` 再挂)。这里只剩业务取舍:
 * 比值缺位(官方没这格)或省码不在 13 省区名单(FED 是 EE 不是省提名)→ 不出行,
 * 纯事实零解释;值级清洗都在 rows(2026-08-22 Frank:functions 入参保证有效)。
 *
 * @param fact 难度事实一行。
 * @returns 竞争行;不入选是 null。
 */
function competitionRowOf(fact: DifficultyFact): MaybeCompetition {
  if (PNP_PROV_CODES.includes(fact.province) === false || fact.ratio == null) {
    return null
  }
  return {
    province: fact.province, ratio: fact.ratio, tier: fact.tier,
    pool: fact.pool, quota: fact.quota,
    poolStudy: fact.poolStudy, poolWork: fact.poolWork,
    poolYear: fact.poolYear, quotaYear: fact.quotaYear,
    generated: fact.generated, source: fact.source,
    series: null, flow: null,
  }
}

/**
 * 省份维度事实 → 省码 → 增补(增补的拼装在 rows;这里只按省码归集)。
 *
 * @param rows 省份维度事实行。
 * @returns 省码 → 增补。
 */
function infoExtrasOf(rows: ProvInfoFacts): ExtrasMap {
  const out: ExtrasMap = {}
  for (const r of rows) {
    if (r.code !== '') {
      out[r.code] = r.extra
    }
  }
  return out
}

/**
 * 把 flow/series 挂回竞争行(没有增补的省保持 null)。
 *
 * @param input 竞争行与省码增补表。
 * @returns 无(就地挂)。
 */
function attachExtras(input: CompetitionExtrasIn): void {
  for (const row of input.rows) {
    const extra = input.extras[row.province]
    if (extra == null) {
      continue
    }
    row.flow = extra.flow
    row.series = extra.series
  }
}

/**
 * 每省最近一轮有分数线**或**邀请数的抽选(行序已按抽选日倒序;查不到的省不出行,
 * 纯事实零解释;联邦轮不进,见 `PNP_PROV_CODES`)。
 *
 * @param facts 抽选事实(按抽选日倒序)。
 * @returns SSR 事实区行。
 */
function overviewOf(facts: DrawFacts): OverviewDraws {
  const seen = new Set<string>()
  const out: OverviewDraws = []
  for (const f of facts) {
    if (f.province === '' || PNP_PROV_CODES.includes(f.province) === false || seen.has(f.province)) {
      continue
    }
    if (f.score == null && f.invitations == null) {
      continue
    }
    seen.add(f.province)
    out.push({
      province: f.province, drawDate: f.drawDate, stream: f.stream, score: f.score, invitations: f.invitations,
      unit: f.unit,
    })
  }
  return out
}

/**
 * 每省近 6 轮**有分数**的抽选(没分数的轮次不进 —— 拿它跟估分比就是编)。
 * 2026-08-16:估分卡的空态诱饵,必须随 SSR 下发 —— 先前它取自 `/api/points/factors`,
 * 而那个请求只在**答满全卷**后才发,于是「选了省却看不到线」(实撞)。线是免费硬事实。
 *
 * @param facts 抽选事实(按抽选日倒序)。
 * @returns 每省近 6 轮有分数的展示行。
 */
function recentOf(facts: DrawFacts): DrawRows {
  const perProv = new Map<string, number>()
  const out: DrawRows = []
  for (const f of facts) {
    if (f.province === '' || f.score == null) {
      continue
    }
    let n = perProv.get(f.province)
    if (n == null) {
      n = 0
    }
    if (n >= RECENT_ROUNDS) {
      continue
    }
    perProv.set(f.province, n + 1)
    out.push(drawOf(f))
  }
  return out
}

/**
 * 抽选事实 → 展示行(`DrawRow`;invitations 不进 —— 它只在 overview 出)。
 *
 * @param f 抽选事实。
 * @returns 展示行。
 */
function drawOf(f: DrawFact): DrawRow {
  const row: DrawRow = { province: f.province, kind: f.kind, drawDate: f.drawDate, stream: f.stream, score: f.score }
  if (f.streamZh !== '') {
    row.streamZh = f.streamZh
  }
  return row
}

/**
 * 已收录官方分值表的省清单(决策页据此把「本站没有表」的省单列出来)。
 *
 * @param factors 分值表全表。
 * @returns 去重后的省码清单。
 */
function factorProvincesOf(factors: ScoreFactors): StrList {
  const seen = new Set<string>()
  for (const f of factors) {
    if (f.province !== '') {
      seen.add(f.province)
    }
  }
  return Array.from(seen)
}

// =========================================================================
// 2. 省过滤小件（/api/points/factors 用）
// =========================================================================

/**
 * 「行的省在想要的集合里吗」过滤器工厂（factors 与 draws 都按 province 格判 ——
 * 分值卡拿抽选做对照锚点时也只按省取；filter 传具名函数）。
 *
 * @param want 想要的省码集。
 * @returns 判定函数。
 */
export function makeProvHit(want: ProvSet): ProvHitFn {
  return function provHit(row: ProvKeyed): boolean {
    return want.has(row.province)
  }
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

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
    score: numOrNull(r.score), invitations: numOrNull(r.invitations), unit: text(r.unit),
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
    pool = toNumOrZero(f.pool)
    quota = toNumOrZero(f.quota)
    poolStudy = numOrNull(f.poolStudy)
    poolWork = numOrNull(f.poolWork)
    poolYear = text(f.asOf)
    quotaYear = toNumOrZero(f.quotaYear)
    source = text(f.source)
  }
  return {
    province: text(r.province), ratio: ratio, tier: tier,
    pool: pool, quota: quota, poolStudy: poolStudy, poolWork: poolWork,
    poolYear: poolYear, quotaYear: quotaYear, generated: generated, source: source,
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
function toNumOrZero(x: NumCell): number {
  const n = numOrNull(x)
  if (n == null) {
    return 0
  }
  return n
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
  return { flow: toFlow(info), series: toSeries(info) }
}

/**
 * studyFlow 格 → 新发学签流量(口径红线见 `ProvFlow`)。
 *
 * @param info 解析好的 info json。
 * @returns 流量;缺年份或缺数是 null。
 */
function toFlow(info: ProvInfoJson): MaybeFlow {
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
  return { period: period, n: n, prevYear: toPrevYear(f.prev) }
}

/**
 * 词汇:上一年流量格 —— 官方缺位或 0 都落 null,0 在这一格的历史含义是「没取到」
 * (IRCC 月度表上一年缺位时源数据是 0),照旧不展示。
 *
 * @param x json 里的上一年格。
 * @returns 上一年数;没有则 null。
 */
function toPrevYear(x: NumCell): MaybeNum {
  const n = numOrNull(x)
  if (n == null || n === 0) {
    return null
  }
  return n
}

/**
 * info json → 年份筛选序列(2026-08-14:存量近 3 年、流量近 5 年、名额 2024–2026)。
 * 流量进行年带「至几月」;缺位一律 null,前端显「—」。三格全缺 = 没有序列。
 *
 * @param info 解析好的 info json。
 * @returns 序列;三格全缺是 null。
 */
function toSeries(info: ProvInfoJson): MaybeSeries {
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
      const mm = toFlowMonth(v)
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
 * 词汇:流量进行年 complete=false → 口径期带「至几月」;整年空串。
 *
 * @param v 某年的流量格。
 * @returns 两位月数或空串。
 */
function toFlowMonth(v: FlowSeriesEntryJson): string {
  if (v.complete === false) {
    return monthNumOf(text(v.throughMonth))
  }
  return ''
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

// =========================================================================
// 回调(callbacks 抽屉 2026-08-23 撤编后的固定尾段;签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * 各省名额竞争按比值升序 —— 松 → 紧,决策页第二条免费硬事实的展示序。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 比较值。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byRatioAsc(a: ProvCompetition, b: ProvCompetition): number {
  return a.ratio - b.ratio
}
