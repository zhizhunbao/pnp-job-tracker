/**
 * 榜单域的行为:榜行读取(E5-02)。rankings 页与 /api/rankings-data 共用同一查询与映射
 * (E8-02 弹窗化,不许 fork)。零计算 —— 只 SELECT rankings 表(计算在 etl/10_build_rankings.py)。
 * 池由调用方注进来,本文件不 import payload。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { queryRows, SQL } from '../db'
import type { Db } from '../db'
import { toRankRow, toSlug } from './rows'
import type { FetchRowsIn, RowsOut, SlugsOut } from './types'

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
