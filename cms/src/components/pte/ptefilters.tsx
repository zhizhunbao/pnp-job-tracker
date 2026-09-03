'use client'
/**
 * 域内小件:窗口与筛胶囊排(近 7 / 30 / 90 天 / 全部 + 只看押题 + 未练过;全在客户端筛)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Chip } from '@/components/chip'
import { cssOf } from '@/components/css'
import { CLS_SEP, WINS } from './constants'
import { winLabelOf } from './functions'
import type { PteFiltersIn } from './types'
import css from './pte.module.css'

/**
 * 渲染窗口与筛胶囊排。
 *
 * @param props 取词函数与题单面板。
 * @returns 一排胶囊。
 */
export function PteFilters({ t, b }: PteFiltersIn) {
  const chips = []
  for (const win of WINS) {
    chips.push(
      <Chip key={win} active={b.win === win} onClick={b.winPickOf(win)}>{winLabelOf({ t, win })}</Chip>,
    )
  }
  return (
    <div className={cssOf(css.chips) + CLS_SEP + cssOf(css.chipsGap)}>
      {chips}
      <Chip active={b.hot} onClick={b.onHot}>{t('pte.hot')}</Chip>
      <Chip active={b.todo} onClick={b.onTodo}>{t('pte.todo')}</Chip>
    </div>
  )
}
