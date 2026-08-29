'use client'
/**
 * quiz 域的结构:选职业的胶囊排。首屏同步出常用职业,缓存若已热好再补真实在招数;
 * 分类内按招聘量排列。榜还没到 → 用骨架把剩下的格子占住:格子数从头到尾是 24,
 * 列表不会长一次、也就不会重排(2026-08-12 Frank 实拍「打开刷了一下」)。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_OCC_PILLS, KEY_SKEL_HEAD, SKEL_KINDS, TEXT_NONE } from './constants'
import { OccTopPill } from './occtoppill'
import { dupHintOf, occLabelOf, openTextOf, skelCatClsOf, skelFillCount, skelTopClsOf } from './functions'
import type { OccListIn } from './types'

/**
 * 渲染热门/分类那一屏的胶囊。
 *
 * @param props 取词函数、界面语言码、当前分类与两个在途标、这一屏的职业、已选码、
 *              重名计数与逐职业手柄工厂。
 * @returns 胶囊排(分类清单在途时整排换骨架)。
 */
export function OccList({ t, lang, cat, catLoading, topLoaded, list, nocs, dupCount, pickOf }: OccListIn) {
  const cells = []
  if (catLoading) {
    for (let i = 0; i < SKEL_KINDS; i += 1) {
      cells.push(<span className={skelCatClsOf({ i })} key={i} />)
    }
    return <div className={CLS_OCC_PILLS} aria-busy>{cells}</div>
  }
  for (const row of list) {
    const label = occLabelOf({ row, lang })
    let openText = TEXT_NONE
    if (row.open > 0) {
      openText = openTextOf({ t, open: row.open })
    }
    cells.push(
      <OccTopPill key={row.noc}
        label={label}
        hint={dupHintOf({ row, label, dupCount })}
        openText={openText}
        on={nocs.includes(row.noc)}
        onPick={pickOf({ noc: row.noc, name: label })} />,
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
