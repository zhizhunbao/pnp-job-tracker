'use client'
/**
 * 通道表「职业码」列的单元格:5 位职业码渲成灰字 —— 站规 ui-plain-language,
 * 码是给人核对的小注,主文案是隔壁那一列的职业名。
 * 2026-08-28 换装批自 Occupations.tsx 的同名列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import type { OccCellRow } from './types'
import css from './occupations.module.css'

/**
 * 渲染通道表「职业码」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 灰字职业码。
 */
export function NocCell(r: OccCellRow) {
  return <span className={css.noc}>{r.noc}</span>
}
