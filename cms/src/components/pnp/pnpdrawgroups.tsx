'use client'
/**
 * 域内小件:省提名弹框的本省抽选卡(按通道分组,组头 = 最近一轮,点开列全部轮次)。
 * 2026-09-23 Frank「这个要不要分类」「和 EE 那个一样」立:组件与组形照抄 EE 分数线卡(EeCmpGroupView),
 * 卡标题沿用旧抽选卡那句(「本省最近抽选 {轮次标签}」)。地点弹框的省份卡仍用 PnpDrawsBlock(最近 1 / 3 轮)。
 *
 * @author Frank
 * @time 2026-09-23 23:50:00
 */
import { EeCmpGroupView } from './eecmpgroupview'
import { drawRowsOf, drawsTitleOf, firstDrawOf, pnpDrawGroupsOf } from './functions'
import type { PnpDrawGroupsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染本省抽选分组卡。
 *
 * @param props 取词函数、界面语言、省码、全部抽选行、展开着的组与开合手柄工厂。
 * @returns 抽选卡;本省没有抽选给 null。
 */
export function PnpDrawGroups({ t, lang, province, draws, open, toggleOf }: PnpDrawGroupsIn) {
  const groups = []
  for (const g of pnpDrawGroupsOf({ t, lang, province, draws })) {
    groups.push(<EeCmpGroupView key={g.key} g={g} open={open.has(g.key)} onToggle={toggleOf(g.key)} />)
  }
  if (groups.length === 0) {
    return null
  }
  const first = firstDrawOf(drawRowsOf({ province, draws, reform: null, limit: null }))
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{drawsTitleOf({ t, reform: null, first })}</div>
      {groups}
    </div>
  )
}
