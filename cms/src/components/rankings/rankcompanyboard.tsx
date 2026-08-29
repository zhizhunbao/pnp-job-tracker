'use client'
/**
 * 公司榜(sponsor-likely)的列表区:桌面表格 / ≤640 卡片流。
 * 两套 DOM 各渲各的(站规:电脑用表格、手机用卡片),切换靠 CSS 断点 —— 零水合差异。
 * 组件统一 P2 余批(#110):表格走公共 Table 不自造;E8-08 #121:≤640 换本域卡。
 * 事实行在这里洗成展示行:缺数格的横杠口径、卡上那几条标签都在洗行时算完,
 * 单元格组件只读算好的那一项(2026-08-27 Frank 定的形,样张 employers)。
 * 2026-08-28 换装批自 Ranking.tsx 的公司榜分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { Table } from '@/components/table'
import { companyColsOf, companyRowKeyOf, showNamedOf, toRankCompanyCellRows } from './functions'
import { RankCompanyCard } from './rankcompanycard'
import type { RankBoardIn, RankCompanyCellRow } from './types'
import css from './rankings.module.css'

/**
 * 公司榜列表区。
 *
 * @param props 本榜的行与取词函数。
 * @returns 卡片流与表格。
 */
export function RankCompanyBoard({ items, t }: RankBoardIn) {
  const showNamed = showNamedOf(items)
  const rows = toRankCompanyCellRows({ items, t, showNamed })
  const cards = []
  for (const r of rows) {
    cards.push(<RankCompanyCard key={r.key} r={r} />)
  }
  return (
    <>
      <div className={css.cards}>{cards}</div>
      <div className={css.table}>
        <Table<RankCompanyCellRow> rows={rows}
          cols={companyColsOf({ t, showNamed })}
          rowKey={companyRowKeyOf} />
      </div>
    </>
  )
}
