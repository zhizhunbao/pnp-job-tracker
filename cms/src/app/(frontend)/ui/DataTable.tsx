'use client'
// 公共 DataTable(组件统一 P2 头件,2026-07-19 Frank:「所有页面都用同一个 table 组件」)——
// 简单表统一壳:jobs 主表同款观感(表头可排序 ↑↓ 态、拖列宽、行 hover、白卡圆角描边容器);
// jobs 主表是独立重器(服务端排序/冻结列/字段面板)不并入,只对齐视觉 token(G 节拍板)。
// 排序=客户端(简单表数据已全量在手);列用配置声明,render 缺省取 r[key]。
import { useRef, useState } from 'react'
import { UI } from './primitives'

export type DTCol<T> = {
  key: string
  label: React.ReactNode
  render?: (r: T) => React.ReactNode
  sort?: (r: T) => string | number | null   // 提供才可排序
  nowrap?: boolean
  thTip?: string                            // 表头 hover 提示(如「技能类获批」口径)
}

export function DataTable<T>({ cols, rows, rowKey, empty, header, minWidth }: {
  cols: DTCol<T>[]; rows: T[]; rowKey: (r: T, i: number) => string; empty?: React.ReactNode
  header?: React.ReactNode                  // 卡内表格上方的头行(如 occupations 的通道标题行)
  minWidth?: number                         // 窄屏横滚而非挤成竖排(stats 第 2 轮 #10)
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [hover, setHover] = useState('')
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({})
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
    <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, overflow: 'auto' }}>
      {header}
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse' }}>
        <thead><tr>
          {cols.map((c) => (
            <th key={c.key} ref={(el) => { thRefs.current[c.key] = el }} title={c.thTip}
              onClick={c.sort ? () => setSort((s) => (s?.key === c.key ? (s.dir === -1 ? { key: c.key, dir: 1 } : null) : { key: c.key, dir: -1 })) : undefined}
              style={{ ...th, width: widths[c.key], cursor: c.sort ? 'pointer' : undefined, ...(c.thTip ? { textDecoration: 'underline dotted #d1d5db' } : {}) }}>
              {c.label}{sort?.key === c.key ? (sort.dir === -1 ? ' ▼' : ' ▲') : c.sort ? <span style={{ color: '#d1d5db' }}> ⇅</span> : null}
              <span onPointerDown={(e) => startResize(e, c.key)} onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize' }} />
            </th>
          ))}
        </tr></thead>
        <tbody>
          {sorted.map((r, i) => {
            const k = rowKey(r, i)
            return (
              <tr key={k} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover('')} style={{ background: hover === k ? '#f9fafb' : undefined }}>
                {cols.map((c) => <td key={c.key} style={{ ...td, ...(c.nowrap ? { whiteSpace: 'nowrap' } : {}) }}>{c.render ? c.render(r) : String((r as any)[c.key] ?? '—')}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && <div style={{ padding: '24px 16px', color: UI.text3, fontSize: 13, textAlign: 'center' }}>{empty}</div>}
    </div>
  )
}
