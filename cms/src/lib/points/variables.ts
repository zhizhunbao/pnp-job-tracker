/**
 * 分值域的全部可变状态:决策页官方表包的进程内单件缓存。
 *
 * 🔴 为什么要有这份缓存(2026-08-12 立,2026-08-22 自 lib/score 并入时原文搬来):
 * /plan/pr 是一级导航页 + Google 落地页,原先 force-dynamic 每请求两条查询
 * (draws 200 行 + factors 全表),并把 **192 行分值表 ≈ 88KB** 整份塞进客户端 props ——
 * 而它只在「答完题、且目标省落在 ON/BC/MB/SK/NL」时才有人看。
 * 站级聚合禁每请求现算(prod-pool-wedge 教训),与判定底表缓存同 TTL 同手法。
 * TTL 到点重取;Render 单实例,重启即失效。
 *
 * @author Frank
 * @time 2026-08-22 12:10:00
 */

import type { PointsCache } from './types'

/**
 * 分值域全部的可变状态,就这一格。
 */
export const CACHE: PointsCache = {
  /**
   * 官方表包那一份。**开机是空的** —— 第一次取的人负责灌,之后按 TTL 重取。
   */
  scoreTables: null,
}
