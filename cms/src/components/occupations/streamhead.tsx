'use client'
/**
 * 通道表的头行(走公共 Table 的 header 槽):通道标题 + 这条通道点名的职业条数 +
 * 右端的抓取日。
 * #106:官方来源外链撤(归拢到 /resources)—— 这一行原先还挂一枚「官方清单」外链,
 * 撤走之后只剩抓取日,它交代的是「这份清单新不新」。
 * 2026-08-28 换装批自 Occupations.tsx 的 header 槽内联块提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { TEXT_NONE } from './constants'
import { nocCountTextOf, streamTitleOf } from './functions'
import type { StreamHeadIn } from './types'
import css from './occupations.module.css'

/**
 * 通道表的头行。
 *
 * @param props 这条通道的分组与取词函数(逐格注释见 StreamHeadIn)。
 * @returns 头行。
 */
export function StreamHead({ stream, t }: StreamHeadIn) {
  return (
    <div className={css.head}>
      <span className={css.headName}>
        {streamTitleOf({ t, stream: stream.stream, label: stream.label })}
      </span>
      <span className={css.headCount}>{nocCountTextOf({ count: stream.occ.length })}</span>
      {stream.fetched !== TEXT_NONE && (
        <span className={css.headFetched}>{t('dir.occ.fetched', { d: stream.fetched })}</span>
      )}
    </div>
  )
}
