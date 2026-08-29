'use client'
/**
 * 雇主板的列表区:加载条 + 桌面表格 / ≤640 卡片流 + 翻页。
 * 两套 DOM 各渲各的(站规:电脑用表格、手机用卡片),切换靠 CSS 断点 —— 零水合差异。
 * 事实行在这里洗成展示行:显示要用的省名回落、职业人话名、卡上那两条话术都在洗行时
 * 算完,单元格组件只读算好的那一项(2026-08-27 Frank 定的形)。
 * 2026-08-27 换装批自 Employers.tsx 的列表段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Pager } from '@/components/pager'
import { Table } from '@/components/table'
import {
  emptyTextOf, empRowKeyOf, employerColsOf, hasListUrl, listClsOf, maxPageOf, noteTextOf, toEmployerCellRows,
} from './functions'
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
    rows: p.data.rows,
    t: p.t,
    lang: p.lang,
    f: p.f,
    titles: p.data.nocTitles,
  })
  const cols = employerColsOf({ t: p.t, mode: p.f.mode, hasList: hasListUrl(rows) })
  const note = noteTextOf({ t: p.t, f: p.f, total: p.data.total })
  const empty = emptyTextOf({ t: p.t, f: p.f })
  const maxPage = maxPageOf({ total: p.data.total, pageSize: p.data.pageSize })
  const header = <div className={css.note}><span className={css.noteText}>{note}</span></div>
  return (
    <>
      <EmployerLoading loading={p.loading} t={p.t} />
      <div className={listClsOf({ busy: p.loading })}>
        <div className={css.table}>
          <Table<EmployerCellRow> rows={rows}
            cols={cols}
            rowKey={empRowKeyOf}
            empty={empty}
            header={header}
            bare />
        </div>
        <div className={css.cards}>
          <EmployerCards rows={rows} note={note} empty={empty} />
        </div>
        {p.data.total > 0 && (
          <div className={css.pagerWrap}>
            <Pager page={Math.min(p.f.page, maxPage - 1)} max={maxPage} onPage={p.onPage} />
          </div>
        )}
      </div>
    </>
  )
}
