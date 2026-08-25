/**
 * 官方资料域的行为:官方原句 → 界面译名。
 *
 * @author Frank
 * @time 2026-08-22 22:00:00
 */

import { LABEL_MISS, officialLabels, OR_TAIL_DROP, OR_TAIL_RE } from './constants'
import type { LangCode, OfficialLabelIn } from './types'

/**
 * 官方原句 → 界面语言的译名(表里没有原样返回官方原文)。体内 `as LangCode` 是跨边界收窄:
 * 调用端拿到的 `t.lang` 是宽字符串,不认识的语言在查表落空后回落原文。
 * 尾部悬空的 ", or" 摘掉 —— 官方原文里那个 or 是表格排版留下的(下一行接着念),
 * 单拎出来放进选项就是个悬空的 or(英文界面实拍);二选一改由 UI 表达。
 *
 * @param input 官方原句与界面语言。
 * @returns 译名(或官方原文)。
 */
export function officialLabel(input: OfficialLabelIn): string {
  const row = officialLabels[input.raw]
  let hit = LABEL_MISS
  if (row != null) {
    const v = row[input.lang as LangCode]
    if (v != null) {
      hit = v
    }
  }
  if (hit === '') {
    hit = input.raw
  }
  return hit.replace(OR_TAIL_RE, OR_TAIL_DROP)
}
