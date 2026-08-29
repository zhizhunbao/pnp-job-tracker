'use client'
/**
 * 事实网格里的一行:维名 | 档名 | 依据,三格跨行对齐。
 * Frank 2026-07-26「没有拆成多个列的先拆,每列左对齐」:原先一维一行 bullet
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
 * 事实网格的一行(三个格子,由外层网格排列)。
 *
 * @param props 维名、档名与依据(逐格注释见 CompanyFactRowIn)。
 * @returns 三个格子。
 */
export function CompanyFactRow({ label, tier, evidence = null }: CompanyFactRowIn) {
  return (
    <>
      <span className={css.factK}>{label}</span>
      <span className={css.factV}>{tier}</span>
      <span className={css.factN}>{evidence}</span>
    </>
  )
}
