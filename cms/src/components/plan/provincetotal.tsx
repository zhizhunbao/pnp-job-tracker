'use client'
/**
 * plan 域的结构:一个省的合计分 + 与最近一轮抽选线的差距(选项卡上只放省名,
 * 合计与差距摆这儿)。
 * 「/ 总分」只在官方**公布了**总分上限时才显示:ON 的 OINP EOI 页只印各项分值、不印总分,
 * 拿各项相加冒充官方总分就是编数(BC 200 / SK 110 都是官方白纸黑字印着的)。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的合计行提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { scoreGapClsOf, scoreGapTextOf, totalMaxTextOf } from './functions'
import type { ProvinceTotalIn } from './types'
import css from './plan.module.css'

/**
 * 渲染合计分与差距那一行。
 *
 * @param props 取词函数、这个省的估分与对照线。
 * @returns 合计行。
 */
export function ProvinceTotal({ t, s, line }: ProvinceTotalIn) {
  return (
    <div className={cssOf(css.psTotalRow)}>
      <span className={cssOf(css.psTotal)}>
        {s.total}
        {s.maxTotal > 0 && <span className={cssOf(css.psTotalMax)}>{totalMaxTextOf(s)}</span>}
      </span>
      <span className={cssOf(css.psSystem)}>{s.system}</span>
      <span className={scoreGapClsOf({ line, total: s.total })}>
        {scoreGapTextOf({ t, line, total: s.total })}
      </span>
    </div>
  )
}
