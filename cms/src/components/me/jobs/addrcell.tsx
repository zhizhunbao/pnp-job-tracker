'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「地址」格 —— 地点一行(照 Indeed,点了去 Google 地图)+ 「市译名,省译名」灰字;打码行是模糊假字。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Name } from '@/components/name'
import { TEXT_NONE } from './constants'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染地址格。
 *
 * @param r 这一行的展示行。
 * @returns 一行地址(+ 灰字);没有地点是空格。
 */
export function AddrCell(r: ListRow) {
  if (r.locked) {
    return <span aria-hidden className={cssOf(css.blur)}>{r.address}</span>
  }
  if (r.addressHref === TEXT_NONE) {
    return null
  }
  return <Name en={r.address} sub={r.addressSub} href={r.addressHref} />
}
