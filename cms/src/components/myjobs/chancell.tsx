'use client'
/**
 * 域内哑单元格:「通道」格 —— 这一岗能走的省提名通道,英文名黑字 + 界面语名灰字;不走省提名出长横
 * (2026-10-12 Frank「这个为什么推荐?也没有吸引力?要不改成通道列吧」,今日推荐「为什么推荐」列换成它;手机卡 MjCard 也摆它)。
 *
 * @author Frank
 * @time 2026-10-12 16:00:00
 */
import { Name } from '@/components/name'
import { CHAN_NONE, TEXT_NONE } from './constants'
import type { ListRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染通道格。
 *
 * @param r 这一行的展示行。
 * @returns 两行名;没有出长横。
 */
export function ChanCell(r: ListRow) {
  if (r.chanEn === TEXT_NONE) {
    return <span className={css.chanNone}>{CHAN_NONE}</span>
  }
  return <Name en={r.chanEn} sub={r.chanSub} />
}
