'use client'
/**
 * 职位榜(每日总榜 / 每日分类榜 / 周榜)的列表区:桌面表格 / ≤640 卡片流。
 * 两套 DOM 各渲各的(站规:电脑用表格、手机用卡片),切换靠 CSS 断点 —— 零水合差异。
 * 组件统一 P2 余批(#110):表格走公共 Table 不自造;E8-08 #121:≤640 换本域卡。
 * 事实行在这里洗成展示行:通道与类别的三语显示名、地点拼格、缺数横杠都在洗行时算完。
 * 2026-08-28 换装批自 Ranking.tsx 的职位榜分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { Table } from '@/components/table'
import { jobColsOf, jobRowKeyOf, toRankJobCellRows } from './functions'
import { RankJobCard } from './rankjobcard'
import type { RankBoardIn, RankJobCellRow } from './types'
import css from './rankings.module.css'

/**
 * 职位榜列表区。
 *
 * @param props 本榜的行与取词函数。
 * @returns 卡片流与表格。
 */
export function RankJobBoard({ items, t }: RankBoardIn) {
  const rows = toRankJobCellRows({ items, t })
  const cards = []
  for (const r of rows) {
    cards.push(<RankJobCard key={r.key} r={r} />)
  }
  return (
    <>
      <div className={css.cards}>{cards}</div>
      <div className={css.table}>
        <Table<RankJobCellRow> rows={rows} cols={jobColsOf({ t })} rowKey={jobRowKeyOf} />
      </div>
    </>
  )
}
