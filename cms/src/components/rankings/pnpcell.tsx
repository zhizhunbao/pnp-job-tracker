'use client'
/**
 * 职位榜表格「PNP」列的单元格:省提名通道的三语显示名(小半档字号 —— 通道名长,
 * 小一档才排得下一行)。这个岗没命中通道时渲灰色横杠。
 * #199(Frank「拆成两列」):PNP/EE 原是一列合并显示,拆成两列后与主表列名同源。
 * 2026-08-28 换装批自 Ranking.tsx 的职位榜列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { DashText } from './dashtext'
import type { RankJobCellRow } from './types'

/**
 * 渲染职位榜「PNP」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 通道名,没命中时是灰色横杠。
 */
export function PnpCell(r: RankJobCellRow) {
  return <DashText v={r.pnp} />
}
