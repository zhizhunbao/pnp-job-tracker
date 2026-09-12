'use client'
/**
 * table 域的行体:一页数据行(+ 每行可选的跨列细行)。2026-09-12 DLI 胶囊批:
 * Table 加 detailOf 细行槽后超 75 行闸,行循环照 tablehead 的形提出成文件。
 *
 * @author Frank
 * @time 2026-09-12 13:40:00
 */
import { cssOf } from '@/components/css'
import { ALIGN_RIGHT, DETAIL_KEY_TAIL } from './constants'
import { cellOf, cls } from './functions'
import type { TableRowsIn } from './types'
import css from './table.module.css'

/**
 * 渲染一页数据行;给了 detailOf 的表,每行下探一次,回非 null 就追加一条跨全列细行。
 *
 * @param props 列声明、一页行、行键与可选细行渲染器。
 * @returns 行清单。
 */
export function TableRows<T>({ cols, rows, rowKey, detailOf }: TableRowsIn<T>) {
  const trs = []
  let i = 0
  for (const row of rows) {
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
    if (detailOf != null) {
      const detail = detailOf(row)
      if (detail != null) {
        trs.push(
          <tr key={rowKey(row, i) + DETAIL_KEY_TAIL}>
            <td colSpan={cols.length} className={css.detailTd}>{detail}</td>
          </tr>,
        )
      }
    }
    i = i + 1
  }
  return <>{trs}</>
}
