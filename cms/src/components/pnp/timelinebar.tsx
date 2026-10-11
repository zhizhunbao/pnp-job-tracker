'use client'
/**
 * 域内小件:「申请步骤」卡顶的时间线 —— 全程一行 + 分段条(一步一段,按时长分宽,一步一色)+ 逐步说明。
 * 2026-10-11 申请步骤时间线(Frank「得有时间线啊,不然用户能看懂吗」「时间线不要一个颜色」「线的文字 和 下面的文字要对应吧」
 * 「是两个分割细线」;效果图 docs/design/资讯/申请步骤-时间线-20261011.md,参考 GOV.UK 分步指引的单色竖线编号)。
 * 电脑:段下两行字(编号 + 步骤名、时长);手机:条上只留色线,字改到下面一行一步的说明(CSS 切,同一份数据)。
 *
 * @author Frank
 * @time 2026-10-11 05:00:00
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import { withToneOf } from './functions'
import type { TimelineBarIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染卡顶的时间线。
 *
 * @param props 洗好的时间线。
 * @returns 时间线块。
 */
export function TimelineBar({ spec }: TimelineBarIn) {
  const segs = []
  const rows = []
  for (const s of spec.segs) {
    segs.push(
      // eslint-disable-next-line react/forbid-dom-props -- 段宽 = 这一步的时长(数据层算的月数),是运行时值
      <div key={s.key} className={withToneOf({ base: cssOf(css.tlSeg), tone: s.tone })} style={{ flexGrow: s.weight }}>
        <div className={css.tlLine} />
        <div className={css.tlLabel}><span className={css.tlBadge}>{s.n}</span>{s.name}</div>
        <div className={css.tlDur}>{s.dur}</div>
      </div>,
    )
    rows.push(
      <div key={s.key} className={withToneOf({ base: cssOf(css.tlRow), tone: s.tone })}>
        <span className={css.tlSwatch} />
        <span className={css.tlBadge}>{s.n}</span>
        <span className={css.tlName}>{s.name}</span>
        <span className={css.tlDur}>{s.dur}</span>
      </div>,
    )
  }
  return (
    <div className={css.tl}>
      {spec.total !== TEXT_NONE && <div className={css.tlTotal}>{spec.total}</div>}
      <div className={css.tlBar}>{segs}</div>
      <div className={css.tlLegend}>{rows}</div>
    </div>
  )
}
