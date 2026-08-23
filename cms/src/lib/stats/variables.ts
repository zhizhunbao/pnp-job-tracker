/**
 * 统计域的全部可变状态:市场主图四件套的进程内缓存。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清。
 * Render 单实例,进程缓存即全局缓存(与 start 页 homeCache 同手法)。
 *
 * @author Frank
 * @time 2026-08-23 03:30:00
 */

import type { StatsCache } from './types'

/**
 * 统计域全部的可变状态,就这一格。
 */
export const CACHE: StatsCache = {
  /**
   * /api/stats/market 的四件套缓存(occ ~3400 行是最重的一坨;10 分钟 TTL)。
   */
  market: null,
}
