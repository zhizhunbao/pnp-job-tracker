'use client'
/**
 * table 域的表头行:列名 + 排序态 + 列宽分隔线(拖手)。
 * 2026-08-24 二筛自 table.tsx 拆出(一个 tsx 一个组件)。
 *
 * style 白名单:列宽是拖出来/量出来的运行时数据,经 style 进是正当通道。
 *
 * @author Frank
 * @time 2026-08-24 11:00:00
 */
import { cssOf } from '@/components/css'
import { ALIGN_RIGHT } from './constants'
import { cls } from './functions'
import { SortMark } from './sortmark'
import type { Col, TableHeadIn } from './types'
import css from './table.module.css'

/**
 * 表头行。
 *
 * @param props 列声明、排序态与列宽机器。
 * @returns thead。
 */
export function TableHead<T>({ cols, sort, toggleSort, widths }: TableHeadIn<T>) {
  const ths = []
  for (const c of cols) {
    const sortable = c.sort != null
    let active = false
    let dir: 1 | -1 = -1
    if (sort != null && sort.key === c.key) {
      active = true
      dir = sort.dir
    }

    function clickHead() {
      if (sortable) {
        toggleSort(c.key)
      }
    }

    function grip(e: React.PointerEvent) {
      widths.startResize({ e, key: c.key })
    }

    function stopGripClick(e: React.MouseEvent) {
      e.stopPropagation()
    }

    function widthStyle(col: Col<T>): React.CSSProperties {
      const w = widths.widthOf(col)
      if (w == null) {
        return {}
      }
      return { width: w }
    }

    ths.push(
      <th key={c.key}
        ref={widths.thRefOf(c.key)}
        title={c.thTip}
        className={cls(
          cssOf(css.th),
          sortable && css.sortable,
          c.thTip != null && css.tip,
          c.align === ALIGN_RIGHT && css.right,
          c.className,
        )}
        onClick={clickHead}
        // eslint-disable-next-line react/forbid-dom-props -- 列宽是拖出来/量出来的运行时数据
        style={widthStyle(c)}>
        {c.label}
        <SortMark active={active} dir={dir} sortable={sortable} />
        <span className={css.grip} onPointerDown={grip} onClick={stopGripClick} />
      </th>,
    )
  }
  return <thead><tr>{ths}</tr></thead>
}
