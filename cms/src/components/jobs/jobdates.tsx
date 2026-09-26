'use client'
/**
 * 职位名下面那行日期:发布、截止两格(2026-09-26 Frank 看过效果图点头)。详情页 H1 下与职位弹框标题下(advisor 的 ActHead)
 * 各挂一处,同一件。标签灰字、日期深色,两格之间留空隙,不用「·」「/」连。没截止日只出发布一格;截止日已过或岗已下架,
 * 截止那格不出(口径见 functions 的 jobDatesOf)。日期走 time 桶 TimeText(YYYY-MM-DD,与职位卡同形)。
 *
 * @author Frank
 * @time 2026-09-26 14:35:57
 */
import { cssOf } from '@/components/css'
import { TimeText } from '@/components/time'
import { SPACE, TIME_TONE_NORMAL } from './constants'
import { useJobDates } from './hooks'
import type { JobDatesIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染职位名下那行日期。
 *
 * @param props 本岗与取词函数。
 * @returns 一行日期;一格都没有时不渲。
 */
export function JobDates({ job, t }: JobDatesIn) {
  const dates = useJobDates({ job, t })
  if (dates.length === 0) {
    return null
  }
  const cells = []
  for (const c of dates) {
    cells.push(
      <span key={c.k} className={cssOf(css.dateCell)}>
        <span className={cssOf(css.dateK)}>{c.label}</span>{SPACE}<TimeText iso={c.iso} tone={TIME_TONE_NORMAL} />
      </span>,
    )
  }
  return <div className={cssOf(css.dates)}>{cells}</div>
}
