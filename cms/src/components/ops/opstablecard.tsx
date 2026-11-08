'use client'
/**
 * ops 域的小件:一张表的白卡,桌面通用 Table,手机通用 JobCard。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { Pager } from '@/components/pager'
import { Table } from '@/components/table'
import { CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, EMPTY_TEXT, OPS_PAGE_SIZE, TABLE_MIN_W } from './constants'
import { opsColsOf, opsRowKeyOf } from './functions'
import { useOpsPage } from './hooks'
import { OpsCellView } from './opscellview'
import { OpsRowCard } from './opsrowcard'
import type { OpsRow, OpsTableCardIn } from './types'
import css from './ops.module.css'

/**
 * 一张表的白卡。
 *
 * @param props 这张表。
 * @returns 白卡。
 */
export function OpsTableCard({ table }: OpsTableCardIn) {
  const p = useOpsPage({ total: table.rows.length, size: OPS_PAGE_SIZE })
  const cards = []
  for (const r of table.rows.slice(p.page * OPS_PAGE_SIZE, (p.page + 1) * OPS_PAGE_SIZE)) {
    cards.push(<OpsRowCard key={r.key} row={r} />)
  }
  return (
    <section className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS + CLS_SEP + css.secHead}>
        {table.title}
        <span className={css.secN}>{table.count}</span>
      </div>
      <div className={css.desk}>
        <Table<OpsRow> cols={opsColsOf({ table, Cell: OpsCellView })} rows={table.rows} rowKey={opsRowKeyOf} bare
          minWidth={TABLE_MIN_W} empty={EMPTY_TEXT} pageSize={OPS_PAGE_SIZE} />
      </div>
      <div className={css.cards}>
        {table.rows.length === 0 && <div className={css.empty}>{EMPTY_TEXT}</div>}
        {cards}
        <Pager page={p.page} max={p.max} onPage={p.onPage} />
      </div>
    </section>
  )
}
