'use client'
/**
 * 域内小件:职业榜(S2/S3/S4b 共用一套形态)—— 桌面 Table(全站公共表件,百分比自适应
 * 不横滚)/ ≤900 手机卡片列表(全站唯一那张 JobCard)。
 * 变化量口径 = **近 14 天新发环比 mom14d**(契约 v3):下架信号与 30 天窗都不可靠 →
 * 净流失类数字与措辞一律不上前端,判决语只说「14 天新发在萎缩 / 腰斩」这类拿新发数就能
 * 对账的话,且文案里必须带窗口(不许只写「环比」让人当成月环比)。
 * mom14d 缺列 / 全 null 时环比列**整列不出**(降级成在架 / 命中率 / 薪资撑得住的版本),
 * 绝不拿 0 顶包;单行缺值显横杠。
 * 判决列 2026-08-06 深夜删(Frank:「环比百分比用户一看就明白,还用再说一遍萎缩?」)
 * —— 判决只活在 S1 头条。
 * 2026-08-28 换装批自 Pulse.tsx 的 OccBoard 重写成本件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Pager } from '@/components/pager'
import { Table } from '@/components/table'
import { TABLE_PAGE_SIZE } from './constants'
import {
  occColsOf, occRowKeyOf, someMomOf, somePnpProvsOf, someSponsorRateOf, toOccCellRows,
} from './functions'
import { useCardPage } from './hooks'
import { OccCard } from './occcard'
import type { OccBoardIn, OccCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染一张职业榜。
 *
 * @param props 本榜的行、取词函数、界面语言、可提名省份表与四个列形开关。
 * @returns 桌面表格 + 手机卡片两套 DOM。
 */
export function OccBoard({
  rows,
  t,
  lang,
  nocProvs,
  showProvs = true,
  deadCol = false,
  flatDelta = false,
  pageSize = TABLE_PAGE_SIZE,
}: OccBoardIn) {
  const p = useCardPage({ rows, pageSize })
  const cells = toOccCellRows({ rows, t, lang, nocProvs, flatDelta })
  const cols = occColsOf({
    t,
    hasMom: someMomOf(rows),
    hasPnpProvs: somePnpProvsOf(rows),
    hasSponsorRate: someSponsorRateOf(rows),
    showProvs,
    deadCol,
  })
  const cards = []
  for (const c of cells.slice(p.page * pageSize, (p.page + 1) * pageSize)) {
    cards.push(<OccCard key={c.key} row={c} showProvs={showProvs} deadCol={deadCol} />)
  }
  return (
    <>
      <div className={css.table}>
        <Table<OccCellRow> rows={cells} cols={cols} rowKey={occRowKeyOf} pageSize={pageSize} />
      </div>
      <div className={css.cards}>
        {cards}
        <div className={css.pagerWrap}>
          <Pager page={p.page} max={p.maxPage} onPage={p.onPage} />
        </div>
      </div>
    </>
  )
}
