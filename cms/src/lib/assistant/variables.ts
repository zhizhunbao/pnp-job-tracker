/**
 * 对话助手域的全部可变状态:探活结果的进程内缓存。
 * 摆成一个容器对象:这个域一共多少可变状态,一眼数得清。
 *
 * @author Frank
 * @time 2026-11-14 10:00:00
 */

import type { ReadyCache } from './types'

/**
 * 对话助手域全部的可变状态,就这一格。
 */
export const CACHE: ReadyCache = {
  /**
   * 上一次探活的毫秒时刻;开机是 0(还没探过)。
   */
  readyAt: 0,

  /**
   * 上一次探活的结果。
   */
  ready: false,
}
