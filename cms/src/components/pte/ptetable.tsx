'use client'
/**
 * 域内小件:桌面题单表(通用 Table,六列百分比固定版式;手机由 css 藏掉换卡)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Table } from '@/components/table'
import { colsOf, rowKeyOf } from './functions'
import type { PteRowsViewIn } from './types'
import css from './pte.module.css'

/**
 * 渲染桌面题单表。
 *
 * @param props 取词函数与展示行。
 * @returns 表。
 */
export function PteTable({ t, rows }: PteRowsViewIn) {
  return (
    <div className={css.desk}>
      <Table cols={colsOf({ t })} rows={rows} rowKey={rowKeyOf} empty={t('pte.empty')} bare />
    </div>
  )
}
