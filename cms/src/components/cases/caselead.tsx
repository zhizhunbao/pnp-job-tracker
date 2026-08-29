'use client'
/**
 * 段首说明的 bullet 列:一条一行、与路径理由同字号。撤的是「灰色小字整段」
 * 那种版式 —— Frank 2026-08-11 连指三处(供需行、概率框、段首句)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import type { CaseLeadIn } from './types'
import css from './cases.module.css'

/**
 * 段首 bullet 列。
 *
 * @param props 一条一行的说明(见 CaseLeadIn 逐格注释)。
 * @returns bullet 列。
 */
export function CaseLead({ lines }: CaseLeadIn) {
  const items = []
  for (const s of lines) {
    if (s === '') {
      continue
    }
    items.push(<li key={s} className={css.leadLine}>{s}</li>)
  }
  return <ul className={css.lead}>{items}</ul>
}
