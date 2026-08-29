'use client'
/**
 * plan 域的单元格:初评表的在招列。2026-08-16 Frank 拍板改纯数字(「在招 去掉 点击」):
 * 一列一事,链接归操作列;无数字(AIP 指定雇主口径没有职业级岗数)显灰横杠。
 * 2026-08-28 换装批自 Decision.tsx 的 jobsCell 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { DashText } from './dashtext'
import { TEXT_NONE } from './constants'
import type { PlanCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个在招格。
 *
 * @param r 这一行展示行。
 * @returns 在招数,或者灰横杠。
 */
export function PlanJobsCell(r: PlanCellRow) {
  if (r.text.jobs === TEXT_NONE) {
    return <DashText />
  }
  return <span className={css.num}>{r.text.jobs}</span>
}
