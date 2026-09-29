/**
 * seo 域的全部可变状态:两侧分片清单的进程内缓存(照 stats 域 CACHE 同手法)。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清。
 * 2026-09-29 公司分片撤出站点地图,只剩职位一侧。
 *
 * @author Frank
 * @time 2026-09-03 04:10:00
 */

import type { SeoCache } from './types'

/**
 * seo 域全部的可变状态,就这两格。
 */
export const CACHE: SeoCache = {
  /**
   * 职位分片清单(收录口径的岗 id + lastmod + 近 7 天旗全量,一小时 TTL;2026-09-26 前是在架岗 id + last_seen)。
   */
  jobs: null,

  /**
   * 职位清单后台刷新中。
   */
  jobsBusy: false,
}
