'use client'
// 公共 Table(组件统一 P2 头件,2026-07-19 Frank:「所有页面都用同一个 table 组件」)——
// 简单表统一壳:jobs 主表同款观感(表头可排序 ↑↓ 态、拖列宽、行 hover、白卡圆角描边容器);
// jobs 主表是独立重器(服务端排序/冻结列/字段面板)不并入,只对齐视觉 token(G 节拍板)。
// 排序=客户端(简单表数据已全量在手);列用配置声明,render 缺省取 r[key]。
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { UI } from './tokens'

// 翻页行(总数 + ‹ x/y ›):Table 内置页脚用,OccBoard 手机卡片列表也复用同一个
export function Pager({ page, max, note, onPage }: {
  page: number; max: number; note?: React.ReactNode; onPage: (p: number) => void
}) {
  // #276 手机触控靶:padding 移交 .dtPagerBtn(main.css),桌面值原样,手机断点单独抬 ≥44px
  const btn = (disabled: boolean): React.CSSProperties => ({
    border: `1px solid ${UI.border}`, borderRadius: 6, background: '#fff',
    fontSize: 13, lineHeight: '18px', fontFamily: 'inherit',
    color: disabled ? '#d1d5db' : UI.text2, cursor: disabled ? 'default' : 'pointer',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: UI.text2 }}>
      {note != null && <span>{note}</span>}
      {max > 1 && (
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button aria-label="‹" className="dtPagerBtn" disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))} style={btn(page === 0)}>‹</button>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{page + 1} / {max}</span>
          <button aria-label="›" className="dtPagerBtn" disabled={page >= max - 1} onClick={() => onPage(Math.min(max - 1, page + 1))} style={btn(page >= max - 1)}>›</button>
        </span>
      )}
    </div>
  )
}

export type Col<T> = {
  key: string
  label: React.ReactNode
  render?: (r: T) => React.ReactNode
  sort?: (r: T) => string | number | null   // 提供才可排序
  nowrap?: boolean
  thTip?: string                            // 表头 hover 提示(如「技能类获批」口径)
  // 下面两个是 2026-08-11「全站表格并成一套」时补的通用能力 —— 原先五张裸 <table> 各自实现:
  width?: string                            // 显式列宽(百分比):给了就不进自动量宽锁列(抽选表这类固定版式)
  className?: string                        // 列级 class:窄屏藏列等交给 main.css(漏斗表 .fnCol)
  align?: 'left' | 'right'                  // 数字列右对齐(漏斗/抽选表);缺省左
}

export function Table<T>({ cols, rows, rowKey, empty, header, minWidth, pageSize, footerNote, foot, bare }: {
  cols: Col<T>[]; rows: T[]; rowKey: (r: T, i: number) => string; empty?: React.ReactNode
  header?: React.ReactNode                  // 卡内表格上方的头行(如 occupations 的通道标题行)
  minWidth?: number                         // 窄屏横滚而非挤成竖排(stats 第 2 轮 #10)
  pageSize?: number                         // 传了才分页:先全量排序再切页,页脚出总数+翻页
  footerNote?: React.ReactNode              // 页脚左侧总数文案(i18n 在调用方,组件不携词)
  foot?: React.ReactNode                    // 表体末尾的自定义行(<tr>,可 colSpan):漏斗表的「真实付费」尾行
  bare?: boolean                            // 表已经嵌在调用方的白卡里 → 不再套自己的卡壳(否则双层描边)
}) {
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
      m[c.key] = (el.offsetWidth / total * 100).toFixed(3) + '%'
    }
    setPct(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, sig])
  const sorted = (() => {
    if (!sort) return rows
    const col = cols.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    return [...rows].sort((a, b) => {
      const va = col.sort!(a), vb = col.sort!(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
    })
  })()
  const maxPage = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const p = Math.min(page, maxPage - 1)
  const paged = pageSize ? sorted.slice(p * pageSize, (p + 1) * pageSize) : sorted
  const startResize = (e: React.PointerEvent, key: string) => {
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sw = widths[key] ?? thRefs.current[key]?.offsetWidth ?? 100
    const move = (ev: PointerEvent) => setWidths((w) => ({ ...w, [key]: Math.max(60, sw + ev.clientX - sx) }))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const th: React.CSSProperties = { textAlign: 'left', padding: '9px 12px', fontSize: 12.5, color: UI.text2, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `1px solid ${UI.border}`, background: '#fafafa', position: 'relative' }
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#374151', borderBottom: `1px solid ${UI.hairline}` }
  return (
    <div style={bare ? { overflow: 'auto' } : { background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'auto' }}>
      {header}
      <table ref={tableRef} style={{ width: '100%', minWidth, borderCollapse: 'collapse', tableLayout: pct ? 'fixed' : 'auto' }}>
        <thead><tr>
          {cols.map((c, ci) => (
            <th key={c.key} ref={(el) => { thRefs.current[c.key] = el }} title={c.thTip} className={c.className}
              onClick={c.sort ? () => setSort((s) => (s?.key === c.key ? (s.dir === -1 ? { key: c.key, dir: 1 } : null) : { key: c.key, dir: -1 })) : undefined}
              style={{ ...th, width: widths[c.key] ?? pct?.[c.key] ?? c.width, cursor: c.sort ? 'pointer' : undefined, ...(c.align === 'right' ? { textAlign: 'right' } : {}), ...(ci < cols.length - 1 ? { borderRight: '1px solid #e5e7eb' } : {}), ...(c.thTip ? { textDecoration: 'underline dotted #d1d5db' } : {}) }}>
              {c.label}{sort?.key === c.key ? (sort.dir === -1 ? ' ▼' : ' ▲') : c.sort ? <span style={{ color: '#d1d5db' }}> ⇅</span> : null}
              <span onPointerDown={(e) => startResize(e, c.key)} onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize' }} />
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
                {cols.map((c, ci) => <td key={c.key} className={c.className} style={{ ...td, ...(c.align === 'right' ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } : {}), ...(ci < cols.length - 1 ? { borderRight: '1px solid #f3f4f6' } : {}), ...(c.nowrap ? { whiteSpace: 'nowrap' } : {}) }}>{c.render ? c.render(r) : String((r as any)[c.key] ?? '—')}</td>)}
              </tr>
            )
          })}
          {foot}
        </tbody>
      </table>
      {rows.length === 0 && <div style={{ padding: '24px 16px', color: UI.text3, fontSize: 13, textAlign: 'center' }}>{empty}</div>}
      {pageSize != null && rows.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${UI.hairline}` }}>
          <Pager page={p} max={maxPage} note={footerNote} onPage={setPage} />
        </div>
      )}
    </div>
  )
}
