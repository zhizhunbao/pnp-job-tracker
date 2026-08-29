'use client'
/**
 * 对比页的桌面表(≤640 由 CompareCards 顶替,切换靠 main.css 第 3 段那对全局类)。
 * 这是一张**转置**表:维度当行、雇主当列 —— 所以最左那列渲维度名,右边每一列
 * 代表一家雇主,列的取值器由 makeDimValue 按列身份造(它交回的是数据访问器,
 * 不是单元格组件)。
 * 2026-08-27 换装批自 Compare.tsx 的表格段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Table } from '@/components/table'
import { COMPARE_DIM_KEY, COMPARE_EMP_KEY_HEAD, COMPARE_TABLE_CLS, COMPARE_TABLE_MIN_PX, TEXT_NONE } from './constants'
import { CompareHeadLabel } from './compareheadlabel'
import { DimLabelCell } from './dimlabelcell'
import { dimRowKeyOf, makeDimValue } from './functions'
import type { CompareDim, CompareViewIn, EmpCol } from './types'

/**
 * 对比页桌面表。
 *
 * @param props 展示行与维度行(见 CompareViewIn 逐格注释)。
 * @returns 转置表。
 */
export function CompareTable({ rows, dims }: CompareViewIn) {
  const cols: EmpCol<CompareDim>[] = [
    { key: COMPARE_DIM_KEY, label: TEXT_NONE, nowrap: true, render: DimLabelCell },
  ]
  let i = 0
  for (const row of rows) {
    cols.push({
      key: COMPARE_EMP_KEY_HEAD + String(i),
      label: <CompareHeadLabel r={row} />,
      render: makeDimValue({ row }),
    })
    i = i + 1
  }
  return (
    <div className={COMPARE_TABLE_CLS}>
      <Table<CompareDim> rows={dims} rowKey={dimRowKeyOf} minWidth={COMPARE_TABLE_MIN_PX} cols={cols} />
    </div>
  )
}
