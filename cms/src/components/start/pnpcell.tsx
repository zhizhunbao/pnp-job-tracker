'use client'
/**
 * 职业榜「可提名省份」列的单元格(E13-05 榜 A 专用 —— 真口径可提名省份 pnp_provs,
 * 含排除式省 / 雇主担保类,与「紧缺清单省份」列语义不同、互斥出现)。
 * Frank 2026-08-08 拍 A 方案:全码直陈退役(翻案后行行 8-9 省 = 没区分度,且全是
 * 雇主锚定通道)—— 压缩成「N 省可走」+ 只标例外:走不了的省红字(措辞与雷区榜同源
 * 「{provs} 无通道」);「先省内工作 6 个月」的五省灰行同日拍删(细则归 PNP 弹框 whyCond,
 * 榜上只留可走面)。
 * 2026-08-28 换装批自 Pulse.tsx 的 pnpProvsCell 闭包提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { DASH_MARK, TEXT_NONE } from './constants'
import type { OccCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染职业榜「可提名省份」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 「N 省可走」+ 走不了的省;两者都没有时是灰色横杠。
 */
export function PnpCell(r: OccCellRow) {
  if (r.pnpText === TEXT_NONE) {
    return <span className={css.dim}>{DASH_MARK}</span>
  }
  return (
    <span className={css.block}>
      <span className={css.pnpOk}>
        {r.pnpText}
        {r.pnpMissing !== TEXT_NONE && <span className={css.pnpMissing}>{r.pnpMissing}</span>}
      </span>
    </span>
  )
}
