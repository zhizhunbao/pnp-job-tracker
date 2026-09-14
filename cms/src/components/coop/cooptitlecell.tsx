'use client'
/**
 * 校内板表的职位格:蓝链落职位详情页(与职位板职位列同形)。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { CoopCellRow } from './types'
import css from './coop.module.css'

/**
 * 渲染职位格。
 *
 * @param r 这一行的展示行。
 * @returns 一条链。
 */
export function CoopTitleCell(r: CoopCellRow) {
  return <LinkButton href={r.href} className={cssOf(css.titleLink)}>{r.title}</LinkButton>
}
