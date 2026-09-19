'use client'
/**
 * 雇主板的列表区:加载条 + 桌面表格 / ≤640 卡片流 + 翻页。
 * 两套 DOM 各渲各的(站规:电脑用表格、手机用卡片),切换靠 CSS 断点 —— 零水合差异。
 * 事实行在这里洗成展示行:所在地回落、星形、带符号水位、指定与 LMIA 的文案灰注都在洗行时
 * 算完,单元格组件只读算好的那一项(2026-08-27 Frank 定的形)。
 * 2026-09-13 雇主板批二:表头排序受控(排序在服务端,表只渲标记)。同日 Frank「默认应该都显示啊」:
 * 不选行业也摊表(全组一家一行),设计稿「首屏不摊表」那条作废;计数进 banner,表上方计数行撤。
 * 2026-08-27 换装批自 Employers.tsx 的列表段提出成文件。
 * 2026-09-18 Frank「分页改成和 job table 一样的」:‹ 1 / 240 › 翻页器换成通用 pager 桶的 MoreLine(点一下往下接一批)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { MoreLine } from '@/components/pager'
import { Table } from '@/components/table'
import { emptyTextOf, empRowKeyOf, listClsOf, toEmployerCellRows } from './functions'
import { EmployerCards } from './employercards'
import { EmployerLoading } from './employerloading'
import type { EmployerCellRow, EmployerPanelIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板列表区。
 *
 * @param props 整机面板(它只读不写)。
 * @returns 加载条、表格、卡片流与翻页。
 */
export function EmployerBoard({ p }: EmployerPanelIn) {
  const rows = toEmployerCellRows({
    rows: p.data.rows, t: p.t, lang: p.lang, f: p.f, onOpen: p.peek.onOpenCompany,
  })
  const empty = emptyTextOf({ t: p.t, f: p.f })
  return (
    <>
      <EmployerLoading loading={p.loading} t={p.t} />
      <div className={listClsOf({ busy: p.loading })}>
        <div className={css.table}>
          <Table<EmployerCellRow> rows={rows}
            cols={p.cols}
            rowKey={empRowKeyOf}
            empty={empty}
            sort={p.sort}
            onSort={p.onSort} />
        </div>
        <div className={css.cards}>
          <EmployerCards rows={rows} empty={empty} />
        </div>
        <MoreLine shown={p.data.rows.length}
          total={p.data.total}
          loading={p.loading}
          moreText={p.t('loadMore', { n: p.data.total - p.data.rows.length })}
          allText={p.t('allShown', { total: p.data.total })}
          onMore={p.onMore} />
      </div>
    </>
  )
}
