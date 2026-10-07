'use client'
/**
 * quiz 域的结构:选职业的胶囊排。首屏同步出常用职业,缓存若已热好再补真实在招数;
 * 分类内按招聘量排列。榜还没到 → 用骨架把剩下的格子占住:格子数从头到尾是 24,
 * 列表不会长一次、也就不会重排(2026-08-12 Frank 实拍「打开刷了一下」)。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 * 2026-10-04 A2:大号档(访客第 3 题)的胶囊换 OccLgPill(chip 桶大号胶囊),骨架换 chip 桶的大号胶囊占位,格子数照旧 24。
 * 同日收口:一排的外框交给 OccPills(大号档是 chip 桶 ChipRow,本桶原 .pillsLg 并过去)。
 * 2026-10-05:一颗胶囊 = 一个职业(同组几个码合成一个,如「软件开发」三个码):名字与重名小注取代表行,在招数是组里之和,
 * 点一下整组选上 / 撤掉;同组任一个码选着就亮。
 * 2026-10-05 Frank「也改成左右 两部分吗?」「改啊」:大号档改走 OccRail(左栏推荐 + 大类、右边一列职业行),本件只剩常规档 ——
 * 上面 A2 那两句(大号胶囊 OccLgPill、chip 桶大号占位、外框交 OccPills)随大号档撤,一排的外框回到全局类 .occPills 那一排
 * (常规档原本经 OccPills 渲的就是它,DOM 不变)。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_OCC_PILLS, KEY_SKEL_HEAD, SKEL_KINDS, TEXT_NONE } from './constants'
import { OccTopPill } from './occtoppill'
import {
  dupHintOf, itemNocsOf, itemOnOf, itemOpenOf, occLabelOf, openTextOf, skelCatClsOf, skelFillCount, skelTopClsOf,
} from './functions'
import type { OccListIn } from './types'

/**
 * 渲染热门/分类那一屏的胶囊。
 *
 * @param props 取词函数、界面语言码、当前分类与两个在途标、这一屏的职业、已选职业、
 *              重名计数与逐职业手柄工厂。
 * @returns 胶囊排(分类清单在途时整排换骨架)。
 */
export function OccList({ t, lang, cat, catLoading, topLoaded, list, picked, dupCount, pickOf }: OccListIn) {
  const cells = []
  if (catLoading) {
    for (let i = 0; i < SKEL_KINDS; i += 1) {
      cells.push(<span className={skelCatClsOf({ i })} key={i} />)
    }
    return <div className={CLS_OCC_PILLS} aria-busy>{cells}</div>
  }
  for (const item of list) {
    const row = item.head
    const label = occLabelOf({ row, lang })
    const hint = dupHintOf({ row, label, dupCount })
    const onPick = pickOf({ key: item.key, nocs: itemNocsOf(item), name: label })
    const on = itemOnOf({ key: item.key, picked })
    const open = itemOpenOf(item)
    let openText = TEXT_NONE
    if (open > 0) {
      openText = openTextOf({ t, open })
    }
    cells.push(
      <OccTopPill key={row.noc}
        label={label}
        hint={hint}
        openText={openText}
        on={on}
        onPick={onPick} />,
    )
  }
  if (cat === TEXT_NONE && topLoaded === false) {
    const fill = skelFillCount({ shown: list.length })
    for (let i = 0; i < fill; i += 1) {
      cells.push(<span className={skelTopClsOf({ i })} key={KEY_SKEL_HEAD + i} />)
    }
  }
  return <div className={CLS_OCC_PILLS}>{cells}</div>
}
