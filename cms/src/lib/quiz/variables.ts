/**
 * 答题域的全部可变状态:运行态答案档 + 服务端同步的闸标 + 热门职业缓存。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清。
 * 各格的语义(尤其 hydrated 那条红线)见 types.ts 的 QuizCache 逐格注释。
 *
 * @author Frank
 * @time 2026-08-18 04:36:46
 */

import type { QuizCache } from './types'

/**
 * 答题域全部的可变状态,就这一格。
 */
export const CACHE: QuizCache = {
  /**
   * 运行态答案档。
   */
  mem: null,

  /**
   * 运行态分值卡档。
   */
  memScore: null,

  /**
   * 登录态(null=未知)。
   */
  loggedIn: null,

  /**
   * 防抖定时器。
   */
  syncTimer: null,

  /**
   * 退避重试定时器。
   */
  retryTimer: null,

  /**
   * 已重试次数。
   */
  retryN: 0,

  /**
   * 有改动还没推成功。
   */
  dirty: false,

  /**
   * 拉过服务端档没有(没拉过一个字节都不许推)。
   */
  hydrated: false,

  /**
   * 离开页面兜底已挂上没有。
   */
  guarded: false,

  /**
   * 热门职业:条数 → 缓存格。
   */
  top: new Map(),

  /**
   * 热门职业:条数 → 在途首查。
   */
  topPending: new Map(),
}
