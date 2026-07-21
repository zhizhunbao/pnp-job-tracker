'use client'
// #65 前端 primitives 库(2026-07-18 Frank 拍板:颜色四模块分配 OK/页头浅色带/header 合一)。
// 原则:现有色收口不发明新色;一处定义全站换装;零新依赖。新增按钮/chip/标签/页头一律从这拿,不许散装内联。
// 设计总表见 docs/assets/mockups/65-primitives库设计总表.html;banner 图版规范见 mockups/模块banner-设计总表.html。
import { useEffect, useState } from 'react'

// ── tokens ──────────────────────────────────────────────────
export const UI = {
  primary: '#2563eb', primaryDeep: '#1e40af',
  danger: '#dc2626', warn: '#b45309', ok: '#15803d',
  text: '#111827', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', hairline: '#f3f4f6', bg: '#f9fafb', card: '#fff',
} as const

// ── Button(主/付费/次/AI/文字/危险 × 小/常规/大;a 或 button 由 href 决定)──
// 按钮统一 P1(2026-07-19 Frank「所有能点的按钮都要统一设计」):新增 pro(⭐付费入口)/ai(AI 功能靛蓝)/lg 档/style 透传。
// 颜色语义:蓝=普通行动 · 棕=付费 · 靛=AI 功能 · 红=危险 · 灰字=弱操作(ghost + color 覆盖)。
const BTN_KIND: Record<string, React.CSSProperties> = {
  primary: { background: UI.primary, color: '#fff', border: 'none' },
  pro: { background: UI.warn, color: '#fff', border: 'none', fontWeight: 700 },
  secondary: { background: '#fff', color: UI.primary, border: `1px solid ${UI.border}` },
  ai: { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' },
  ghost: { background: 'none', color: UI.primary, border: 'none', padding: 0 },
  danger: { background: UI.danger, color: '#fff', border: 'none' },
}
export function Button({ kind = 'primary', sm, lg, disabled, onClick, href, target, title, style: styleOverride, children }: {
  kind?: 'primary' | 'pro' | 'secondary' | 'ai' | 'ghost' | 'danger'; sm?: boolean; lg?: boolean; disabled?: boolean
  onClick?: () => void; href?: string; target?: string; title?: string; style?: React.CSSProperties; children: React.ReactNode
}) {
  const style: React.CSSProperties = {
    fontSize: sm ? 12.5 : lg ? 14 : 13, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
    ...(kind !== 'ghost' && { borderRadius: 8, padding: sm ? '4px 12px' : lg ? '11px 20px' : '7px 16px' }),
    ...BTN_KIND[kind],
    ...(disabled && kind === 'primary' && { background: '#93c5fd' }),
    ...styleOverride,
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

// ── Notice(F 提醒/通知统一,#114 E-I 批):四色四用禁新配色——warn 升级/额度(琥珀)、
// err 错误(红,说人话+给出路)、info 口径/注记(蓝)、ok 成功(绿);圆角 10 · padding 10×14 · 13px,
// 图标+粗体引导语(lead,可省)+正文+右侧钮槽(action,可省)。散装提醒框一律换用本组件。──
const NOTICE_KIND: Record<string, { bg: string; bd: string; fg: string; icon: string }> = {
  warn: { bg: '#fffbeb', bd: '#fde68a', fg: '#78350f', icon: '⭐' },
  err: { bg: '#fef2f2', bd: '#fecaca', fg: '#b91c1c', icon: '✕' },
  info: { bg: '#eff6ff', bd: '#bfdbfe', fg: '#1e40af', icon: 'ⓘ' },
  ok: { bg: '#ecfdf5', bd: '#a7f3d0', fg: '#047857', icon: '✓' },
}
export function Notice({ kind = 'info', lead, action, style, children }: {
  kind?: keyof typeof NOTICE_KIND; lead?: React.ReactNode; action?: React.ReactNode
  style?: React.CSSProperties; children?: React.ReactNode
}) {
  const k = NOTICE_KIND[kind]
  return (
    <div style={{ background: k.bg, border: `1px solid ${k.bd}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: k.fg, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, ...style }}>
      <span style={{ flex: 1, minWidth: 160 }}>
        <span style={{ marginRight: 6 }}>{k.icon}</span>
        {lead != null && <b style={{ marginRight: 6 }}>{lead}</b>}
        {children}
      </span>
      {action}
    </div>
  )
}

// ── 卡片积木(E8-08 #121,2026-07-20 Frank「按逻辑拆」拍板):纯样式原子零逻辑——
// 手机卡片=每域自己的组件用这三块拼(组合复用样式,不合并逻辑);解剖/hover 规范见 implementation/E8-08。
// ①Card 卡壳(白卡描边 r12,右上操作位走 position:absolute 自摆)②CardKV 键值区(两列 grid,wide 独占行)③CardAction 操作行。
export function Card({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return <div style={{ border: `1px solid ${UI.border}`, borderRadius: 12, background: UI.card, padding: '10px 12px', marginBottom: 8, position: 'relative', ...style }}>{children}</div>
}
export function CardKV({ items }: { items: { k: React.ReactNode; v: React.ReactNode; wide?: boolean }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px', marginTop: 6 }}>
      {items.map((it, i) => (
        <div key={i} style={it.wide ? { gridColumn: '1 / -1' } : undefined}>
          <div style={{ fontSize: 11.5, color: UI.text3 }}>{it.k}</div>
          <div style={{ fontSize: 13, color: '#374151' }}>{it.v}</div>
        </div>
      ))}
    </div>
  )
}
export function CardAction({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 6, fontSize: 12.5 }}>{children}</div>
}

// ── PageBanner(#66 模块统一页头 → banner 图版,2026-07-19 Frank「按这个做」批设计总表)──
// 两形态一组件:images 传了=实景图 banner(恒 150px/手机 110px 定框,cover 裁剪;背景 crossfade 8s
// B类氛围轮播——前景信息恒定,区别于 news 头条的 A类内容轮播;右下小圆点,hover 暂停,
// prefers-reduced-motion 静止);不传/图挂=浅色渐变带(原形态即兜底,发布零风险)。
// 图=cms/public/img/banners/(Commons 实景,SOURCES.md 记出处,致谢挂 img title,画面无水印)。
const MODULE_STYLE: Record<string, { bg: string; fg: string; deep: string }> = {
  jobs: { bg: 'linear-gradient(100deg,#eff6ff,#dbeafe)', fg: '#1e40af', deep: '30,64,175' },
  pathways: { bg: 'linear-gradient(100deg,#f5f3ff,#ede9fe)', fg: '#5b21b6', deep: '91,33,182' },
  rank: { bg: 'linear-gradient(100deg,#fffbeb,#fef3c7)', fg: '#92400e', deep: '146,64,14' },
  stats: { bg: 'linear-gradient(100deg,#f0fdf4,#dcfce7)', fg: '#166534', deep: '22,101,52' },
  news: { bg: 'linear-gradient(100deg,#f0fdfa,#ccfbf1)', fg: '#0f766e', deep: '15,118,110' },
}
export function PageBanner({ module, icon, title, sub, right, images, stats }: {
  module: keyof typeof MODULE_STYLE; icon?: React.ReactNode; title: React.ReactNode
  sub?: React.ReactNode; right?: React.ReactNode; images?: string[]
  stats?: { v: React.ReactNode; label: React.ReactNode }[]   // 关键数字块(≤3,Frank:「显示关键信息但不能太多」;仅图版渲染,手机藏)
}) {
  const m = MODULE_STYLE[module]
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)
  const imgs = !dead && images && images.length ? images : null
  useEffect(() => {
    if (!imgs || imgs.length < 2 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIdx((i) => (i + 1) % imgs.length), 8000)
    return () => clearInterval(id)
  }, [imgs, imgs?.length, paused])
  if (!imgs) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', background: m.bg, color: m.fg, borderRadius: 12, padding: '16px 20px', margin: '0 0 14px' }}>
        <h1 style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</h1>
        {sub && <span style={{ fontSize: 12, opacity: 0.75 }}>{sub}</span>}
        {right && <span style={{ marginLeft: 'auto', fontSize: 13 }}>{right}</span>}
      </div>
    )
  }
  // 2026-07-19 Frank 批新槽位(mockups/二级导航与banner-提案):标题+副题左下,数字胶囊(数字+标签同行)
  // 右下,轮播圆点右上;高度 150→130——治「数字与标签断裂悬在标题旁」
  return (
    <div className="pbImgBanner" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      style={{ position: 'relative', height: 130, borderRadius: 12, overflow: 'hidden', margin: '0 0 14px' }}>
      <style>{`@media (max-width:640px){.pbImgBanner{height:104px !important}.pbStat{display:none !important}.pbProof{display:none !important}}`}</style>
      {imgs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" title="Wikimedia Commons" onError={() => setDead(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === idx % imgs.length ? 1 : 0, transition: 'opacity 1.2s ease' }} />
      ))}
      {/* 模块色暗化层(左浓右淡)压图保字;对比度红线 ≥4.5:1 */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(${m.deep},.82), rgba(${m.deep},.45) 55%, rgba(17,24,39,.25))` }} />
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, padding: '0 20px 13px', color: '#fff' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 6px rgba(0,0,0,.5)' }}>{icon}{title}</h1>
          {sub && <div style={{ fontSize: 12, opacity: 0.92, marginTop: 3, textShadow: '0 1px 4px rgba(0,0,0,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {stats?.slice(0, 3).map((s, i) => (
            <span key={i} className="pbStat" style={{ background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
              <b style={{ fontSize: 14, marginRight: 4 }}>{s.v}</b>{s.label}
            </span>
          ))}
          {right && <span style={{ background: 'rgba(255,255,255,.92)', borderRadius: 8, padding: '6px 13px', fontSize: 13, whiteSpace: 'nowrap' }}>{right}</span>}
        </div>
      </div>
      {imgs.length > 1 && (
        <span style={{ position: 'absolute', right: 14, top: 10, display: 'flex', gap: 5, zIndex: 2 }}>
          {imgs.map((s, i) => (
            <button key={s} aria-label={`bg ${i + 1}`} onClick={() => setIdx(i)}
              style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: i === idx % imgs.length ? '#fff' : 'rgba(255,255,255,.45)' }} />
          ))}
        </span>
      )}
    </div>
  )
}

// ── SectionTabs(模块二级 tab 条,2026-07-19 Frank 批「二级模块统一样式」)──
// 用在模块页 banner 正下方(如 移民动态:最新公告|时间线);圆角上沿,当前页高亮模块色。
export function SectionTabs({ tabs, color = UI.primary }: {
  tabs: { href: string; label: React.ReactNode; active?: boolean }[]; color?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 6, margin: '-6px 0 14px', borderBottom: `2px solid ${color}22` }}>
      {tabs.map((tb) => (
        <a key={tb.href} href={tb.active ? undefined : tb.href}
          style={{
            fontSize: 12.5, padding: '5px 14px', borderRadius: '9px 9px 0 0', textDecoration: 'none',
            border: '1px solid', borderBottom: 'none',
            ...(tb.active
              ? { background: '#fff', color, fontWeight: 700, borderColor: `${color}55` }
              : { background: UI.bg, color: UI.text2, borderColor: UI.border, cursor: 'pointer' }),
          }}>{tb.label}</a>
      ))}
    </div>
  )
}
// 模块 → banner 图组(1280×300 已裁,SOURCES.md 在同目录);调用点传 BANNER_IMGS.jobs 即开图版
export const BANNER_IMGS: Record<string, string[]> = {
  jobs: ['/img/banners/jobs-1.jpg', '/img/banners/jobs-2.jpg', '/img/banners/jobs-3.jpg'],
  pathways: ['/img/banners/pathways-1.jpg', '/img/banners/pathways-2.jpg', '/img/banners/pathways-3.jpg'],
  rank: ['/img/banners/rank-1.jpg', '/img/banners/rank-2.jpg', '/img/banners/rank-3.jpg'],
  stats: ['/img/banners/stats-1.jpg', '/img/banners/stats-2.jpg', '/img/banners/stats-3.jpg'],
}

// ── PageShell(全站统一正文轨:1320 与 SiteHeader 头轨同宽——Frank 2026-07-18「每个页面的宽度应该
//    是一样的,新的页面按这个宽度套壳」;新页面一律用它,存量页迁移随 #65 余批)────────────
export function PageShell({ pad = '4px 1.25rem 32px', children }: { pad?: string; children: React.ReactNode }) {
  return <div style={{ maxWidth: 1320, margin: '0 auto', padding: pad, width: '100%', boxSizing: 'border-box' }}>{children}</div>
}

// ── SectionTitle(二级标题:文字+右延细线;右槽可挂「更多 →」)──────
export function SectionTitle({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15.5, fontWeight: 700, color: UI.text, margin: '18px 0 8px' }}>
      {children}{right}<span style={{ flex: 1, height: 1, background: UI.border }} />
    </div>
  )
}
