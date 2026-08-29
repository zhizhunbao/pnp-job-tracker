'use client'
/**
 * 雇主板表格「职业」列的单元格:渲染名录列明的职业 —— 人话名做主文案、5 位职业码做
 * 灰色小注(站规 ui-plain-language);筛过职业时只显选中那一条(用户问的就是它),
 * 名录没写职业时渲灰色的「未列明」。
 * 🔴 空 = 官方没列清单,**不是**「该雇主不招这个职业」—— 把这类行剔掉等于拿数据缺口
 * 冒充官方排除(lib/employers 域头那条口径红线在展示端的一半)。
 * 字典查不到译名时主文案已经是职业码本身,洗展示行时就把灰色小注置空,这里不再重复渲一遍。
 * 2026-08-27 换装批自 Employers.tsx 的 nocCell 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { TEXT_NONE } from './constants'
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染雇主板「职业」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 职业人话名 + 折起来的条数 + 职业码灰注,或者灰色的「未列明」。
 */
export function NocCell(r: EmployerCellRow) {
  if (r.nocNone !== TEXT_NONE) {
    return <span className={css.dim}>{r.nocNone}</span>
  }
  return (
    <>
      <span>{r.nocNames}</span>
      {r.nocMore !== TEXT_NONE && <span className={css.dim}>{r.nocMore}</span>}
      {r.nocCodes !== TEXT_NONE && <div className={css.nocCodes}>{r.nocCodes}</div>}
    </>
  )
}
