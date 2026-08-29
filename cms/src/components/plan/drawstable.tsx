'use client'
/**
 * plan 域的结构:各省最近抽选的桌面表。2026-08-11(Frank「都改成一套」)自造裸 table
 * 换成公共 Table(bare = 已在白卡内);列宽照旧写死。
 * 2026-08-28 换装批自 Decision.tsx 的 dpDrawTbl 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { Table } from '@/components/table'
import { drawColsOf, provRowKeyOf } from './functions'
import type { DrawCellRow, DrawRowsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染抽选的桌面表。
 *
 * @param props 取词函数与展示行。
 * @returns 桌面表。
 */
export function DrawsTable({ t, rows }: DrawRowsIn) {
  return (
    <div className={css.drawTbl}>
      <Table<DrawCellRow> rows={rows} rowKey={provRowKeyOf} bare cols={drawColsOf({ t })} />
    </div>
  )
}
