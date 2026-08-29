'use client'
/**
 * plan 域的单元格:初评表的通道列 —— 通道名 + 省码灰注 + 「本岗所在省」标。
 * 通道名放不下给省略号(表格里),手机卡那份是全的。
 * 2026-08-28 换装批自 Decision.tsx 的 path 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { TEXT_NONE } from './constants'
import type { PlanCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个通道格。
 *
 * @param r 这一行展示行。
 * @returns 通道格。
 */
export function PathCell(r: PlanCellRow) {
  return (
    <span className={css.pathCell}>
      <b className={css.pathName}>{r.routeName}</b>
      <span className={css.pathProv}>{r.province}</span>
      {r.text.extraLabel !== TEXT_NONE && <span className={css.jobProvTag}>{r.text.extraLabel}</span>}
    </span>
  )
}
