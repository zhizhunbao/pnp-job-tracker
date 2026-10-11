/**
 * toast 组件桶的全部可变状态:卡号计数(一页一份,够分清同时叠着的几张)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import type { ToastCache } from './types'

/**
 * 本域全部的可变状态,就这一格。
 */
export const CACHE: ToastCache = {
  /**
   * 最后发出的卡号;开机是 0。
   */
  seq: 0,
}
