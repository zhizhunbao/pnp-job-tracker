'use client'
/**
 * plan 域的单元格:初评表的操作列(二改「还是需要操作列的」;三改拆双钮
 * 「查岗位再加查雇主」)。查岗位带职业参数、与在招数同口径;查雇主两种口径不混 ——
 * 指定雇主是硬门槛的制度给官方名录,普通省提名给该省该职业在招的雇主。
 * 2026-08-28 换装批自 Decision.tsx 的 act 列 render 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { DashText } from './dashtext'
import type { PlanCellRow } from './types'
import css from './plan.module.css'

/**
 * 渲染一个操作格。
 *
 * @param r 这一行展示行。
 * @returns 一到两颗钮,两个去处都没有时给灰横杠。
 */
export function PlanActCell(r: PlanCellRow) {
  if (r.links.jobs == null && r.links.emp == null) {
    return <span className={css.actCell}><DashText /></span>
  }
  return (
    <span className={css.actCell}>
      {r.links.jobs != null && (
        <LinkButton href={r.links.jobs}
          onClick={r.acts.go}
          className={cssOf(css.actGo)}>
          {r.text.actGo}
        </LinkButton>
      )}
      {r.links.emp != null && (
        <LinkButton href={r.links.emp}
          onClick={r.acts.emp}
          className={cssOf(css.actEmp)}>
          {r.text.actEmp}
        </LinkButton>
      )}
    </span>
  )
}
