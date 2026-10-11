/**
 * 我的岗位域(lib/myjobs)的全部可变状态:今日推荐按人按天的缓存(2026-10-10 批 2;站级聚合禁每请求现算,
 * 推荐一人一天算一次,当天再来只补查他碰过哪些岗)。单实例部署,进程缓存即全局缓存。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import type { MyJobsCache } from './types'

/**
 * 本域全部的可变状态,就这一格。
 */
export const CACHE: MyJobsCache = {
  /**
   * 用户 id → 当天的推荐。开机是空的;满 PICKS_CACHE_MAX 人整个清空。
   */
  picks: new Map(),
}
