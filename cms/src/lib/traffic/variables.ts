/**
 * 流量域的全部可变状态:这一小时的三路账本与连接字节水位(Render 单实例 = 进程内即全站)。
 *
 * @author Frank
 * @time 2026-10-01 19:00:00
 */

import type { TrafficCache } from './types'

/**
 * 流量域全部的可变状态,就这六格。每小时出账后三路账本与总账清零。
 */
export const CACHE: TrafficCache = {
  /**
   * 开机没订。
   */
  installed: false,

  /**
   * 开机是空的。
   */
  sentBy: new WeakMap(),

  /**
   * 开机是零。
   */
  total: { count: 0, bytes: 0 },

  /**
   * 开机是空的。
   */
  ua: new Map(),

  /**
   * 开机是空的。
   */
  path: new Map(),

  /**
   * 开机是空的。
   */
  ip: new Map(),
}
