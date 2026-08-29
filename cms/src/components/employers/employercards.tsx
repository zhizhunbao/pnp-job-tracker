'use client'
/**
 * 雇主板的手机卡片流(≤640 顶替表格)。卡片形态没有表头,所以计数自己占一行。
 * 2026-08-27 换装批自 Employers.tsx 的卡片段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { EmployerCard } from './employercard'
import type { EmployerCardsIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板手机卡片流。
 *
 * @param props 展示行与两条文案(见 EmployerCardsIn 逐格注释)。
 * @returns 计数行 + 卡片流(一行都没有时是空态)。
 */
export function EmployerCards({ rows, note, empty }: EmployerCardsIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<EmployerCard key={r.key} r={r} />)
  }
  return (
    <>
      <div className={css.cardsNote}>{note}</div>
      {cards}
      {rows.length === 0 && <div className={css.cardsEmpty}>{empty}</div>}
    </>
  )
}
