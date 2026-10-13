'use client'
/**
 * 域内小件:事件卡首行的抽选那一半 —— 流名(省通告走固定说法)+ 最低分 + 邀请数。
 * 诚实红线:省的分数不是 CRS,分数后面跟着分制小注,不标会被当成 CRS 分读。
 * 分数与邀请数**官方没公布就不出那一格** —— 折成 0 等于替官方编数。
 * #106:官方来源外链撤(归拢到 /resources),所以这一半没有链接。
 * 2026-08-28 换装批自 Timeline.tsx 的事件行三目提出成具名小件。
 * 2026-09-26 lead 定:人数话术收进 invTextOf —— NS 是从 EOI 池选取的人数,写「入选」不写「邀请」。
 * 2026-10-12 抽选页三段式:流名下加译名灰字(Frank「英文下面加 中文灰字」);网页端最低分与人数各占一列靠右对齐
 * (Frank「这部分放右边对齐呢」),所以抽选行两格**恒出**,缺数的那格留空占位,上下行才对得齐 —— 仍不编数,只是空格子不收起。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { SCALE_NOTE_CLOSE, SCALE_NOTE_OPEN, TEXT_NONE } from './constants'
import { eventGrayOf, invTextOf, isScaleShown } from './functions'
import type { DrawLineIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染抽选那一半。
 *
 * @param props 取词函数、界面语与这一条事件。
 * @returns 标题(带译名灰字)与两项数字。
 */
export function DrawLine({ t, lang, row }: DrawLineIn) {
  const gray = eventGrayOf({ t, lang, row })
  return (
    <>
      <span className={css.drawTitle}>
        {row.title}
        {gray !== TEXT_NONE && <span className={css.titleGray}>{gray}</span>}
      </span>
      <span className={css.score}>
        {row.score != null && t('tl.min', { n: row.score })}
        {row.score != null && isScaleShown({ scale: row.scale }) && (
          <span className={css.scaleNote}>
            {SCALE_NOTE_OPEN}{row.scale}{SCALE_NOTE_CLOSE}
          </span>
        )}
      </span>
      <span className={css.inv}>{invTextOf({ t, row })}</span>
    </>
  )
}
