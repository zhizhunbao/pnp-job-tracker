'use client'
/**
 * 雇主信号的一行:左段维名 + 灰注依据,右段档名 —— 照同卡上方「在招职位」行的形(JobMiniRow),
 * 类名直接复用 .jobRow / .jobL / .jobSub / .jobR(同一形态单一出口,不另起一套)。
 * 2026-09-14 Frank「下面的雇主信号和上面的排版保持一致吧」:原三列网格(维名 | 档名 | 依据)退役。
 * 原三列的来历留档:Frank 2026-07-26「没有拆成多个列的先拆,每列左对齐」:原先一维一行 bullet
 *「担保: 常年担保 共 12 份,其中技能类 4,最近 2026Q2」—— 三个事实揉在一句里,
 * 四维之间也对不齐;改三列之后每一列各说一件事。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 row 闭包重写成件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import type { CompanyFactRowIn } from './types'
import css from './companies.module.css'

/**
 * 渲染一行雇主信号(左维名与依据,右档名)。
 *
 * @param props 维名、档名与依据(逐格注释见 CompanyFactRowIn)。
 * @returns 左右两段的一行。
 */
export function CompanyFactRow({ label, tier, evidence = null }: CompanyFactRowIn) {
  return (
    <div className={css.jobRow}>
      <span className={css.jobL}>
        {label}
        {evidence != null && <div className={css.jobSub}>{evidence}</div>}
      </span>
      <span className={css.jobR}>{tier}</span>
    </div>
  )
}
