'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「地址」格(完整地址一行,整行一个地图链;界面语译名灰字在下)。
 * 2026-11-11 Frank「我的投递 地点改成地址」:只有我的投递这张表用,收藏与推荐仍是「地点」格(PlaceCell)。
 *
 * @author Frank
 * @time 2026-11-11 15:00:00
 */
import { Name } from '@/components/name'
import { TEXT_NONE } from './constants'
import type { ListRow } from './types'

/**
 * 渲染地址格。
 *
 * @param r 这一行的展示行。
 * @returns 完整地址一行(+ 灰字);没有地图链接是黑字;没有地址是空格。
 */
export function AddrCell(r: ListRow) {
  if (r.address === TEXT_NONE) {
    return null
  }
  if (r.addressHref === TEXT_NONE) {
    return <Name en={r.address} sub={r.addressSub} />
  }
  return <Name en={r.address} sub={r.addressSub} href={r.addressHref} />
}
