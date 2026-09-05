'use client'
/**
 * 域内小件:抽选表本体 —— 桌面表格(每页 10 行)+ 手机卡片(同样每页 10 张,各翻各的)。
 * 2026-09-04 Frank「默认显示 10 行,显示所有条目,加上分页」。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Pager } from '@/components/pager'
import { Table } from '@/components/table'
import { CARD_PAGE_SIZE, TABLE_PAGE_SIZE } from './constants'
import { drawColsOf, drawRowKeyOf } from './functions'
import { useCardPage } from './hooks'
import { DrawCard } from './drawcard'
import type { DrawBoardIn, DrawCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染抽选表。
 *
 * @param props 展示行与取词函数。
 * @returns 表格 + 卡片列。
 */
export function DrawBoard({ t, rows }: DrawBoardIn) {
  const p = useCardPage({ rows, pageSize: CARD_PAGE_SIZE })
  const cards = []
  const shown = rows.slice(p.page * CARD_PAGE_SIZE, (p.page + 1) * CARD_PAGE_SIZE)
  for (let i = 0; i < shown.length; i += 1) {
    const r = shown[i]
    if (r != null) {
      cards.push(<DrawCard key={r.key} row={r} last={i === shown.length - 1} t={t} />)
    }
  }
  return (
    <>
      <div className={css.drawTable}>
        <Table<DrawCellRow> rows={rows}
          cols={drawColsOf({ t })}
          rowKey={drawRowKeyOf}
          pageSize={TABLE_PAGE_SIZE}
          bare />
      </div>
      <div className={css.drawCards}>
        {cards}
        <div className={css.pagerWrap}>
          <Pager page={p.page} max={p.maxPage} onPage={p.onPage} />
        </div>
      </div>
    </>
  )
}
