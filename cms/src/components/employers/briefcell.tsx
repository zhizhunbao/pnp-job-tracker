'use client'
/**
 * 对比表「K 调查简介」行的单元格:渲染截断后的简介,全文挂在 title 上悬停可看 ——
 * 长文本不该抢事实列的宽(它是背景,不是判据)。没查过的雇主渲灰色横杠。
 * 2026-08-27 换装批自 Compare.tsx 的 brief 维度 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { CompareCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染对比表「K 调查简介」行里属于这家雇主的那一个单元格。
 *
 * @param r 这家雇主的展示行。
 * @returns 截断后的简介(全文在 title 上),没查过时是灰色横杠。
 */
export function BriefCell(r: CompareCellRow) {
  if (r.brief === TEXT_NONE) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  return (
    <span title={r.brief} className={css.brief}>{r.briefText}</span>
  )
}
