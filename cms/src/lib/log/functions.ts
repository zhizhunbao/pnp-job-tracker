/**
 * 留痕域的行为:全站唯一一处 `console.log`。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

import { TAG_L, TAG_R } from './constants'
import type { LogIn, LogOut } from './types'

// =========================================================================
// 1. 出口
// =========================================================================

/**
 * 写一行日志。全站只有这一处 `console.log`。
 *
 * @param input 来源标签与正文。
 * @returns 没有返回值。
 */
export function log(input: LogIn): LogOut {
  // eslint-disable-next-line no-console -- 全站唯一被特批的一处:这个函数存在的意义就是「只有这里能写 console」
  console.log(TAG_L + input.tag + TAG_R + input.text)
}
