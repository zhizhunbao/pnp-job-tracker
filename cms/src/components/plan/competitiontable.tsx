'use client'
/**
 * plan 域的结构:各省名额竞争的桌面表。9 省同口径、来源同一份 IRCC 开放数据 ——
 * 所以敢横着比、敢排序。
 * 2026-08-28 换装批自 Decision.tsx 的 dpCompTbl 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Table } from '@/components/table'
import { competitionColsOf, provRowKeyOf } from './functions'
import type { CompCellRow, CompetitionRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染竞争的桌面表。
 *
 * @param props 取词函数、展示行、年份与三处口径日期。
 * @returns 桌面表。
 */
export function CompetitionTable({
  t, rows, year, hasSplit, stockAsOf, poolAsOf, flowPeriod, yearFlowPeriod,
}: CompetitionRowsIn) {
  return (
    <div className={css.compTbl}>
      <Table<CompCellRow> rows={rows} rowKey={provRowKeyOf} bare
        cols={competitionColsOf({ t, year, hasSplit, stockAsOf, poolAsOf, flowPeriod, yearFlowPeriod })} />
    </div>
  )
}
