'use client'
/**
 * plan 域的小件:分项一行的三格(因素名 / 得分 / 上限)。「12 / 40」是两个事实 ——
 * 拆成 得分 / 上限 两列(斜杠自成一列),数字才跨行对齐。三格直接落进外层网格的列上,
 * 所以这里不套盒子。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的分项循环体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { factorTitleOf, partMaxTextOf, partTitleOf } from './functions'
import type { ProvincePartIn } from './types'
import css from './plan.module.css'

/**
 * 渲染分项一行。
 *
 * @param props 取词函数、界面语与这一块分。
 * @returns 因素名、得分与上限三格。
 */
export function ProvincePart({ t, lang, p }: ProvincePartIn) {
  return (
    <>
      <span className={cssOf(css.psPartName)} title={partTitleOf({ lang, part: p })}>
        {factorTitleOf({ t, factor: p.factor })}
      </span>
      <span className={cssOf(css.psPartPts)}>{p.pts}</span>
      <span className={cssOf(css.psPartMax)}>{partMaxTextOf(p)}</span>
    </>
  )
}
