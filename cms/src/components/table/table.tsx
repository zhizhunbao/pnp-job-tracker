'use client'
/**
 * table 域的结构与交互:表头排序态、拖列宽、量宽锁列、分页。
 * 样式在 Table.module.css,门槛数在 constants,纯排序/类拼在 functions。
 * jobs 主表是独立重器(服务端排序/冻结列/字段面板)不并入,只对齐视觉 token(G 节拍板)。
 *
 * 🔴 style 白名单(2026-08-24 Frank「为什么还有 style 这种写法」的边界):静态样式零
 * style 全进 module.css;本文件仅剩的三处 style 都是**运行时算出的数据**(拖列宽、
 * 量宽锁列的百分比、minWidth 横滚阈值)—— 值随交互变,不是样式,经 style 进是正当通道。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pager } from '@/components/ui'
import { COL_W_FALLBACK, COL_W_MIN, PCT_DECIMALS } from './constants'
import { cls, sortRows } from './functions'
import type { Col, TableIn } from './types'
import css from './table.module.css'

/**
 * 公共简单表(2026-07-19 Frank「所有页面都用同一个 table 组件」)。
 *
 * @param props 列声明、行与可选的分页/壳形开关(各字段说明见签名内注)。
 * @returns 表格(白卡壳或裸表)。
 */
export function Table<T>({ cols, rows, rowKey, empty, header, minWidth, pageSize, footerNote, foot, bare }: TableIn<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [rows])   // 数据换了(如切省)回第一页,不停在越界页
  const [widths, setWidths] = useState<Record<string, number>>({})
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({})
  // 列宽锁(Frank 08-10「点列排序的时候宽度会变化」):auto 布局按**当页**最长值算列宽,排序/翻页换了
  // 一批行就整表重排 → 每点一次表头列都跳。首屏先用 auto 量一次真实内容宽,换算成百分比锁成 fixed
  // 布局(百分比而非 px:容器变窄仍按比例缩,不横滚);只有数据本身换了(切筛选/换页大小)才重量。
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [pct, setPct] = useState<Record<string, string> | null>(null)
  const sig = cols.map((c) => c.key).join('|') + '#' + rows.length
  useLayoutEffect(() => { setPct(null) }, [sig])
  useLayoutEffect(() => {
    if (pct) return
    const total = tableRef.current?.offsetWidth || 0
    if (!total) return
    const m: Record<string, string> = {}
    for (const c of cols) {
      if (c.width) { m[c.key] = c.width; continue }   // 显式列宽不参与量宽(调用方已定死版式)
      const el = thRefs.current[c.key]
      if (!el) return
      m[c.key] = (el.offsetWidth / total * 100).toFixed(PCT_DECIMALS) + '%'
    }
    setPct(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 量宽只随 pct/sig 重跑;cols 引用每渲染都新,列全集变化已折进 sig
  }, [pct, sig])
  const activeCol = sort ? cols.find((c) => c.key === sort.key) : undefined
  const sorted = sort && activeCol ? sortRows(rows, activeCol, sort.dir) : rows
  const maxPage = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const p = Math.min(page, maxPage - 1)
  const paged = pageSize ? sorted.slice(p * pageSize, (p + 1) * pageSize) : sorted
  const startResize = (e: React.PointerEvent, key: string) => {
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sw = widths[key] ?? thRefs.current[key]?.offsetWidth ?? COL_W_FALLBACK
    const move = (ev: PointerEvent) => setWidths((w) => ({ ...w, [key]: Math.max(COL_W_MIN, sw + ev.clientX - sx) }))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  // 列分隔线由 :not(:last-child) 管;修饰类从 module 取,列级外部 class(如 .fnCol)原样透传
  return (
    <div className={bare ? cls(css.shell, css.bare) : css.shell}>
      {header}
      <table ref={tableRef} className={css.table} style={{ minWidth, tableLayout: pct ? 'fixed' : 'auto' }}>
        <thead><tr>
          {cols.map((c) => (
            <th key={c.key} ref={(el) => { thRefs.current[c.key] = el }} title={c.thTip}
              className={cls(css.th, c.sort && css.sortable, c.thTip && css.tip, c.align === 'right' && css.right, c.className)}
              onClick={c.sort ? () => setSort((s) => (s?.key === c.key ? (s.dir === -1 ? { key: c.key, dir: 1 } : null) : { key: c.key, dir: -1 })) : undefined}
              style={{ width: widths[c.key] ?? pct?.[c.key] ?? c.width }}>
              {c.label}{sort?.key === c.key ? (sort.dir === -1 ? ' ▼' : ' ▲') : c.sort ? <span className={css.sortHint}> ⇅</span> : null}
              <span className={css.grip} onPointerDown={(e) => startResize(e, c.key)} onClick={(e) => e.stopPropagation()} />
            </th>
          ))}
        </tr></thead>
        <tbody>
          {/* E8-08 hover 规范(Frank「可点才有态」):行本身不可点 → 行 hover 摘除(原 #f9fafb 全行态误导);
              行内链接/钮的 hover 由 main.css 全局规则(a:hover 加深)接管 */}
          {paged.map((r, i) => {
            const k = rowKey(r, i)
            return (
              <tr key={k}>
                {cols.map((c) => (
                  <td key={c.key} className={cls(css.td, c.align === 'right' && css.right, c.nowrap && css.nowrap, c.className)}>
                    {c.render ? c.render(r) : String((r as any)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            )
          })}
          {foot}
        </tbody>
      </table>
      {rows.length === 0 && <div className={css.empty}>{empty}</div>}
      {pageSize != null && rows.length > 0 && (
        <div className={css.foot}>
          <Pager page={p} max={maxPage} note={footerNote} onPage={setPage} />
        </div>
      )}
    </div>
  )
}
