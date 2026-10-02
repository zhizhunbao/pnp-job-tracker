'use client'
/**
 * 职位名下面那行日期:发布、截止两格(2026-09-26 Frank 看过效果图点头)。详情页 H1 下与职位弹框标题下(advisor 的 ActHead)
 * 各挂一处,同一件。标签灰字、日期深色,两格之间留空隙,不用「·」「/」连。没截止日只出发布一格;截止日已过或岗已下架,
 * 截止那格不出(口径见 functions 的 jobDatesOf)。日期走 time 桶 TimeText(YYYY-MM-DD,与职位卡同形)。
 * 2026-09-27 Frank「放到 jd 正文部分如何」「格式不对啊 怎么是灰字。怎么设计一下」→ 看过效果图选 ①:改成正文里单独一节「日期」
 * (小标题 + 一行一条,字形同「工作地点」那几节,整理版与原帖正文两种都挂),挂在正文区末尾(JdContent,详情页与职位弹框同一处);
 * 页眉那一行撤(详情页 H1 下、弹框 ActHead 的 dates 槽)。两格的出不出口径不变。
 * 2026-10-01 Frank「这种有点突兀」「这种也突兀」(没正文 / 整理版 / 原帖三档里那一节都不搭)→ 选「回到职位名下面」:
 * 正文一节撤,回到职位名下一行两格(09-26 形);标签 2026-10-01 起三语一律英文 Posted / Closes。
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
