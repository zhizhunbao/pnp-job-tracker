'use client'
/**
 * plan 域的结构:各省名额竞争卡(Frank 2026-08-12「很多人不知道竞争激烈程度,
 * 我们有这个数据并且是最新的」)。9 省同口径、来源同一份 IRCC 开放数据 ——
 * 所以敢横着比、敢排序。
 * 口径脚注一行说完(2026-08-13 Frank「改成一行」);「本站更新」整列同一天 →
 * 撤列并进这行。
 * 2026-08-28 换装批自 Decision.tsx 的 competitionCard 提出成件。
 * 2026-09-03 Frank「所有的 table 右上角都应该有一个更新时间」:年份胶囊下、表正上方
 * 单起一行靠右。它与卡尾那行口径脚注不是一回事 —— 脚注说的是**官方数据**的截止期
 * (v.generated / poolAsOf / flowPeriod),这一行说的是本站这批数据什么时候核对的。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Updated } from '@/components/time'
import { CompetitionCards } from './competitioncards'
import { CompetitionTable } from './competitiontable'
import { YearChips } from './yearchips'
import { blankOf } from './functions'
import type { CompetitionCardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染各省名额竞争卡。
 *
 * @param props 决策页整机。
 * @returns 竞争卡。
 */
export function CompetitionCard({ d }: CompetitionCardIn) {
  const v = d.view.comp
  if (v.rows.length === 0) {
    return null
  }
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{d.t('dp.compTitle')}</h2>
      <YearChips compYear={d.compYear} />
      <Updated iso={d.updatedAt} t={d.t} />
      <CompetitionCards t={d.t} rows={v.rows} year={d.compYear.year} hasSplit={v.hasSplit}
        stockAsOf={v.stockAsOf} poolAsOf={v.poolAsOf} flowPeriod={v.flowPeriod} yearFlowPeriod={v.yearFlowPeriod} />
      <CompetitionTable t={d.t} rows={v.rows} year={d.compYear.year} hasSplit={v.hasSplit}
        stockAsOf={v.stockAsOf} poolAsOf={v.poolAsOf} flowPeriod={v.flowPeriod} yearFlowPeriod={v.yearFlowPeriod} />
      <div className={css.note}>
        {d.t('dp.compNoteShort', { d: v.generated, m: blankOf(v.poolAsOf), p: blankOf(v.flowPeriod) })}
      </div>
    </div>
  )
}
