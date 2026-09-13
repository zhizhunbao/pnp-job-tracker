'use client'
/**
 * 雇主板的手机卡片流(≤640 顶替表格)。计数在 banner 副题(2026-09-13 照职位板),这里不再自占一行。
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
 * @param props 展示行与空态文案(见 EmployerCardsIn 逐格注释)。
 * @returns 卡片流(一行都没有时是空态)。
 */
export function EmployerCards({ rows, empty }: EmployerCardsIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<EmployerCard key={r.key} r={r} />)
  }
  return (
    <>
      {cards}
      {rows.length === 0 && <div className={css.cardsEmpty}>{empty}</div>}
    </>
  )
}
