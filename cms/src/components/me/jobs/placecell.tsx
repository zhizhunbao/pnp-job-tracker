'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「地点」格 —— 「市, 省码」英文黑字(点了去 Google 地图,按完整地址一行查)+ 「市译名,省译名」灰字。
 * 2026-11-07 Frank「现在都按 Azure 的来」:原「地址」格(完整地址一行,addrcell.tsx)改这一格,三张表同一形;手机一条照旧。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Name } from '@/components/name'
import { TEXT_NONE } from './constants'
import type { ListRow } from './types'

/**
 * 渲染地点格。
 *
 * @param r 这一行的展示行。
 * @returns 「市, 省码」(+ 灰字);没有地图链接是黑字;没有地点是空格。
 */
export function PlaceCell(r: ListRow) {
  if (r.place === TEXT_NONE) {
    return null
  }
  if (r.addressHref === TEXT_NONE) {
    return <Name en={r.place} sub={r.addressSub} />
  }
  return <Name en={r.place} sub={r.addressSub} href={r.addressHref} />
}
