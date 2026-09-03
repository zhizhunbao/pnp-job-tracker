'use client'
/**
 * 域内小件:题单的三行开关,每行带标签(Frank 2026-09-03「这个选项都堆一起了用户怎么用」):
 * 时间(近 7 / 30 / 90 天 / 全部)、筛选(只看押题 / 未练过)、排序(最近考过 / 题号,二选一)。
 * 与上面的题型分栏同一种「标签 + 一行药丸」的形。全在客户端筛。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Chip } from '@/components/chip'
import { WINS } from './constants'
import { winLabelOf } from './functions'
import type { PteFiltersIn } from './types'
import css from './pte.module.css'

/**
 * 渲染三行开关。
 *
 * @param props 取词函数与题单面板。
 * @returns 三行(标签 + 药丸)。
 */
export function PteFilters({ t, b }: PteFiltersIn) {
  const wins = []
  for (const win of WINS) {
    wins.push(
      <Chip key={win} active={b.win === win} onClick={b.winPickOf(win)}>{winLabelOf({ t, win })}</Chip>,
    )
  }
  return (
    <div className={css.filterRows}>
      <div className={css.secRow}>
        <span className={css.secLabel}>{t('pte.lab.time')}</span>
        <div className={css.chips}>{wins}</div>
      </div>
      <div className={css.secRow}>
        <span className={css.secLabel}>{t('pte.lab.filter')}</span>
        <div className={css.chips}>
          <Chip active={b.hot} onClick={b.onHot}>{t('pte.hot')}</Chip>
          <Chip active={b.todo} onClick={b.onTodo}>{t('pte.todo')}</Chip>
        </div>
      </div>
      <div className={css.secRow}>
        <span className={css.secLabel}>{t('pte.lab.sort')}</span>
        <div className={css.chips}>
          <Chip active={b.byNum === false} onClick={b.onBySeen}>{t('pte.sortSeen')}</Chip>
          <Chip active={b.byNum} onClick={b.onBySeen}>{t('pte.byNum')}</Chip>
        </div>
      </div>
    </div>
  )
}
