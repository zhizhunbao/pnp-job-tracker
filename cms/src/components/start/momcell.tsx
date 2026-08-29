'use client'
/**
 * 职业榜「14 天新发环比」列的单元格。口径 = **近 14 天新发环比 mom14d**(契约 v3):
 * 30 天窗卡在抓取爬坡期(假涨)、下架 / 净流失卡在排水期(虚高),两者的数字与措辞
 * 都不上前端(同入 E13-04)。单行缺值显横杠 —— 整榜全缺时这一列压根不进列组。
 * 2026-08-28 换装批自 Pulse.tsx 的 mom 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { DASH_MARK, TEXT_NONE } from './constants'
import type { OccCellRow } from './types'

/**
 * 渲染职业榜「14 天新发环比」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 带涨跌配色的百分数;这一行没算出来时是横杠。
 */
export function MomCell(r: OccCellRow) {
  if (r.momText === TEXT_NONE) {
    return <>{DASH_MARK}</>
  }
  return <span className={r.momCls}>{r.momText}</span>
}
