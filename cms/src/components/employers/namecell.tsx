'use client'
/**
 * 域内哑单元格:雇主板「雇主」列 —— 英文名主文案 + 界面语言别名灰注 + 行业灰注(形照把脉页 EmpNameCell)。
 * 2026-09-13 Frank「后面已经有操作列,没必要加 link。而且要加中文名」:名字不成链,落点归操作列。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { TEXT_NONE } from './constants'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染雇主板「雇主」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 名 + 别名灰注 + 行业灰注(没有的不占行)。
 */
export function NameCell(r: EmployerCellRow) {
  return (
    <div>
      <span className={css.name}>{r.name}</span>
      {r.alias !== TEXT_NONE && <span className={css.sub}>{r.alias}</span>}
      {r.industry !== TEXT_NONE && <span className={css.sub}>{r.industry}</span>}
    </div>
  )
}
