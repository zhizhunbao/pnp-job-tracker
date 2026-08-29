'use client'
/**
 * 域内小件:橱窗单表(Frank 2026-08-08「加分页」+「每表加筛选条件」+「按逻辑重新设计」)
 * —— 桌面 Table 翻页(10/页),手机卡 5/页;全量已在客户端 → 筛选纯前端。
 * 列组与洗行都借 employers 桶那套(sponsorEmployerColsOf / toSponsorCellRows / SponsorCard),
 * 本域只管筛选与两套 DOM 的排布,不重造一份。
 * B4 雇主门槛列(design/雇主省提名门槛判定-20260808.md):按本榜整批(未筛选前的行,
 * 不随用户筛选闪现 / 消失)判断要不要出这一列 —— 公司事实列 B3 还没建 DDL 前全行 unknown,
 * 列压根不进 cols(容缺先例同担保率列)。
 * 2026-08-28 换装批自 Pulse.tsx 的 SponsorBoard 重写成本件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { SponsorCard, sponsorEmployerColsOf, toSponsorCellRows } from '@/components/employers'
import { Pager } from '@/components/pager'
import { Table } from '@/components/table'
import { CARD_PAGE_SIZE, TABLE_PAGE_SIZE } from './constants'
import { sponsorRowKeyOf } from './functions'
import { useSponsorBoard } from './hooks'
import { SponsorFilters } from './sponsorfilters'
import type { SponsorBoardIn } from './types'
import css from './start.module.css'

/**
 * 渲染橱窗单表。
 *
 * @param props 本表的行、人群档、取词函数、界面语言、总数与三张字典。
 * @returns 筛选行 + 桌面表格 + 手机卡片。
 */
export function SponsorBoard({ rows, kind, t, lang, total, occOpts, catMids, nocCat }: SponsorBoardIn) {
  const p = useSponsorBoard({ rows, kind, t, lang, total, occOpts, catMids, nocCat })
  const cards = []
  for (const r of p.shown.slice(p.page * CARD_PAGE_SIZE, (p.page + 1) * CARD_PAGE_SIZE)) {
    cards.push(<SponsorCard key={r.name} r={r} lang={lang} t={t} kind={kind} showVerdict={p.showVerdict} />)
  }
  return (
    <>
      <SponsorFilters t={t} kind={kind} f={p.f} opts={p.opts} labels={p.labels} />
      <div className={css.table}>
        <Table rows={toSponsorCellRows({ rows: p.shown, t, lang, kind })}
          cols={sponsorEmployerColsOf({ t, kind, showVerdict: p.showVerdict })}
          rowKey={sponsorRowKeyOf}
          pageSize={TABLE_PAGE_SIZE}
          footerNote={p.note}
          empty={t('se.empty')} />
      </div>
      <div className={css.cards}>
        {cards}
        {p.shown.length === 0 && <div className={css.cardsEmpty}>{t('se.empty')}</div>}
        <div className={css.pagerWrap}>
          <Pager page={p.page} max={p.maxPage} note={p.note} onPage={p.onPage} />
        </div>
      </div>
    </>
  )
}
