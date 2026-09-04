'use client'
/**
 * 域内哑单元格:雇主表的名字格(链接落到职位板按雇主名筛;点击回调随行带来,形照 OccNameCell)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染名字格。
 *
 * @param r 这一行。
 * @returns 链接。
 */
export function EmpNameCell(r: EmpCellRow) {
  return (
    <LinkButton href={r.href} onClick={r.onView} className={cssOf(css.occLink)}>
      {r.name}
    </LinkButton>
  )
}
