/**
 * 榜单域的行为:榜行读取(E5-02)。rankings 页与 /api/rankings/data 共用同一查询与映射
 * (E8-02 弹窗化,不许 fork)。零计算 —— 只 SELECT rankings 表(计算在 etl/10_build_rankings.py)。
 * 池由调用方注进来,本文件不 import payload(2026-08-23 方案 A 重申:functions 全纯,routes/页面拿 getDb 再注)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { queryRows, SQL, numOrNull, text } from '../db'
import type { Db } from '../db'
import type { FetchRowsIn, RowsOut, SlugsOut, RankDbRow, RankRow, SlugDbRow } from './types'

/**
 * 当前实际有数据的榜 slug(大类榜岗不够当天不出榜 —— 导航只显示存在的)。
 *
 * @param db 能查的连接(池由调用方注进来)。
 * @returns 有数据的榜 slug 清单。
 */
export async function fetchRankingSlugs(db: Db): SlugsOut {
  return queryRows({ db: db, sql: SQL.RANKING_SLUGS_ALL, params: [], map: toSlug })
}

/**
 * 一个榜的全部行。
 *
 * @param input 连接与榜 slug。
 * @returns 榜行(名次序)。
 */
export async function fetchRankingRows(input: FetchRowsIn): RowsOut {
  return queryRows({ db: input.db, sql: SQL.RANKING_ROWS, params: [input.slug], map: toRankRow })
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

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
