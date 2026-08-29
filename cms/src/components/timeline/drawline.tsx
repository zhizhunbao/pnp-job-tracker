'use client'
/**
 * 域内小件:事件卡首行的抽选那一半 —— 流名(省通告走固定说法)+ 最低分 + 邀请数。
 * 诚实红线:省的分数不是 CRS,分数后面跟着分制小注,不标会被当成 CRS 分读。
 * 分数与邀请数**官方没公布就不出那一格** —— 折成 0 等于替官方编数。
 * #106:官方来源外链撤(归拢到 /resources),所以这一半没有链接。
 * 2026-08-28 换装批自 Timeline.tsx 的事件行三目提出成具名小件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { SCALE_NOTE_CLOSE, SCALE_NOTE_OPEN } from './constants'
import { eventTitleOf, isScaleShown } from './functions'
import type { DrawLineIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染抽选那一半。
 *
 * @param props 取词函数与这一条事件。
 * @returns 标题与两项数字。
 */
export function DrawLine({ t, row }: DrawLineIn) {
  return (
    <>
      <span className={css.drawTitle}>{eventTitleOf({ t, kind: row.kind, title: row.title })}</span>
      {row.score != null && (
        <span className={css.score}>
          {t('tl.min', { n: row.score })}
          {isScaleShown({ scale: row.scale }) && (
            <span className={css.scaleNote}>
              {SCALE_NOTE_OPEN}{row.scale}{t('tl.notCrs')}{SCALE_NOTE_CLOSE}
            </span>
          )}
        </span>
      )}
      {row.invitations != null && <span className={css.inv}>{t('tl.inv', { n: row.invitations })}</span>}
    </>
  )
}
