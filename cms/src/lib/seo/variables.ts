/**
 * seo 域的全部可变状态:两侧分片清单的进程内缓存(照 stats 域 CACHE 同手法)。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清。
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
   * 职位分片清单(在架岗 id + last_seen 全量,一小时 TTL)。
   */
  jobs: null,

  /**
   * 公司分片清单(有在招岗的公司 slug + last_seen 全量,一小时 TTL)。
   */
  companies: null,

  /**
   * 职位清单后台刷新中。
   */
  jobsBusy: false,

  /**
   * 公司清单后台刷新中。
   */
  companiesBusy: false,
}
