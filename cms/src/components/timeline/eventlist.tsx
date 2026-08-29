'use client'
/**
 * 域内小件:时间轴(左缘一条竖线,事件挂在它右边,新在前 —— 服务端已排好序)。
 * 筛完一条不剩时出一句空态,不留一条光秃秃的竖线让人以为页面坏了。
 * 2026-08-28 换装批自 Timeline.tsx 的时间轴区提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { EventCard } from './eventcard'
import type { EventListIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染时间轴。
 *
 * @param props 取词函数与筛过之后的事件。
 * @returns 时间轴(空时出空态那句话)。
 */
export function EventList({ t, events }: EventListIn) {
  const rows = []
  for (const [i, row] of events.entries()) {
    rows.push(<EventCard key={i} t={t} row={row} />)
  }
  return (
    <div className={css.rail}>
      {rows}
      {events.length === 0 && <div className={css.empty}>{t('tl.empty')}</div>}
    </div>
  )
}
