'use client'
/**
 * 雇主板表格「雇主名」列的单元格:渲染一枚蓝色半粗的站内链接,指向职位板按这家
 * 雇主名搜索的结果页。
 * 🔴 口径:雇主名本身就是「看该雇主在招」的直达入口 —— 再单开一列同一个落点是
 * 2026-08-10 拍过的重复入口,不做。
 * 2026-08-27 换装批自 Employers.tsx 里两处逐字相同的 render 提出成文件
 * (名录口径与在招口径两套列共用同一个)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染雇主板「雇主名」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 指向职位板搜索结果的雇主名链接。
 */
export function NameCell(r: EmployerCellRow) {
  return (
    <LinkButton href={r.href} title={r.hrefTitle} onClick={r.onView} className={cssOf(css.nameLink)}>
      {r.name}
    </LinkButton>
  )
}
