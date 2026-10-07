'use client'
/**
 * 两张表共用的外形:宽屏出通用 Table,窄屏(≤ 640)出全站职位卡的卡片流(切法照雇主板:CSS 媒体查询,首帧就对)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { Table } from '@/components/table'
import { TABLE_MIN_W } from './constants'
import { rowKeyOf } from './functions'
import { MyJobCard } from './myjobcard'
import type { MyJobsViewIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染表与卡片流。
 *
 * @param props 列组、展示行与空态。
 * @returns 表 + 卡片流(各在自己的屏宽出)。
 */
export function MyJobsView({ cols, rows, empty }: MyJobsViewIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<MyJobCard key={r.key} r={r} />)
  }
  return (
    <>
      <div className={css.table}>
        <Table cols={cols} rows={rows} rowKey={rowKeyOf} minWidth={TABLE_MIN_W} empty={empty} />
      </div>
      <div className={css.cards}>
        {cards}
        {rows.length === 0 && empty}
      </div>
    </>
  )
}
