'use client'
/**
 * 公司榜表格「省」列的单元格:渲染省码。
 * #48(第 18 轮):跨省雇主(如加拿大军队)库里的 province 为空,裸空格子像渲染缺陷
 * —— 占位一个灰色横杠,读得出「本站没记这一家的省」。
 * 2026-08-28 换装批自 Ranking.tsx 的公司榜列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { DashText } from './dashtext'
import type { RankCompanyCellRow } from './types'

/**
 * 渲染公司榜「省」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 省码,没记省时是灰色横杠。
 */
export function ProvCell(r: RankCompanyCellRow) {
  return <DashText v={r.prov} />
}
