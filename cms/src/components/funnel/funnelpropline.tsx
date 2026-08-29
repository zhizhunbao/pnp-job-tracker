'use client'
/**
 * 漏斗看板的一条分组行:引子 + 若干「维度串 次数」。两处用它 ——
 * 锁区曝光按入口(详情页 jd 与报告页 rpt 是两条路,M3 分叉时得知道该改哪一条),
 * 打开定价按来路(报告锁区 CTA 带 `?from=rpt-<卡>`,其余算直达 —— 报告到底卖不卖得动
 * 就看这一行)。
 * 2026-08-27 换装批自 Funnel.tsx 的两段同构 JSX 收成一件。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */
import { propLineClsOf } from './functions'
import type { FunnelPropLineIn } from './types'
import css from './funnel.module.css'

/**
 * 渲染一条分组行。
 *
 * @param props 引子、分组条目与紧凑档(逐格注释见 FunnelPropLineIn)。
 * @returns 一行文字。
 */
export function FunnelPropLine({ head, items, tight = false }: FunnelPropLineIn) {
  const spans = []
  for (const item of items) {
    spans.push(<span key={item.key} className={css.propItem}>{item.text}</span>)
  }
  return (
    <div className={propLineClsOf({ tight })}>{head}{spans}</div>
  )
}
