'use client'
/**
 * plan 域的单元格:省份格 —— 省全名做主文案、两位省码做灰字小注(站规 ui-plain-language)。
 * 省名放不下给省略号,灰码永不截(只有两个字符,截了就没意义)。
 * 竞争表与职业竞争表共用同一枚。
 * 2026-08-28 换装批自 Decision.tsx 的两处同形 render 收拢。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { ProvCellIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一个省份格。
 *
 * @param props 省全名与省码。
 * @returns 省份格。
 */
export function ProvCell({ name, code }: ProvCellIn) {
  return (
    <span className={css.provCell}>
      <span className={css.provName}>{name}</span>
      <span className={css.provCode}>{code}</span>
    </span>
  )
}
