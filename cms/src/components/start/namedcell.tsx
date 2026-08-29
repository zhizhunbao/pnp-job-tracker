'use client'
/**
 * 分省概览「具名通道岗数」列的单元格:有数走琥珀半粗,没清单的省改渲一句「无清单」
 * —— 它不是 0,是这个省压根没有具名紧缺清单,两者在用户那里意思相反。
 * 2026-08-28 换装批自 Pulse.tsx 的 named 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { TEXT_NONE } from './constants'
import type { ProvCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染分省概览「具名通道岗数」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 琥珀数值;没清单时是灰色的「无清单」。
 */
export function NamedCell(r: ProvCellRow) {
  if (r.namedText === TEXT_NONE) {
    return <span className={css.dim}>{r.noListText}</span>
  }
  return <span className={css.named}>{r.namedText}</span>
}
