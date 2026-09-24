'use client'
/**
 * 域内小件:省提名弹框的本省抽选卡(按通道分组,组头 = 最近一轮,点开列全部轮次)。
 * 2026-09-23 Frank「这个要不要分类」「和 EE 那个一样」立:组件与组形照抄 EE 分数线卡(EeCmpGroupView),
 * 卡标题沿用旧抽选卡那句(「本省最近抽选 {轮次标签}」)。地点弹框的省份卡仍用 PnpDrawsBlock(最近 1 / 3 轮)。
 * 同日 Frank「NB 省不需要分数,在哪标注一下」:官方明说不按分数抽选的省(DRAW_NO_SCORE_PROVS),标题下一行灰字注明;
 * 「所以这个 NB 技术工人点进去应该哪个高亮」:本岗 PNP 格对应的那组琥珀高亮、排最前。
 *
 * @author Frank
 * @time 2026-09-23 23:50:00
 */
import { DRAW_NO_SCORE_PROVS } from './constants'
import { EeCmpGroupView } from './eecmpgroupview'
import { drawRowsOf, drawsTitleOf, firstDrawOf, pnpDrawGroupsOf } from './functions'
import type { PnpDrawGroupsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染本省抽选分组卡。
 *
 * @param props 取词函数、界面语言、省码、全部抽选行、本岗对应的那一组、展开着的组与开合手柄工厂。
 * @returns 抽选卡;本省没有抽选给 null。
 */
export function PnpDrawGroups({ t, lang, province, draws, hitStream, open, toggleOf }: PnpDrawGroupsIn) {
  const groups = []
  for (const g of pnpDrawGroupsOf({ t, lang, province, draws, hitStream })) {
    groups.push(<EeCmpGroupView key={g.key} g={g} open={open.has(g.key)} onToggle={toggleOf(g.key)} />)
  }
  if (groups.length === 0) {
    return null
  }
  const first = firstDrawOf(drawRowsOf({ province, draws, reform: null, limit: null }))
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{drawsTitleOf({ t, reform: null, first })}</div>
      {DRAW_NO_SCORE_PROVS.has(province) && <div className={css.drawsBasis}>{t('pnpdraws.noScore')}</div>}
      {groups}
    </div>
  )
}
