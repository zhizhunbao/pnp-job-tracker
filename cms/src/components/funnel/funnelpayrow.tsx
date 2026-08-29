'use client'
/**
 * 漏斗表尾行「⑥ 真实付费」:它是 colSpan 合并行不走列模型,所以走 Table 的 foot 槽
 * (2026-08-11 换公共 Table 时新加的槽),排版自己来 —— 三格的 token 逐字对齐表体单元格。
 * 两个数分开摆:proUntil 有值的(含人工赠送)与真走过 Checkout 的 —— 手工开的 Pro
 * 不能冒充收款。
 * 2026-08-27 换装批自 Funnel.tsx 的 foot 槽提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */
import { PAY_LABEL_TEXT, PAY_NOTE_SPAN } from './constants'
import { footCountClsOf, footLabelClsOf, footNoteClsOf } from './functions'
import type { FunnelPayRowIn } from './types'

/**
 * 渲染漏斗表尾行「⑥ 真实付费」的那一行。
 *
 * @param props 尾行的两个数(逐格注释见 FunnelPayCellRow)。
 * @returns 表体末尾的合并行。
 */
export function FunnelPayRow({ pay }: FunnelPayRowIn) {
  return (
    <tr>
      <td className={footLabelClsOf()}>{PAY_LABEL_TEXT}</td>
      <td className={footCountClsOf()}>{pay.proText}</td>
      <td className={footNoteClsOf()} colSpan={PAY_NOTE_SPAN}>{pay.noteText}</td>
    </tr>
  )
}
