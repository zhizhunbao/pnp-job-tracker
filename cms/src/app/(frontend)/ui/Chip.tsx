'use client'
// Chip(筛选,可点):默认 / 选中 / 强调红。
// chipStyle 单独导出是因为有调用方要把它摊进自己的 style(整行筛选带),不只用组件形态。
import { UI } from './tokens'

export function chipStyle(active: boolean, hot = false): React.CSSProperties {
  return {
    border: '1px solid ' + (active ? UI.primary : hot ? '#fecaca' : UI.border),
    background: active ? UI.primary : '#fff',
    color: active ? '#fff' : hot ? '#b91c1c' : UI.text2,
    fontWeight: active ? 600 : 400,
    borderRadius: 999, padding: '4px 12px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

export function Chip({ active = false, hot = false, onClick, title, children }: {
  active?: boolean; hot?: boolean; onClick?: () => void; title?: string; children: React.ReactNode
}) {
  return <button style={chipStyle(active, hot)} onClick={onClick} title={title}>{children}</button>
}
