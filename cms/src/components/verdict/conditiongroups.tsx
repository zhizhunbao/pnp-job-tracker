'use client'
/**
 * verdict 域的结构:按小类别分块的共用题(2026-08-16:十几个格子平铺看不出结构,
 * 同组的挨在一起)。组序固定(调用方按它自己的类别顺序给),组内保持题序 ——
 * 两者都不许随答案变动而跳,不然每答一题格子就重排一次。
 * 2026-08-28 换装批自 ConditionGrid.tsx 的分组渲染提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { ConditionTiles } from './conditiontiles'
import { groupClsOf, groupRowsOf } from './functions'
import type { ConditionGroupsIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染分好组的共用题。
 *
 * @param props 组名、共用题与点格手柄(逐格注释见 ConditionGroupsIn)。
 * @returns 一组一块的格子。
 */
export function ConditionGroups({ groups, rows, onTile }: ConditionGroupsIn) {
  const blocks = []
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i]
    if (group == null) {
      continue
    }
    blocks.push(
      <div key={group} className={groupClsOf({ index: i })}>
        <div className={css.cgGroupName}>{group}</div>
        <ConditionTiles rows={groupRowsOf({ rows, group })} onTile={onTile} />
      </div>,
    )
  }
  return <>{blocks}</>
}
