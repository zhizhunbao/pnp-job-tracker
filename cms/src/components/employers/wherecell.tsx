'use client'
/**
 * 域内哑单元格:雇主板「地点」列 —— 主场城市走把脉页 CityNameCell(2026-09-11 城市显示拍板的唯一出口:
 * 界面语言城市名主文案 + 「英文名 省码」灰注双行形),其余地点收成「另 N 地」灰注;池里没记地点渲灰色横杠。
 * 2026-09-13 Frank「要不然把省市合并成一个地址列」「多个地址用胶囊」→ 三枚「市, 省码」胶囊;同日晚 /fe 雇主页
 * 拍板改接 CityNameCell:97.2% 的雇主 ≤1 处地点,三枚胶囊为 2.8% 设计且挤爆列宽压进邻列(截图实撞)。
 * href 给空 = 不成链(落点归操作列,同日「后面已经有操作列,没必要加 link」);onOpen 是 CityNameCell 的必填格,
 * 不成链就不会被调,随行带 onView 只为填格。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { CityNameCell } from '@/components/start'
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染地点格。
 *
 * @param r 这一行的展示行。
 * @returns 主场城市双行形 + 「另 N 地」,或灰色横杠。
 */
export function WhereCell(r: EmployerCellRow) {
  if (r.whereName === TEXT_NONE) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  return (
    <div>
      <CityNameCell name={r.whereName} note={r.whereNote} href={TEXT_NONE} onOpen={r.onView} />
      {r.whereMore !== TEXT_NONE && <span className={css.sub}>{r.whereMore}</span>}
    </div>
  )
}
