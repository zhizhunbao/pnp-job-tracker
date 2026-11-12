'use client'
/**
 * me 桶子桶 jobs 的一张清单:宽屏走通用 table 桶的表格形(照职位板 / 雇主板),窄屏(640 及以下,同「我的」框架的断点)一岗一条;
 * 空了出空态。今日推荐 / 我的收藏 / 我的投递共用。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { useIsNarrow } from '@/components/modal'
import { Table } from '@/components/table'
import { TABLE_MIN_W } from './constants'
import { rowKeyOf } from './functions'
import { FitDetail } from './fitdetail'
import { JobCard } from './jobcard'
import type { JobListIn, ListRow } from './types'
import css from './jobs.module.css'

/**
 * 渲染清单。
 *
 * @param props 展示行、网页端的列与空态。
 * @returns 表格或一列手机条。
 */
export function JobList({ rows, cols, empty }: JobListIn) {
  const narrow = useIsNarrow()
  if (rows.length === 0) {
    return <>{empty}</>
  }
  if (narrow === false) {
    return <Table<ListRow> cols={cols} rows={rows} rowKey={rowKeyOf} detailOf={FitDetail} bare minWidth={TABLE_MIN_W} />
  }
  const items = []
  for (const r of rows) {
    items.push(<JobCard key={r.key} r={r} />)
  }
  return <div className={cssOf(css.items)}>{items}</div>
}
