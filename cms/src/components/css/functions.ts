/**
 * CSS Modules 的消化点(开灯批 2026-08-26):css 模块是字符串索引签名,
 * noUncheckedIndexedAccess 开灯后 `css.x` 一律 `string | undefined`。
 * 键是编译期写死的 —— 查不到只有一种可能:拼写错。所以这个词**不兜底、当场炸**
 * (静默留空 = 无样式上线没人发现,宪法「出错不静默」);dev/测试首渲即暴露。
 *
 * @author Frank
 * @time 2026-08-26 05:00:00
 */
import { fail } from '@/lib/error'
import { CSS_ERR_MSG, CSS_ERR_NAME } from './constants'

/**
 * css 模块的一格 → 保证存在的类名;缺格(拼写错)当场抛。
 *
 * @param x css 模块按键取出的类名;键缺席时 undefined。
 * @returns 类名。
 */

export function cssOf(x: string | undefined): string {
  if (x == null) {
    throw fail({ name: CSS_ERR_NAME, msg: CSS_ERR_MSG, code: null })
  }
  return x
}
