'use client'
// 全站按钮的单一来源。新增按钮一律从这拿,不许散装内联(#65)。
// 按钮统一 P1(2026-07-19 Frank「所有能点的按钮都要统一设计」):pro(⭐付费入口)/ai(AI 功能靛蓝)/lg 档/style 透传。
// 颜色语义:蓝=普通行动,棕=付费,靛=AI 功能,红=危险,灰字=弱操作(ghost + color 覆盖)。
import { UI } from './tokens'

const BTN_KIND: Record<string, React.CSSProperties> = {
  primary: { background: UI.primary, color: '#fff', border: 'none' },
  pro: { background: UI.warn, color: '#fff', border: 'none', fontWeight: 700 },
  secondary: { background: '#fff', color: UI.primary, border: `1px solid ${UI.border}` },
  ai: { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' },
  ghost: { background: 'none', color: UI.primary, border: 'none', padding: 0 },
  danger: { background: UI.danger, color: '#fff', border: 'none' },
}

export function Button({ kind = 'primary', sm, lg, disabled, onClick, href, target, title, style: styleOverride, className, children }: {
  kind?: 'primary' | 'pro' | 'secondary' | 'ai' | 'ghost' | 'danger'; sm?: boolean; lg?: boolean; disabled?: boolean
  onClick?: () => void; href?: string; target?: string; title?: string; style?: React.CSSProperties; className?: string; children: React.ReactNode
}) {
  const style: React.CSSProperties = {
    fontSize: sm ? 12.5 : lg ? 14 : 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
    ...(kind !== 'ghost' && { borderRadius: 8, padding: sm ? '4px 12px' : lg ? '11px 20px' : '7px 16px' }),
    ...BTN_KIND[kind],
    ...(disabled && kind === 'primary' && { background: '#93c5fd' }),
    ...styleOverride,
  }
  if (href && !disabled) return <a href={href} target={target} rel={target ? 'noreferrer' : undefined} title={title} className={className} style={style}>{children}</a>
  return <button disabled={disabled} onClick={onClick} title={title} className={className} style={style}>{children}</button>
}

// 站内行内动作钮的唯一样式(职位板一路用下来的那枚药丸钮)。08-10 Frank 点名把把脉页的
// 「看在招岗 →」并过来 → 从 JobsTable 内的私有常量提到这里作单一来源,两边同 import。
export const PILL_BTN: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 999, padding: '5px 13px', fontSize: 12.5, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }
