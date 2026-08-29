'use client'
/**
 * 域内小件:抽选表(桌面表格 + 手机卡两套 DOM)。
 * 2026-08-11(Frank「都改成一套」):自造裸 <table> → 公共 Table(bare = 外面那层白卡
 * 就是卡壳);列宽照旧写死(冷解读吃最宽一列,它是这张表的结论),百分比固定布局永不横滚。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Table } from '@/components/table'
import { drawColsOf, drawRowKeyOf } from './functions'
import { DrawCard } from './drawcard'
import type { DrawBoardIn, DrawCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染抽选表。
 *
 * @param props 取词函数与已切到条数档的展示行。
 * @returns 桌面表格 + 手机卡片两套 DOM。
 */
export function DrawBoard({ t, rows }: DrawBoardIn) {
  const cards = []
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i]
    if (r != null) {
      cards.push(<DrawCard key={r.key} row={r} last={i === rows.length - 1} t={t} />)
    }
  }
  return (
    <>
      <div className={css.drawTable}>
        <Table<DrawCellRow> rows={rows} cols={drawColsOf({ t })} rowKey={drawRowKeyOf} bare />
      </div>
      <div className={css.drawCards}>{cards}</div>
    </>
  )
}
