/**
 * SQL 原始行 → 本域形状的构造器(一条 SQL 一个)。体内只许词汇表 + 纯拼装。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { numOrNull, text } from '../db'
import type { RankDbRow, RankRow, SlugDbRow } from './types'

/**
 * 一行榜单(SQL.RANKING_ROWS)→ `RankRow`。kind 空值落 'job':历史行没这列,
 * 而卡片形态靠它分岔,空串会让两种卡都不渲染。
 * 数值列全走 numOrNull —— teer/score/openJobs 这些列官方可空,折 0 = 替官方编数。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toRankRow(r: RankDbRow): RankRow {
  let kind = text(r.kind)
  if (kind === '') {
    kind = 'job'
  }
  return {
    rank: Number(r.rank), kind: kind, externalId: text(r.external_id),
    title: text(r.title), company: text(r.company), city: text(r.city), province: text(r.province),
    noc: text(r.noc), teer: numOrNull(r.teer), score: numOrNull(r.score),
    salaryText: text(r.salary_text), salaryAnnual: numOrNull(r.salary_annual),
    pnpStream: text(r.pnp_stream), eeCategory: text(r.ee_category), datePosted: text(r.date_posted),
    applyUrl: text(r.apply_url), officialUrl: text(r.official_url),
    openJobs: numOrNull(r.open_jobs), namedJobs: numOrNull(r.named_jobs), avgScore: numOrNull(r.avg_score),
    lmiaPositions: numOrNull(r.lmia_positions), lmiaQuarter: text(r.lmia_quarter),
  }
}

/**
 * 一行榜 slug(SQL.RANKING_SLUGS_ALL)→ slug 串。
 *
 * @param r 库里的一行。
 * @returns slug。
 */
export function toSlug(r: SlugDbRow): string {
  return text(r.slug)
}
