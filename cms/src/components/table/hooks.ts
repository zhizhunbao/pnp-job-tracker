'use client'
/**
 * table 域的状态机器:排序与分页、量宽锁列与拖列宽。
 * 两台机器各自成对(排序变了要回第一页;量出来的宽和拖出来的宽写同一格),
 * 拆开会互相依赖成环 —— 同 modal 的 useCard 判据。
 *
 * @author Frank
 * @time 2026-08-24 11:00:00
 */
import { useLayoutEffect, useRef, useState } from 'react'

import {
  COL_W_FALLBACK, COL_W_MIN, EV_POINTERMOVE, EV_POINTERUP, LAYOUT_LOCKED, PCT_DECIMALS, PCT_UNIT, SIG_SEP, SIG_TAIL,
} from './constants'
import { sortRows } from './functions'
import type {
  Col, ColWidthsIn, ColWidthsOut, MeasureIn, ResizeIn, RowsIn, RowsOut, RunResizeIn, SortState,
} from './types'

/**
 * 排序 + 分页整机(简单表数据全量在手:先全量排序再切页)。
 * 数据换了(如切省)回第一页,不停在越界页 —— 回页在渲染中对比上一批行完成
 * (React 官方「adjusting state during render」形态,2026-08-26 由 effect 改写:
 * effect 里同步 setState 会多提交一帧旧页,react-hooks/set-state-in-effect 也拦)。
 *
 * @param x 列声明、行、每页行数。
 * @returns 机器面板(当前页行、排序态与翻页手柄)。
 */
export function useRows<T>(x: RowsIn<T>): RowsOut<T> {
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(0)
  const [prevRows, setPrevRows] = useState(x.rows)

  if (prevRows !== x.rows) {
    setPrevRows(x.rows)
    setPage(0)
  }

  function toggleSort(key: string) {
    function next(s: SortState): SortState {
      // 三态循环:首点降序 → 再点升序 → 三点取消(回落入库序)。
      if (s == null || s.key !== key) {
        return { key, dir: -1 }
      }
      if (s.dir === -1) {
        return { key, dir: 1 }
      }
      return null
    }
    setSort(next)
  }

  function isActive(c: Col<T>): boolean {
    if (sort == null) {
      return false
    }
    return c.key === sort.key
  }

  let sorted = x.rows
  if (sort != null) {
    const col = x.cols.find(isActive)
    if (col != null) {
      sorted = sortRows({ rows: x.rows, col, dir: sort.dir })
    }
  }

  let maxPage = 1
  if (x.pageSize != null) {
    maxPage = Math.max(1, Math.ceil(x.rows.length / x.pageSize))
  }
  const p = Math.min(page, maxPage - 1)
  let paged = sorted
  if (x.pageSize != null) {
    paged = sorted.slice(p * x.pageSize, (p + 1) * x.pageSize)
  }

  return { paged, sort, toggleSort, page: p, maxPage, setPage }
}

/**
 * 量宽锁列 + 拖列宽整机(Frank 2026-08-10「点列排序的时候宽度会变化」):
 * auto 布局按**当页**最长值算列宽,排序/翻页换了一批行就整表重排 → 每点一次表头列都跳。
 * 首屏先用 auto 量一次真实内容宽,换算成百分比锁成 fixed 布局(百分比而非 px:容器变窄
 * 仍按比例缩,不横滚);只有数据本身换了(切筛选/换页大小)才重量 —— 重量的解锁
 * 在渲染中对比签名完成(同 useRows 的回页形态,2026-08-26 由 layout effect 改写)。
 * 拖列宽写的是像素,压过量出来的百分比。
 * 表元素 ref 由挂 table 的组件持有并经 x 传进来(2026-08-26:原先住返回面板里,
 * 混装 ref 的面板会被 react-hooks/refs 整体判成「渲染期读 ref」)。
 *
 * @param x 列声明、行数与表元素 ref。
 * @returns 机器面板(表头 ref 工厂、布局模式、取宽与起手拖)。
 */
export function useColWidths<T>(x: ColWidthsIn<T>): ColWidthsOut<T> {
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [pct, setPct] = useState<Record<string, string> | null>(null)
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({})

  function keyOf(c: Col<T>): string {
    return c.key
  }
  const sig = x.cols.map(keyOf).join(SIG_SEP) + SIG_TAIL + x.rowCount
  const [prevSig, setPrevSig] = useState(sig)

  if (prevSig !== sig) {
    setPrevSig(sig)
    setPct(null)
  }

  useLayoutEffect(function measure() {
    if (pct != null) {
      return
    }
    const m = measureCols({ cols: x.cols, table: x.tableRef.current, ths: thRefs.current })
    if (m == null) {
      return
    }
    setPct(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 量宽只随 pct/sig 重跑;cols 引用每渲染都新,列全集变化已折进 sig
  }, [pct, sig])

  function thRefOf(key: string) {
    function ref(el: HTMLTableCellElement | null) {
      thRefs.current[key] = el
    }
    return ref
  }

  function widthOf(col: Col<T>): string | number | null {
    const dragged = widths[col.key]
    if (dragged != null) {
      return dragged
    }
    if (pct != null) {
      const p = pct[col.key]
      if (p != null) {
        return p
      }
    }
    if (col.width != null) {
      return col.width
    }
    return null
  }

  function startResize(x2: ResizeIn) {
    runResize({ e: x2.e, key: x2.key, from: startWidthOf(x2.key), setWidths })
  }

  function startWidthOf(key: string): number {
    if (widths[key] != null) {
      return widths[key]
    }
    const el = thRefs.current[key]
    if (el != null) {
      return el.offsetWidth
    }
    return COL_W_FALLBACK
  }

  let layout: 'auto' | 'fixed' = 'auto'
  if (pct != null) {
    layout = LAYOUT_LOCKED
  }
  return { thRefOf, layout, widthOf, startResize }
}

/**
 * 量一遍列宽:各列真实内容宽 → 占总宽的百分比(百分比而非 px:容器变窄仍按比例缩)。
 * 表还没上屏(总宽 0)或哪一列的表头还没挂上 → 给 null,这一轮不锁,下一帧再来。
 *
 * @param x 列声明、表元素与表头元素表。
 * @returns 列 key → 百分比串;null = 这轮量不了。
 */
function measureCols<T>(x: MeasureIn<T>): Record<string, string> | null {
  let total = 0
  if (x.table != null) {
    total = x.table.offsetWidth
  }
  if (total === 0) {
    return null
  }
  const m: Record<string, string> = {}
  for (const c of x.cols) {
    if (c.width != null) {
      // 显式列宽不参与量宽(调用方已定死版式)
      m[c.key] = c.width
      continue
    }
    const el = x.ths[c.key]
    if (el == null) {
      return null
    }
    m[c.key] = (el.offsetWidth / total * 100).toFixed(PCT_DECIMALS) + PCT_UNIT
  }
  return m
}

/**
 * 拖列宽的窗口级跟手(自 useColWidths 提出:那台机器 103 行超闸,而这段与 React 状态
 * 只有一个 setter 的接触面)。按下起手 → 跟手写像素宽 → 松手摘监听。
 *
 * @param x 起手事件、列 key、起手宽与写宽的 setter。
 * @returns 无。
 */
function runResize(x: RunResizeIn) {
  x.e.preventDefault()
  x.e.stopPropagation()
  const sx = x.e.clientX

  function move(ev: PointerEvent) {
    function put(w: Record<string, number>): Record<string, number> {
      const next: Record<string, number> = {}
      for (const [k, v] of Object.entries(w)) {
        next[k] = v
      }
      next[x.key] = Math.max(COL_W_MIN, x.from + ev.clientX - sx)
      return next
    }
    x.setWidths(put)
  }

  function up() {
    window.removeEventListener(EV_POINTERMOVE, move)
    window.removeEventListener(EV_POINTERUP, up)
  }

  window.addEventListener(EV_POINTERMOVE, move)
  window.addEventListener(EV_POINTERUP, up)
}
