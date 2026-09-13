'use client'
/**
 * 域内哑单元格:雇主板「雇主」列 —— 名字链(有公司页进公司页,没有落职位板按名搜)+ 行业灰注
 * (形照把脉页 EmpNameCell 的名 + 别名注;2026-09-13 雇主板批二)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染雇主板「雇主」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 雇主名链接 + 行业灰注(无行业不占行)。
 */
export function NameCell(r: EmployerCellRow) {
  return (
    <div>
      <LinkButton href={r.href} title={r.hrefTitle} onClick={r.onView} className={cssOf(css.nameLink)}>
        {r.name}
      </LinkButton>
      {r.industry !== TEXT_NONE && <span className={css.sub}>{r.industry}</span>}
    </div>
  )
}
