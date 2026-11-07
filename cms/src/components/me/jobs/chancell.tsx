'use client'
/**
 * me 桶子桶 jobs 的哑单元格:「通道」格(2026-10-12 Frank「这个为什么推荐?也没有吸引力?要不改成通道列吧」)——
 * 英文通道名 + 界面语灰字;不走省提名出一道长横。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Name } from '@/components/name'
import { CHAN_NONE, TEXT_NONE } from './constants'
import type { ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染通道格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名;没有出长横。
 */
export function ChanCell(r: ListRow) {
  if (r.chanEn === TEXT_NONE) {
    return <span className={cssOf(css.chanNone)}>{CHAN_NONE}</span>
  }
  return <Name en={r.chanEn} sub={r.chanSub} />
}
