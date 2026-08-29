'use client'
/**
 * plan 域的单元格:竞争表与职业竞争表的省份列 —— 把展示行那两格交给通用的省份格。
 * 两张表的展示行都带 provName/provCode 两格,所以这一枚同时给两张表用。
 * 2026-08-28 换装批自 Decision.tsx 的两处同形 render 收拢。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { ProvCell } from './provcell'
import type { ProvRow } from './types'

/**
 * 渲染竞争表的一个省份格。
 *
 * @param r 这一行展示行。
 * @returns 省份格。
 */
export function CompProvCell(r: ProvRow) {
  return <ProvCell name={r.provName} code={r.provCode} />
}
