'use client'
// #65 前端 primitives 库(2026-07-18 Frank 拍板:颜色四模块分配 OK/页头浅色带/header 合一)。
// 原则:现有色收口不发明新色;一处定义全站换装;零新依赖。新增按钮/chip/标签/页头一律从这拿,不许散装内联。
// 设计总表见 docs/assets/mockups/65-primitives库设计总表.html。

// ── tokens ──────────────────────────────────────────────────
export const UI = {
  primary: '#2563eb', primaryDeep: '#1e40af',
  danger: '#dc2626', warn: '#b45309', ok: '#15803d',
  text: '#111827', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', hairline: '#f3f4f6', bg: '#f9fafb', card: '#fff',
} as const

// ── Button(主/次/文字/危险 × 常规/小号;a 或 button 由 href 决定)──
const BTN_KIND: Record<string, React.CSSProperties> = {
  primary: { background: UI.primary, color: '#fff', border: 'none' },
  secondary: { background: '#fff', color: UI.primary, border: `1px solid ${UI.border}` },
  ghost: { background: 'none', color: UI.primary, border: 'none', padding: 0 },
  danger: { background: UI.danger, color: '#fff', border: 'none' },
}
export function Button({ kind = 'primary', sm, disabled, onClick, href, target, title, children }: {
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; sm?: boolean; disabled?: boolean
  onClick?: () => void; href?: string; target?: string; title?: string; children: React.ReactNode
}) {
  const style: React.CSSProperties = {
    ...BTN_KIND[kind],
    ...(kind !== 'ghost' && { borderRadius: 8, padding: sm ? '4px 12px' : '7px 16px' }),
    fontSize: sm ? 12.5 : 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
    ...(disabled && kind === 'primary' && { background: '#93c5fd' }),
  }
  if (href && !disabled) return <a href={href} target={target} rel={target ? 'noreferrer' : undefined} title={title} style={style}>{children}</a>
  return <button disabled={disabled} onClick={onClick} title={title} style={style}>{children}</button>
}

// ── Chip(筛选,可点):默认/选中/强调红 ─────────────────────────
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

// ── Tag(状态,不可点):省/联邦/重要/关注/通过/Pro ───────────────
const TAG_VARIANT: Record<string, React.CSSProperties> = {
  region: { background: '#eef2ff', color: '#3730a3' },
  federal: { background: '#fee2e2', color: '#b91c1c' },
  imp: { background: UI.danger, color: '#fff', fontWeight: 700 },
  warn: { background: '#fef3c7', color: UI.warn, fontWeight: 700 },
  ok: { background: '#dcfce7', color: UI.ok },
  pro: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
}
export function Tag({ variant = 'region', title, children }: { variant?: keyof typeof TAG_VARIANT; title?: string; children: React.ReactNode }) {
  return <span title={title} style={{ ...TAG_VARIANT[variant], borderRadius: 6, padding: '1px 7px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>
}

// ── PageBanner(#66:模块统一页头,浅色渐变带,一模块一强调色;禁图片背景——文字图教训)──
const MODULE_STYLE: Record<string, { bg: string; fg: string }> = {
  jobs: { bg: 'linear-gradient(100deg,#eff6ff,#dbeafe)', fg: '#1e40af' },
  pathways: { bg: 'linear-gradient(100deg,#f5f3ff,#ede9fe)', fg: '#5b21b6' },
  rank: { bg: 'linear-gradient(100deg,#fffbeb,#fef3c7)', fg: '#92400e' },
  stats: { bg: 'linear-gradient(100deg,#f0fdf4,#dcfce7)', fg: '#166534' },
  news: { bg: 'linear-gradient(100deg,#f0fdfa,#ccfbf1)', fg: '#0f766e' },
}
export function PageBanner({ module, icon, title, sub }: { module: keyof typeof MODULE_STYLE; icon?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode }) {
  const m = MODULE_STYLE[module]
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', background: m.bg, color: m.fg, borderRadius: 12, padding: '16px 20px', margin: '0 0 14px' }}>
      <h1 style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</h1>
      {sub && <span style={{ fontSize: 12, opacity: 0.75 }}>{sub}</span>}
    </div>
  )
}

// ── SectionTitle(二级标题:文字+右延细线;右槽可挂「更多 →」)──────
export function SectionTitle({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15.5, fontWeight: 700, color: UI.text, margin: '18px 0 8px' }}>
      {children}{right}<span style={{ flex: 1, height: 1, background: UI.border }} />
    </div>
  )
}
