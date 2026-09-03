'use client'
/**
 * plan 域的结构:「估分与抽选线」独立 section(2026-08-16 Frank「估分的答题和结论
 * 放到单独一个 section,不要和基础题放一块」)。问卷弹框壳与分值卡实例跟着搬进来 ——
 * 它们本就是估分那一段的东西;两态互斥:带岗态照旧走判定卡的 scoreSlot,不在这里渲第二份。
 * 卡**恒定渲染**(哪怕一个省都还没选):分值卡实例常驻在它里面,容器一会儿在、一会儿不在
 * = React 重挂 = 答案清零。省没选/没表时卡自己退化成一句提示,不搬树。
 * 2026-08-28 换装批自 Decision.tsx 的 ScoreLineCard 调用点提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { ScoreLineCard } from './scorelinecard'
import { makeNoGridNote } from './makenogridnote'
import { makeScoreTiles } from './makescoretiles'
import { gridProvincesOf, makePendingOf, makeProvDisp, pathRowsOf } from './functions'
import type { ScoreSectionIn } from './types'

/**
 * 渲染估分与抽选线整段。
 *
 * @param props 决策页整机与常驻的问卷弹框壳。
 * @returns 估分卡。
 */
export function ScoreSection({ d, children }: ScoreSectionIn) {
  return (
    <ScoreLineCard t={d.t} lang={d.lang} rows={pathRowsOf({ paths: d.paths.paths })}
      draws={d.view.prov.lineDraws}
      updatedAt={d.updatedAt}
      provinces={d.view.prov.lineProvinces}
      provDisp={makeProvDisp({ t: d.t })}
      done={d.progress.scoreDone} total={d.progress.scoreTotal}
      onEdit={d.acts.onScoreEdit}
      onPickProv={d.acts.onPickProv}
      gridProvinces={gridProvincesOf({ score: d.score, prov: d.view.prov })}
      onProv={d.score.setProv}
      pendingOf={makePendingOf({ d })}
      noGridNote={makeNoGridNote({ d })}
      tiles={makeScoreTiles({ d })}>
      {children}
    </ScoreLineCard>
  )
}
