'use client'
/**
 * 分省概览「难度」列的单元格:难度档药丸(与 jobs/Advisor 的 DIFF_TAG 及原 /stats
 * 索引页省卡同值);没算出来渲横杠 —— 不拿一个档位替官方猜。
 * 2026-08-28 换装批自 Pulse.tsx 的 diff 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { DASH_MARK, TEXT_NONE } from './constants'
import type { ProvCellRow } from './types'

/**
 * 渲染分省概览「难度」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 难度档药丸;没算出来时是横杠。
 */
export function DiffCell(r: ProvCellRow) {
  if (r.tierCls === TEXT_NONE) {
    return <>{DASH_MARK}</>
  }
  return <span className={r.tierCls}>{r.tierText}</span>
}
