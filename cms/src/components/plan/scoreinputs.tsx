'use client'
/**
 * plan 域的结构:分值卡的「你的条件」下拉网格 —— 一套答案,各省按各自官方表折算。
 * 决策页(inputs=false)不渲这一段:那里答题是唯一输入面,分数由答案自动算
 * (Frank 2026-08-10);时薪与工作地区是岗位事实,走 ctx,不问人。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的条件网格提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { ScoreCell } from './scorecell'
import type { ScoreInputsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染「你的条件」网格。
 *
 * @param props 分值卡整机。
 * @returns 标签与网格。
 */
export function ScoreInputs({ d }: ScoreInputsIn) {
  const cells = []
  for (const f of d.fields) {
    cells.push(<ScoreCell key={f.key} f={f} />)
  }
  return (
    <>
      <div className={cssOf(css.psLabel)}>{d.t('ps.you')}</div>
      <div className={cssOf(css.psGrid)}>{cells}</div>
    </>
  )
}
