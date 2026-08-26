/**
 * 统计域的行为:slug 映射(浏览器也用)+ 六个取数(E5-04 地区统计 / E8-14 主图 / 批B 省卡)。
 * 取数只做「SELECT → 行映射」,零计算,页面只渲染;SQL 文本全在 `lib/db/sql`。
 * 池由调用方注进来(拍板③),本文件不 import payload。
 *
 * 2026-08-22 十件套定型时的两处收窄:`loadStats` 的 where/params 两个参数
 * 全站调用从来都是空 —— 收成 `{db, withMid}`;`loadCityStats` 的 limit 全站只用默认 400 ——
 * 收成常量 `CITY_LIMIT`。要变的那天再还给入参,别让没人用的自由度撑着签名。
 *
 * @author Frank
 * @time 2026-08-22 14:00:00
 */

import { queryRows, queryRowsOrEmpty, SQL, jsonOrNull, numOrNull, text, textOrNull } from '../db'
import type { Db } from '../db'
import {
  CITY_LIMIT, OCC_COL_NONE, OCC_COL_PREFIX, OCC_EXTRA_COLUMNS, PG_UNDEFINED_COLUMN,
  PG_UNDEFINED_TABLE, PG_CODE_NONE, STAT_SOURCE_FIELDS, MAX_FINE_ROWS, EMPTY_TOP_CITIES, MID_ALL,
} from './constants'
import type {
  CaughtError, ChannelNocs, ChannelNocsOut, ChannelNocsQueryIn, CityRowsOut, EmptyList, FineCountsIn, FineRowsOut,
  MaybeStr, OccRowsOut, PgFailure, ProvExtraMap, ProvExtraOut, SrcRowsOut, StatsIn, StatsOut, StrList, StrListOut,
  CityRow, FineRow, MaybeProvVol, MaybeProvVolJson, MaybeProvVolNum, MaybeProvVolNumJson, MaybeStatDiff, OccRow, Row,
  SrcRow, StatDbRow, StatDifficulty, StatProvDiffDbRow, StatProvDiffFact, StatProvInfoDbRow, StatProvInfoFact,
  StatRow,
} from './types'

/**
 * pg 错误码(pg 的错误对象带 code;不是它的错空串)。体内那一步 `as PgFailure` 是跨边界断言:
 * code 是 pg 挂上去的,TS 看不见 —— 形状声明在 types 的 `PgFailure`。
 *
 * @param e 捕到的错误。
 * @returns pg 错误码;不是 pg 的错是空串。
 */
function pgCodeOf(e: CaughtError): string {
  const withCode = e as PgFailure
  if (typeof withCode.code === 'string') {
    return withCode.code
  }
  return PG_CODE_NONE
}

/**
 * 地区统计行(stats 表)。withMid=true 才带中类行(仅图表下钻用);默认只回大类层 ——
 * 既有页面(省页/对比/表格)口径不变不重复计数。
 * 缺列容错(E12-06 教训):mid 列 DDL 未落地时自动降级为无 mid 查询,行回退 mid='all',页面照常;
 * 其余错误照抛(调用方各自 .catch 决定丢哪块)。
 *
 * @param input 连接与粒度开关。
 * @returns 统计行。
 */
export async function loadStats(input: StatsIn): StatsOut {
  let sql = SQL.STATS_BROAD_ROWS
  if (input.withMid) {
    sql = SQL.STATS_WITH_MID
  }
  try {
    return await queryRows({ db: input.db, sql: sql, params: [], map: toStatRow })
  } catch (e) {
    if (e instanceof Error && pgCodeOf(e) === PG_UNDEFINED_COLUMN) {
      return queryRows({ db: input.db, sql: SQL.STATS_FALLBACK_BROAD, params: [], map: toStatRow })
    }
    throw e
  }
}

/**
 * 省卡 IRCC 体量 + 难度档(批B #133):info=provinces.info jsonb(学签/工签/PR,
 * scrape_ircc_stats 产),tier=stats.difficulty(broad=all 行)的 tier 字段;
 * 两者与 E8-12 省弹框同源,不另造口径。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 省码 → 省卡增补。
 */
export async function loadProvExtra(db: Db): ProvExtraOut {
  const [infoRows, diffRows] = await Promise.all([
    queryRows({ db: db, sql: SQL.PROVINCES_INFO, params: [], map: toStatProvInfoFact }),
    queryRows({ db: db, sql: SQL.PROV_DIFFICULTY, params: [], map: toStatProvDiffFact }),
  ])
  const out: ProvExtraMap = {}
  for (const r of infoRows) {
    out[r.code] = { info: r.info, tier: null }
  }
  for (const r of diffRows) {
    const hit = out[r.province]
    if (hit != null) {
      hit.tier = r.tier
    } else {
      out[r.province] = { info: null, tier: r.tier }
    }
  }
  return out
}

/**
 * citation 来源(复用 E4-04 field-sources 维度):岗量=Job Bank、薪资=ESDC、通道=省清单。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 来源行。
 */
export async function loadStatSources(db: Db): SrcRowsOut {
  return queryRows({ db: db, sql: SQL.STAT_FIELD_SOURCES, params: [STAT_SOURCE_FIELDS], map: toSrcRow })
}

/**
 * E8-14 统计主图·职业粒度(mart 算好,这里只 SELECT)。
 * 派生列**逐列探测**而不是整句 try/catch:E13-02 的 DDL 分批落库,少一列不该把其余几列
 * 一起打回 null —— 探到哪列就 SELECT 哪列,没探到的映射层给 null(前端「null=整块不渲」照旧)。
 * 缺表容错(同 loadStats 的 42703 先例):DDL 未落地时回空数组,主图整块不渲,页面照常。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 职业统计行。
 */
export async function loadOccStats(db: Db): OccRowsOut {
  const have = await queryRowsOrEmpty({ db: db, sql: SQL.STATS_OCC_HAS_COLUMNS, params: [OCC_EXTRA_COLUMNS], map: toColumnName })
  let extra = OCC_COL_NONE
  for (const c of have) {
    if (c !== '') {
      extra += OCC_COL_PREFIX + c
    }
  }
  try {
    return await queryRows({ db: db, sql: SQL.statsOccupations(extra), params: [], map: toOccRow })
  } catch (e) {
    if (e instanceof Error) {
      const code = pgCodeOf(e)
      if (code === PG_UNDEFINED_TABLE || code === PG_UNDEFINED_COLUMN) {
        return []
      }
    }
    throw e
  }
}

/**
 * E8-14 统计主图·城市粒度(城市译名借 cities 维度表:48 个主要城市有中/韩名,
 * 小镇留空 → 前端回退英文原名)。缺表容错同 loadOccStats。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 城市统计行(按在招量取前 CITY_LIMIT)。
 */
export async function loadCityStats(db: Db): CityRowsOut {
  try {
    return await queryRows({ db: db, sql: SQL.CITY_STATS, params: [CITY_LIMIT], map: toCityRow })
  } catch (e) {
    if (e instanceof Error) {
      const code = pgCodeOf(e)
      if (code === PG_UNDEFINED_TABLE || code === PG_UNDEFINED_COLUMN) {
        return []
      }
    }
    throw e
  }
}

/**
 * 单条通道码清单(缺表/缺列回空,其余照抛 —— 与 loadOccStats 同一容缺口径)。
 *
 * @param input 连接与语句。
 * @returns 去空后的职业码清单。
 */
async function channelNocsOf(input: ChannelNocsQueryIn): StrListOut {
  try {
    const rows = await queryRows({ db: input.db, sql: input.sql, params: [], map: toNocCode })
    const out: StrList = []
    for (const n of rows) {
      if (n !== '') {
        out.push(n)
      }
    }
    return out
  } catch (e) {
    if (e instanceof Error) {
      const code = pgCodeOf(e)
      if (code === PG_UNDEFINED_TABLE || code === PG_UNDEFINED_COLUMN) {
        return []
      }
    }
    throw e
  }
}

/**
 * E8-14 ⑥ 通道筛选(Frank 2026-07-28:「哪些能走 ee pnp aip qc 的单独通道也需要筛选」):
 * 只取**职业粒度能判定**的两条 —— 省提名具名清单(pnp_occupations)与联邦 EE 类别(ee_categories)。
 * AIP 只有雇主级名单(职业粒度要先给统计表补列),QC 数据层没有职业清单 —— 两者不在此列,不假装能筛。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 两条通道的职业码清单。
 */
export async function loadChannelNocs(db: Db): ChannelNocsOut {
  const [pnp, ee] = await Promise.all([
    channelNocsOf({ db: db, sql: SQL.PNP_NOCS_DISTINCT }),
    channelNocsOf({ db: db, sql: SQL.EE_NOCS_DISTINCT }),
  ])
  return { pnp: pnp, ee: ee }
}

/**
 * 单省×大类×中类的在招岗按小类计数（/api/stats/fine 的取数；现查现算，
 * 小类级不进 stats 表 —— 行数爆炸）。
 *
 * @param input 连接与三级分类值。
 * @returns 小类计数行（≤ MAX_FINE_ROWS）。
 */
export async function loadFineCounts(input: FineCountsIn): FineRowsOut {
  return queryRows({ db: input.db, sql: SQL.fineCounts(MAX_FINE_ROWS), params: [input.prov, input.broad, input.mid], map: toFineRow })
}

/**
 * 单表查挂时的空清单兜底（catch 传具名函数；丢一张表不丢整图）。
 *
 * @param _e 捕到的错（查询层已留痕）。
 * @returns 空数组。
 */
export function emptyRows(_e: Error): EmptyList {
  return []
}

/**
 * 通道清单查挂时的空兜底。
 *
 * @param _e 捕到的错。
 * @returns 空 pnp/ee。
 */
export function emptyChannels(_e: Error): ChannelNocs {
  return { pnp: [], ee: [] }
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * 一行地区统计(SQL.STATS_WITH_MID / STATS_BROAD_ROWS / STATS_FALLBACK_BROAD 共用)→ `StatRow`。
 * 降级路(mid 列未落地)没有 mid/difficulty 两列 —— mid 回填 'all'、difficulty 落 null,页面照常
 * (E12-06 教训)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toStatRow(r: StatDbRow): StatRow {
  let mid = text(r.mid)
  if (mid === '') {
    mid = MID_ALL
  }
  let topCities = text(r.top_cities)
  if (topCities === '') {
    topCities = EMPTY_TOP_CITIES
  }
  const difficulty: StatDifficulty = r.difficulty
  return {
    province: text(r.province), broad: text(r.broad), mid: mid,
    openJobs: numOrNull(r.open_jobs), new7d: numOrNull(r.new7d),
    medianWageAnnual: numOrNull(r.median_wage_annual), medianSalaryAnnual: numOrNull(r.median_salary_annual),
    namedJobs: numOrNull(r.named_jobs), streamLabels: text(r.stream_labels),
    aipJobs: numOrNull(r.aip_jobs),
    topCities: topCities, fetched: text(r.fetched),
    difficulty: difficulty,
  }
}

/**
 * 一行 citation 来源(SQL.STAT_FIELD_SOURCES)→ `SrcRow`。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toSrcRow(r: Row): SrcRow {
  return { field: text(r.field), publisher: text(r.publisher), url: text(r.url), fetched: text(r.fetched) }
}

/**
 * 一行职业统计(SQL.statsOccupations)→ `OccRow`。探测列没 SELECT 时该格是 undefined ——
 * 词汇表 `== null` 一网收成 null(前端整块不渲)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toOccRow(r: Row): OccRow {
  return {
    noc: text(r.noc), province: text(r.province), titleZh: text(r.title_zh),
    titleZhShort: text(r.title_zh_short), titleEn: text(r.title_en), titleKo: text(r.title_ko),
    teer: numOrNull(r.teer), broad: text(r.broad), mid: text(r.mid), fine: text(r.fine),
    openJobs: numOrNull(r.open_jobs), new7d: numOrNull(r.new7d),
    medianWageAnnual: numOrNull(r.median_wage_annual),
    wageLowAnnual: numOrNull(r.wage_low_annual), wageHighAnnual: numOrNull(r.wage_high_annual),
    medianSalaryAnnual: numOrNull(r.median_salary_annual),
    salaryN: numOrNull(r.salary_n), namedJobs: numOrNull(r.named_jobs),
    new14d: numOrNull(r.new14d), new14dPrev: numOrNull(r.new14d_prev), mom14d: numOrNull(r.mom14d),
    avgDaysOpen: numOrNull(r.avg_days_open), pulseScore: numOrNull(r.pulse_score),
    pnpProvs: textOrNull(r.pnp_provs), channelTier: textOrNull(r.channel_tier),
    deadProvs: textOrNull(r.dead_provs), pnpProvsCond: textOrNull(r.pnp_provs_cond),
    sponsorPosQ: numOrNull(r.sponsor_pos_q), sponsorPosSkilledQ: numOrNull(r.sponsor_pos_skilled_q),
    jvwsVacQ: numOrNull(r.jvws_vac_q), sponsorRate: numOrNull(r.sponsor_rate),
  }
}

/**
 * 一行城市统计(SQL.CITY_STATS)→ `CityRow`。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toCityRow(r: Row): CityRow {
  return {
    city: text(r.city), cityZh: text(r.name_zh), cityKo: text(r.name_ko),
    province: text(r.province), openJobs: numOrNull(r.open_jobs), new7d: numOrNull(r.new7d),
    medianWageAnnual: numOrNull(r.median_wage_annual), medianSalaryAnnual: numOrNull(r.median_salary_annual),
    salaryN: numOrNull(r.salary_n), namedJobs: numOrNull(r.named_jobs),
  }
}

/**
 * 一行列存在性探测(SQL.STATS_OCC_HAS_COLUMNS)→ 列名。
 *
 * @param r 库里的一行。
 * @returns 列名。
 */
export function toColumnName(r: Row): string {
  return text(r.column_name)
}

/**
 * 一行通道码(SQL.PNP_NOCS_DISTINCT / EE_NOCS_DISTINCT)→ 职业码。
 *
 * @param r 库里的一行。
 * @returns 职业码。
 */
export function toNocCode(r: Row): string {
  return text(r.noc)
}

/**
 * 体量一格 json → 干净格(数缺位整格落 null,不给半格)。
 *
 * @param x json 里的体量格。
 * @returns 干净格;缺数是 null。
 */
function volNumOf(x: MaybeProvVolNumJson): MaybeProvVolNum {
  if (x == null) {
    return null
  }
  const n = numOrNull(x.n)
  if (n == null) {
    return null
  }
  return { n: n, year: text(x.year) }
}

/**
 * 解析好的 info json → 省卡体量四格(学签/TFWP/IMP/省提名 PR)。
 *
 * @param v 解析好的 info json。
 * @returns 体量;没有则 null。
 */
function provVolOf(v: MaybeProvVolJson): MaybeProvVol {
  if (v == null) {
    return null
  }
  return { study: volNumOf(v.study), tfwp: volNumOf(v.tfwp), imp: volNumOf(v.imp), pnpPr: volNumOf(v.pnpPr) }
}

/**
 * 解析好的难度 json → 难度档(只读 tier 一格;空串与缺位都落 null)。
 *
 * @param d 解析好的难度 json。
 * @returns 难度档;没有则 null。
 */
function tierOf(d: MaybeStatDiff): MaybeStr {
  if (d == null) {
    return null
  }
  if (d.tier == null || d.tier === '') {
    return null
  }
  return d.tier
}

/**
 * 一行省份维度(SQL.PROVINCES_INFO)→ 省份维度事实。json 解析(词汇 `jsonOrNull`)与
 * 体量提取都在这里做完 —— functions 拿到的 info 即有效(2026-08-22 Frank:
 * 值级清洗不进 functions)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toStatProvInfoFact(r: StatProvInfoDbRow): StatProvInfoFact {
  return { code: text(r.code), info: provVolOf(jsonOrNull(r.info)) }
}

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY)→ 难度事实(tier 的解析与提取同上口径)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toStatProvDiffFact(r: StatProvDiffDbRow): StatProvDiffFact {
  return { province: text(r.province), tier: tierOf(jsonOrNull(r.difficulty)) }
}

/**
 * 一行 fine 下钻（SQL.fineCounts）→ `FineRow`。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toFineRow(r: Row): FineRow {
  let n = 0
  const v = numOrNull(r.n)
  if (v != null) {
    n = v
  }
  return { fine: text(r.fine), n: n }
}
