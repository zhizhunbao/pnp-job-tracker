'use client'
/**
 * plan 域的结构:某个省的估分题条件格(2026-08-16 合卡)——它们就是这一段的答案面,
 * 先前留在「申请人条件」卡里,与结论隔着一张卡。
 * 共用题只在**真要它**的省下出现(BC 没有 language2,就不该问第二语言)。
 * 2026-08-28 换装批自 Decision.tsx 的 tiles 渲染口提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { ConditionGrid } from '@/components/verdict'
import { GRID_ID_SCORE } from './constants'
import { makeProvDisp, scoreTileRowsOf } from './functions'
import type { ScoreTilesIn } from './types'

/**
 * 渲染某个省的估分题条件格。
 *
 * @param props 决策页整机与省码。
 * @returns 条件格网格。
 */
export function ScoreTiles({ d, province }: ScoreTilesIn) {
  return (
    <ConditionGrid flat idPrefix={GRID_ID_SCORE}
      provLabel={makeProvDisp({ t: d.t })}
      ariaLabel={d.t('dp.prov')}
      onTile={d.acts.startQuiz}
      rows={scoreTileRowsOf({ rows: d.view.cond.scoreRows, province, factors: d.view.prov.allFactors })} />
  )
}
