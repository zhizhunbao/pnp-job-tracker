'use client'
/**
 * 域内小件:抽选表的组区 —— 标题下灰字、本岗(本通道)那几组、其余组、「查看全省 N 组」开关、卡底合计。抽选卡(PnpDrawGroups)与
 * 「申请步骤」卡「进池与抽选」一步(StepItem)共用这一份(2026-10-02 申请步骤批 2 自 PnpDrawGroups 拆出:同一种抽选表全站一份实现)。
 * 组的开合口径照抽选卡原注(drawGroupOpenOf:整张只有一组的默认展开)。
 * 2026-10-04 Frank 勾「去掉」(资讯页「申请步骤」页签抽选表的蓝底):多收一格 mark 递给每一组(props 随之自 PnpDrawGroupsIn 分出 DrawGroupsBodyIn),
 * 抽选卡恒传 true,步骤卡按场合传。
 * 2026-10-10 Frank「申请步骤这块。这个默认不要展开」:多收一格 openSingle,「整张只有一组默认展开」只给抽选卡,步骤卡一律折着。
 * 2026-10-11 Frank「这两个最好放到一行」:「查看全省 N 组」开关与卡底合计包进同一行(drawsTail),开关靠左、合计靠右,放不下折行。
 * 同日 Frank「这个改成叫 展开 收起 吧」:开关换成 pager 桶 FoldLine(全站唯一的展开 / 收起,10-02「全站统一 都改成 展开 20 和 收起」),
 * 展开后出「收起」折回去;原「查看全省 N 组」词条随之退役。
 *
 * @author Frank
 * @time 2026-10-02 23:40:00
 */
import { FoldLine } from '@/components/pager'
import { K_FOLD_UNIT_GROUP } from './constants'
import { EeCmpGroupView } from './eecmpgroupview'
import { drawExtraOf, drawGroupOpenOf } from './functions'
import type { DrawGroupsBodyIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染抽选表的组区。
 *
 * @param props 取词函数、这张抽选表、展开着的组、开合手柄工厂与蓝底开关。
 * @returns 组区(不带卡框与标题行)。
 */
export function DrawGroupsBody({ t, card, open, toggleOf, mark, openSingle }: DrawGroupsBodyIn) {
  const lines = []
  for (const line of card.lines) {
    lines.push(<div key={line} className={css.drawsBasis}>{line}</div>)
  }
  const foot = []
  for (const line of card.foot) {
    foot.push(<div key={line} className={css.drawsFoot}>{line}</div>)
  }
  const single = openSingle && card.hits.length + card.others.length === 1
  const hits = []
  for (const g of card.hits) {
    hits.push(<EeCmpGroupView key={g.key} g={g} open={drawGroupOpenOf({ open, key: g.key, single })}
      onToggle={toggleOf(g.key)} dateBelow mark={mark} />)
  }
  const allOpen = open.has(card.allKey)
  const hasOthers = card.others.length > 0
  const others = []
  if (allOpen) {
    for (const g of card.others) {
      others.push(<EeCmpGroupView key={g.key} g={g} open={drawGroupOpenOf({ open, key: g.key, single })}
        onToggle={toggleOf(g.key)} dateBelow mark={mark} />)
    }
  }
  return (
    <>
      {lines}
      {hits}
      {others}
      {(hasOthers || foot.length > 0) && (
        <div className={css.drawsTail}>
          {hasOthers && (
            <FoldLine t={t}
              unit={t(K_FOLD_UNIT_GROUP)}
              hidden={card.others.length}
              extra={drawExtraOf({ open: allOpen, n: card.others.length })}
              busy={false}
              onMore={toggleOf(card.allKey)}
              onFold={toggleOf(card.allKey)} />
          )}
          {foot.length > 0 && <div className={css.drawsTailFoot}>{foot}</div>}
        </div>
      )}
    </>
  )
}
