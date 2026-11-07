'use client'
/**
 * me 桶子桶 profile 的结构:「我的通道」手机上一条通道一张卡(2026-10-13;窄于 768 不走表格,照「我的求职」手机卡 MjCard 的形):
 * 通道名两行(点了叠弹框)、全程灰字一行、条件胶囊一排。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import { MyStreamNameCell } from './mystreamnamecell'
import { MyStreamTagsCell } from './mystreamtagscell'
import type { MyStreamCardIn } from './types'
import css from './profile.module.css'

/**
 * 一张通道卡。
 *
 * @param props 这一行。
 * @returns 卡。
 */
export function MyStreamCard({ r }: MyStreamCardIn) {
  return (
    <div className={cssOf(css.msCard)}>
      {MyStreamNameCell(r)}
      {r.total !== TEXT_NONE && <span className={cssOf(css.none)}>{r.total}</span>}
      {MyStreamTagsCell(r)}
    </div>
  )
}
