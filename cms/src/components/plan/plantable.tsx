'use client'
/**
 * plan 域的结构:初评的桌面表格。表格化(2026-08-15 Frank「这个也改成表格。手机改成卡片」
 * 「手机端很多重复文字」):标签进表头一次;门槛全行同值 → 收脚注一次不占列。
 * 排序已单源化(#307,住 lib/planRank,服务端排完下发)—— 这里**只渲染不重排**。
 * 2026-08-28 换装批自 Decision.tsx 的 dpPlanTbl 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Table } from '@/components/table'
import { planColsOf, planRowKeyOf } from './functions'
import type { PlanCellRow, PlanRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染初评的桌面表格。
 *
 * @param props 取词函数、展示行与粗筛态。
 * @returns 桌面表格。
 */
export function PlanTable({ t, rows, coarse }: PlanRowsIn) {
  return (
    <div className={css.planTbl}>
      <Table<PlanCellRow> rows={rows} rowKey={planRowKeyOf} bare cols={planColsOf({ t, coarse })} />
    </div>
  )
}
