'use client'
/**
 * plan 域的结构:一个省的分项网格。命中的官方原文标签一并显出来(挂在悬停提示上),
 * 好让用户核对我们选对了没有。上限为 0 的因素不摆 —— 那是这个省压根没有的那一项。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的分项网格提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { ProvincePart } from './provincepart'
import type { ProvincePartsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染分项网格。
 *
 * @param props 取词函数、界面语与这个省的估分。
 * @returns 网格。
 */
export function ProvinceParts({ t, lang, s }: ProvincePartsIn) {
  const rows = []
  for (const p of s.parts) {
    if (p.max > 0) {
      rows.push(<ProvincePart key={p.factor} t={t} lang={lang} p={p} />)
    }
  }
  return <div className={cssOf(css.psParts)}>{rows}</div>
}
