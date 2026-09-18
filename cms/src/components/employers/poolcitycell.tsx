'use client'
/**
 * 域内哑单元格:雇主板「市」列 —— 洗行时算好的一行文字,没有就渲灰色横杠
 * (2026-09-18 雇主板换版:地点一列换成 类别 / 省 / 市 三列;Frank 拍板格子里不要胶囊也不要灰注)。
 *
 * @author Frank
 * @time 2026-09-18 14:00:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染市格。
 *
 * @param r 这一行的展示行。
 * @returns 开 Google 地图的链接(新标签),或灰色横杠。
 */
export function PoolCityCell(r: EmployerCellRow) {
  if (r.cityHref === TEXT_NONE) {
    return <DashText v={{ text: r.cityText, cls: TEXT_NONE }} />
  }
  return <LinkButton href={r.cityHref} target={TARGET_BLANK} className={cssOf(css.mapLink)}>{r.cityText}</LinkButton>
}
