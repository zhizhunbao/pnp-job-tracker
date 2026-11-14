/**
 * assistant 组件桶的全部可变状态:消息号计数(一页一份,当列表 key 用)。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */
import type { AssistantCache } from './types'

/**
 * 本域全部的可变状态,就这一格。
 */
export const CACHE: AssistantCache = {
  /**
   * 最后发出的消息号;开机是 0。
   */
  seq: 0,
}
