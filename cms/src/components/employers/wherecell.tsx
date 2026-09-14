'use client'
/**
 * 域内哑单元格:雇主板「地点」列 —— 多地点胶囊(「市, 省码」紧凑格,主场第一,最多三枚;
 * 2026-09-13 Frank「要不然把省市合并成一个地址列」「多个地址用胶囊」;胶囊走通用 tag 桶 —— 同日「胶囊样式不能全站统一一下吗」);
 * 池里没记地点渲灰色横杠。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { Tag } from '@/components/tag'
import { TAG_LOC, TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染地点格。
 *
 * @param r 这一行的展示行。
 * @returns 一到三枚地点胶囊,或灰色横杠。
 */
export function WhereCell(r: EmployerCellRow) {
  if (r.locations.length === 0) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  const chips = []
  for (const loc of r.locations) {
    chips.push(<Tag key={loc} variant={TAG_LOC}>{loc}</Tag>)
  }
  return <span className={css.locs}>{chips}</span>
}
