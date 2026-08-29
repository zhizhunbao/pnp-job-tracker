'use client'
/**
 * 域内小件:时间轴上的一条 —— 左缘圆点 + 白卡(日期 + 省标 + 这一路自己的那半)。
 * 三路事件混排在同一条轴上,首行的后半截按路分件:政策公告出徽标与站内链接,
 * 抽选与省通告出流名与两项数字;省通告的正文摘要另起一行,别的路没有这一行。
 * 2026-08-28 换装批自 Timeline.tsx 的事件条提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { KIND_NOTICE, TEXT_NONE } from './constants'
import { DrawLine } from './drawline'
import { dotClsOf, isPolicy } from './functions'
import { PolicyLine } from './policyline'
import { ProvTag } from './provtag'
import type { EventCardIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染时间轴上的一条。
 *
 * @param props 取词函数与这一条事件。
 * @returns 圆点与事件白卡。
 */
export function EventCard({ t, row }: EventCardIn) {
  return (
    <div className={css.event}>
      <span className={dotClsOf({ kind: row.kind })} />
      <div className={css.eventCard}>
        <div className={css.eventHead}>
          <span className={css.date}>{row.date}</span>
          <ProvTag t={t} prov={row.prov} />
          {isPolicy({ kind: row.kind }) && <PolicyLine t={t} row={row} />}
          {isPolicy({ kind: row.kind }) === false && <DrawLine t={t} row={row} />}
        </div>
        {row.kind === KIND_NOTICE && row.note !== TEXT_NONE && <div className={css.note}>{row.note}</div>}
      </div>
    </div>
  )
}
