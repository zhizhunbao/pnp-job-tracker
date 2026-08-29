'use client'
/**
 * 一条通道的职业表。组件统一 P2 余批(#110):通道表换公共 Table
 * (排序 / 拖宽 / hover 同职位板观感),通道标题走 header 槽。
 * 2026-08-28 换装批自 Occupations.tsx 的通道循环体提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
import { Table } from '@/components/table'
import { occColsOf, occRowKeyOf, toOccCellRows } from './functions'
import { StreamHead } from './streamhead'
import type { OccCellRow, StreamTableIn } from './types'
import css from './occupations.module.css'

/**
 * 一条通道的职业表。
 *
 * @param props 这条通道的分组与取词函数(逐格注释见 StreamTableIn)。
 * @returns 通道表。
 */
export function StreamTable({ stream, t }: StreamTableIn) {
  return (
    <div className={css.stream}>
      <Table<OccCellRow> rows={toOccCellRows({ rows: stream.occ, t })}
        cols={occColsOf({ t })}
        rowKey={occRowKeyOf}
        header={<StreamHead stream={stream} t={t} />} />
    </div>
  )
}
