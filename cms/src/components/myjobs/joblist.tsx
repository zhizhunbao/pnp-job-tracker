'use client'
/**
 * 一张清单:网页端(768 起)走通用 table 桶的表格形(照职位板 / 雇主板),手机一岗一张卡(MjCard);空了出空态。
 * 2026-10-10 批 2(lead 对效果图走查):原横卡清单(一行一张 JobRow,首字母块)换成这一形,今日推荐 / 我的收藏 / 我的投递共用。
 *
 * @author Frank
 * @time 2026-10-08 16:00:00
 */
import { useIsNarrow } from '@/components/modal'
import { Table } from '@/components/table'
import { NARROW_MAX, TABLE_MIN_W } from './constants'
import { rowKeyOf } from './functions'
import { MjCard } from './mjcard'
import type { JobListIn, ListRow } from './types'
import css from './myjobs.module.css'

/**
 * 渲染清单。
 *
 * @param props 展示行、网页端的列与空态。
 * @returns 表格或一列手机卡。
 */
export function JobList({ rows, cols, empty }: JobListIn) {
  const narrow = useIsNarrow(NARROW_MAX)
  if (rows.length === 0) {
    return <>{empty}</>
  }
  if (narrow === false) {
    return <Table<ListRow> cols={cols} rows={rows} rowKey={rowKeyOf} bare minWidth={TABLE_MIN_W} />
  }
  const cards = []
  for (const r of rows) {
    cards.push(<MjCard key={r.key} r={r} />)
  }
  return <div className={css.cards}>{cards}</div>
}
