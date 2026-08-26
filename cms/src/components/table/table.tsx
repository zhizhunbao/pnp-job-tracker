'use client'
/**
 * table 域的结构:公共简单表(2026-07-19 Frank「所有页面都用同一个 table 组件」)。
 * 只剩装配:两台机器在 hooks(useRows 排序分页、useColWidths 量宽锁列与拖列宽),
 * 表头在 tablehead、排序标记在 sortmark、纯件在 functions、死值在 constants、
 * 样式在 table.module.css。
 * jobs 主表是独立重器(服务端排序/冻结列/字段面板)不并入,只对齐视觉 token(G 节拍板)。
 * 2026-08-24 二筛(Frank 拍板的组件域全量闸):三目/箭头/展开/as any 清零。
 *
 * 🔴 style 白名单(2026-08-24 Frank「为什么还有 style 这种写法」的边界):静态样式零
 * style 全进 module.css;仅剩的两处 style 都是**运行时算出的数据**(表最小宽与布局
 * 模式、列宽)—— 值随交互变,不是样式,经 style 进是正当通道。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
import { useRef } from 'react'

import { cssOf } from '@/components/css'
import { Pager } from '@/components/pager'
import { ALIGN_RIGHT } from './constants'
import { cellOf, cls } from './functions'
import { useColWidths, useRows } from './hooks'
import { TableHead } from './tablehead'
import type { TableIn } from './types'
import css from './table.module.css'

/**
 * 公共简单表(白卡壳或裸表)。
 *
 * @param props 列声明、行与可选的分页/壳形开关(各字段说明见 TableIn)。
 * @returns 表格。
 */
export function Table<T>({
  cols,
  rows,
  rowKey,
  empty,
  header,
  minWidth,
  pageSize,
  footerNote,
  foot,
  bare = false,
}: TableIn<T>) {
  let pageSizeIn: number | null = null
  if (pageSize != null) {
    pageSizeIn = pageSize
  }
  const r = useRows({ cols, rows, pageSize: pageSizeIn })
  const tableRef = useRef<HTMLTableElement | null>(null)
  const widths = useColWidths({ cols, rowCount: rows.length, tableRef })

  const trs = []
  let i = 0
  for (const row of r.paged) {
    const tds = []
    for (const c of cols) {
      tds.push(
        <td key={c.key}
          className={cls(
            cssOf(css.td),
            c.align === ALIGN_RIGHT && css.right,
            c.nowrap === true && css.nowrap,
            c.className,
          )}>
          {cellOf({ row, col: c })}
        </td>,
      )
    }
    trs.push(<tr key={rowKey(row, i)}>{tds}</tr>)
    i = i + 1
  }

  return (
    <div className={cls(cssOf(css.shell), bare && css.bare)}>
      {header}
      {/* eslint-disable-next-line react/forbid-dom-props -- 表最小宽与布局模式是运行时数据(量宽完成才锁 fixed) */}
      <table ref={tableRef} className={css.table} style={{ minWidth, tableLayout: widths.layout }}>
        <TableHead cols={cols} sort={r.sort} toggleSort={r.toggleSort} widths={widths} />
        <tbody>
          {/* E8-08 hover 规范(Frank「可点才有态」):行本身不可点 → 行 hover 摘除(原 #f9fafb 全行态误导);
              行内链接/钮的 hover 由 main.css 全局规则(a:hover 加深)接管 */}
          {trs}
          {foot}
        </tbody>
      </table>
      {rows.length === 0 && <div className={css.empty}>{empty}</div>}
      {pageSize != null && rows.length > 0 && (
        <div className={css.foot}>
          <Pager page={r.page} max={r.maxPage} note={footerNote} onPage={r.setPage} />
        </div>
      )}
    </div>
  )
}
