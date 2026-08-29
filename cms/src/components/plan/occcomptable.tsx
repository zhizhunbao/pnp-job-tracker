'use client'
/**
 * plan 域的结构:该职业分省竞争的桌面表。
 * 🔴 职业级的「几人抢一个」**没有任何官方源发布**,本站不编 —— 这里摆三个实数:
 * 在招岗数、近 30 天新增、平均在招天数(挂多久被撤:越短越抢手)。
 * 四列不合成分数:合成就是替用户拿主意,而且没有官方口径支持那种合成。
 * 2026-08-28 换装批自 Decision.tsx 的 dpOccTbl 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Table } from '@/components/table'
import { occCompColsOf, provRowKeyOf } from './functions'
import type { OccCellRow, OccCompRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染职业竞争的桌面表。
 *
 * @param props 取词函数与展示行。
 * @returns 桌面表。
 */
export function OccCompTable({ t, rows }: OccCompRowsIn) {
  return (
    <div className={css.occTbl}>
      <Table<OccCellRow> rows={rows} rowKey={provRowKeyOf} bare cols={occCompColsOf({ t })} />
    </div>
  )
}
