'use client'
/**
 * 哑单元格:题号(灰字)。表格把整行当 props 递进来。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import type { PteCellRow } from './types'
import css from './pte.module.css'

/**
 * 渲染题号格。
 *
 * @param r 展示行。
 * @returns 格。
 */
export function NumCell(r: PteCellRow) {
  return <span className={css.dim}>{r.num}</span>
}
