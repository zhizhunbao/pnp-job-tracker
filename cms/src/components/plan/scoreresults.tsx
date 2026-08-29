'use client'
/**
 * plan 域的结构:各省估分结果区。各省走**选项卡**(Frank 2026-08-12:「还是需要一个通用的
 * 选项卡组件,不能用按钮代替」+「只给估分功能加选项卡吧」)。原来是折叠手风琴 ——
 * 一省一行点开看明细,与 08-11「折叠撤掉」那条背道而驰,四个省堆下来也读不出对比。
 * 改成一省一个选项卡:选中省的合计分与明细直接摊开。
 * 🔴 勾选与 offer 态存在**分值卡自己的 state** 里,不在面板里 —— 所以面板可以随切随卸,答案不丢。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的结果段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { Tabs } from '@/components/tabs'
import { cssOf } from '@/components/css'
import { ProvincePanel } from './provincepanel'
import { ScoreSources } from './scoresources'
import { TAB_ID_SCORE_PROV } from './constants'
import { scoreTabItemsOf } from './functions'
import type { ScoreResultsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染各省估分结果区。
 *
 * @param props 分值卡整机。
 * @returns 省页签、各省面板与官方出处。
 */
export function ScoreResults({ d }: ScoreResultsIn) {
  const panels = []
  for (const s of d.scores) {
    panels.push(<ProvincePanel key={s.province} d={d} s={s} />)
  }
  return (
    <>
      <div className={cssOf(css.psTabs)}>
        <Tabs idPrefix={TAB_ID_SCORE_PROV} ariaLabel={d.t('ps.resultTitle')} value={d.activeProv}
          onChange={d.onProv} items={scoreTabItemsOf({ t: d.t, scores: d.scores })} />
      </div>
      {panels}
      <ScoreSources t={d.t} scores={d.scores} />
    </>
  )
}
