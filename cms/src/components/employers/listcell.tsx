'use client'
/**
 * 雇主板表格「名录出处」列的单元格:渲染一枚指向官方名录页的短链接,新开页打开。
 * 整批一行都没有出处链接时**整列不出**(容缺先例同 hasVerdictSignal —— 不渲染一列
 * 全是横杠),那一判在 employerColsOf 里做;本文件只管单行:这一行没有链接就渲横杠。
 * 2026-08-27 换装批自 Employers.tsx 的 list 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { TARGET_BLANK, TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染雇主板「名录出处」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 官方名录页的外链;这一行没有出处时渲灰色横杠。
 */
export function ListCell(r: EmployerCellRow) {
  if (r.listUrl === TEXT_NONE) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  return (
    <LinkButton href={r.listUrl} target={TARGET_BLANK} className={cssOf(css.listLink)}>
      {r.listLabel}
    </LinkButton>
  )
}
