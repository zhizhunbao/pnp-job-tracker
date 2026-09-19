'use client'
/**
 * 域内哑单元格:雇主板「总部」列 —— 洗行时算好的「区, 市, 省码」一行,点开 Google 地图(有公司地址就定位到地址);
 * 省市区都没记就渲灰色横杠(2026-09-19 Frank「需要加一个总部列,包含省市区,可以点击跳转到 google map」)。
 *
 * @author Frank
 * @time 2026-09-19 14:00:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染总部格。
 *
 * @param r 这一行的展示行。
 * @returns 开 Google 地图的链接(新标签),或灰色横杠。
 */
export function PoolHqCell(r: EmployerCellRow) {
  if (r.hqHref === TEXT_NONE) {
    return <DashText v={{ text: r.hqText, cls: TEXT_NONE }} />
  }
  return <LinkButton href={r.hqHref} target={TARGET_BLANK} className={cssOf(css.mapLink)}>{r.hqText}</LinkButton>
}
