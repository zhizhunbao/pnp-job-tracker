'use client'
/**
 * 校内板表的操作格:一只 mini 钮落职位详情页(照雇主板操作列同一颗钮)。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { LinkButton } from '@/components/button'
import type { CoopCellRow } from './types'
import css from './coop.module.css'

/**
 * 渲染操作格。
 *
 * @param r 这一行的展示行(钮文案与钮类已在洗行时算好)。
 * @returns 一只钮。
 */
export function CoopActsCell(r: CoopCellRow) {
  return (
    <span className={css.acts}>
      <LinkButton href={r.href} className={r.actBtnCls}>{r.actText}</LinkButton>
    </span>
  )
}
