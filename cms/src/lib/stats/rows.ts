/**
 * SQL 原始行 → 本域形状的构造器(一条 SQL 一个)+ 两个 json 行的原样透传。
 * 体内只许词汇表 + 纯拼装;info/difficulty 两列 json 的解析是真会抛的 JSON.parse,
 * 归 `functions.ts` 的接缝函数,不进这里。
 *
 * @author Frank
 * @time 2026-08-22 14:00:00
 */

import { jsonOrNull, numOrNull, text, textOrNull } from '../db'
import { EMPTY_TOP_CITIES, MID_ALL } from './constants'
import type {
  CityRow, MaybeProvVol, MaybeProvVolJson, MaybeProvVolNum, MaybeProvVolNumJson, MaybeStatDiff, MaybeStr,
  OccRow, Row, SrcRow, StatDbRow, StatDifficulty, StatProvDiffDbRow, StatProvDiffFact, StatProvInfoDbRow,
  StatProvInfoFact, StatRow,
} from './types'

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
  let difficulty: StatDifficulty = null
  if (r.difficulty != null) {
    difficulty = r.difficulty
  }
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
