/**
 * 配额域的全部可变状态:进程内日配额计数器。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清。
 *
 * @author Frank
 * @time 2026-08-22 18:00:00
 */

import type { QuotaCache } from './types'

/**
 * 配额域全部的可变状态,就这一格。
 */
export const CACHE: QuotaCache = {
  /**
   * 计数桶(键 → {日子, 今日次数})。开机是空的,过日自然清零。
   */
  buckets: new Map(),
}
