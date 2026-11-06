'use client'
/**
 * 域内哑单元格:操作格 —— 一颗「删除」钮(2026-11-06 Frank「全都加一个删除按钮」)。四张表共用,只读展示行的 del 一格。
 *
 * @author Frank
 * @time 2026-11-06 00:40:00
 */
import { DelButton } from './delbutton'
import type { DelCellRow } from './types'

/**
 * 渲染操作格。
 *
 * @param r 这一行的展示行。
 * @returns 删除钮。
 */
export function DelCell(r: DelCellRow) {
  return <DelButton del={r.del} />
}
