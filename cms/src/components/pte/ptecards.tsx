'use client'
/**
 * 域内小件:手机卡列(桌面由 css 藏掉换表)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { PteCard } from './ptecard'
import type { PteRowsViewIn } from './types'
import css from './pte.module.css'

/**
 * 渲染手机卡列。
 *
 * @param props 取词函数与展示行。
 * @returns 卡列(一行都没有出空态)。
 */
export function PteCards({ t, rows }: PteRowsViewIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<PteCard key={r.qid} t={t} r={r} />)
  }
  return (
    <div className={css.mob}>
      {cards}
      {rows.length === 0 && <div className={css.empty}>{t('pte.empty')}</div>}
    </div>
  )
}
