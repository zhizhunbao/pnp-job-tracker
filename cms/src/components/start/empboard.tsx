'use client'
/**
 * 域内小件:雇主表本体 —— 桌面表格 + 手机卡片(俩视图同刻只显示一个,各翻各的)。
 * 列集按表种取(担保信号表 / LMIA 表);行已是展示行,这里不再洗值。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { Pager } from '@/components/pager'
import { Table } from '@/components/table'
import { CARD_PAGE_SIZE, TABLE_PAGE_SIZE } from './constants'
import { EmpCard } from './empcard'
import { empColsOf, empRowKeyOf } from './functions'
import { useCardPage } from './hooks'
import type { EmpBoardIn, EmpCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染一张雇主表。
 *
 * @param props 展示行与表种。
 * @returns 表格 + 卡片列。
 */
export function EmpBoard({ t, rows, kind }: EmpBoardIn) {
  const p = useCardPage({ rows, pageSize: CARD_PAGE_SIZE })
  const cards = []
  for (const r of rows.slice(p.page * CARD_PAGE_SIZE, (p.page + 1) * CARD_PAGE_SIZE)) {
    cards.push(<EmpCard key={r.key} t={t} row={r} kind={kind} />)
  }
  const note = t('pulse.totalEmp', { n: rows.length })
  return (
    <>
      <div className={css.table}>
        <Table<EmpCellRow> rows={rows}
          cols={empColsOf({ t, kind })}
          rowKey={empRowKeyOf}
          pageSize={TABLE_PAGE_SIZE}
          footerNote={note} />
      </div>
      <div className={css.cards}>
        {cards}
        <div className={css.pagerWrap}>
          <Pager page={p.page} max={p.maxPage} note={note} onPage={p.onPage} />
        </div>
      </div>
    </>
  )
}
