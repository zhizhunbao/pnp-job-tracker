'use client'
/**
 * quiz 域的结构:选职业底部的「已选 N 个」汇总。动态区域统一放在稳定的搜索/分类/
 * 职业列表**之后**:点选时上半屏不再被新增胶囊向下顶;列表内的选中态已经即时反馈,
 * 底部汇总负责删除和查看全部已选项。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 * 2026-10-05:按职业摆(同组几个码一颗胶囊、名字取代表码,「已选 N 个」按职业数),点一下整组撤掉。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_OCC_SELECTED, CLS_OCC_SELECTED_HEAD, CLS_SEP, LEN_ZERO } from './constants'
import { OccChip } from './occchip'
import { chipNameOf, chipPickNameOf } from './functions'
import { cssOf } from '@/components/css'
import type { OccSelectedIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染已选汇总。
 *
 * @param props 取词函数、已选职业、名字表与逐胶囊手柄工厂。
 * @returns 已选汇总。
 */
export function OccSelected({ t, picked, titles, pickOf }: OccSelectedIn) {
  const chips = []
  for (const g of picked) {
    const name = chipNameOf({ noc: g.head, titles })
    chips.push(
      <OccChip key={g.head}
        name={name}
        onPick={pickOf({ key: g.key, nocs: g.nocs, name: chipPickNameOf({ noc: g.head, titles }) })} />,
    )
  }
  return (
    <div className={CLS_OCC_SELECTED + CLS_SEP + cssOf(css.selectedGap)}>
      <div className={CLS_OCC_SELECTED_HEAD}>
        <b className={css.selectedLabel}>{t('occ.selected', { n: picked.length })}</b>
      </div>
      {picked.length > LEN_ZERO && <div className={css.chipRow}>{chips}</div>}
      {picked.length === LEN_ZERO && <span className={css.selectedEmpty}>{t('occ.max')}</span>}
    </div>
  )
}
