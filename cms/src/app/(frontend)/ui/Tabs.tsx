'use client'
// 通用选项卡(2026-08-12 Frank:「还是需要一个通用的选项卡组件,不能用按钮代替」)。
//
// **不是一排按钮**:按钮是「点了发生一件事」,选项卡是「同一块内容的多个面,当前在哪一面」——
// 语义、键盘行为、无障碍角色都不一样。这里给的是真选项卡:
//   · role=tablist / role=tab / aria-selected / aria-controls,读屏能报「第 2 项,共 4 项」
//   · 键盘 ← → Home End 切换(WAI-ARIA tabs 模式),Tab 键只落在当前选中项上
//   · 下划线态而非胶囊态 —— 与全站既有的胶囊(筛选、状态标)区分开,不让人误以为是筛选钮
//   · 窄屏横向可滚动,**永不换行**(换行的选项卡会把下面的内容顶得跳来跳去)
import { useRef } from 'react'

import { UI } from './colors'

export type TabItem = {
  key: string
  label: string
  /** 右上角小字(条数之类);没有就不出 */
  badge?: string | number
}

export function Tabs({ items, value, onChange, ariaLabel, idPrefix = 'tab' }: {
  items: TabItem[]
  value: string
  onChange: (key: string) => void
  ariaLabel: string
  /** 与面板 id 对应(aria-controls);同页多组选项卡时各给各的前缀 */
  idPrefix?: string
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const move = (dir: 1 | -1 | 'home' | 'end') => {
    const i = items.findIndex((x) => x.key === value)
    const next = dir === 'home' ? 0
      : dir === 'end' ? items.length - 1
      : (i + dir + items.length) % items.length
    const k = items[next]?.key
    if (!k) return
    onChange(k)
    refs.current[k]?.focus()
  }

  return (
    <div role="tablist" aria-label={ariaLabel} style={{
      display: 'flex', gap: 20, borderBottom: '1px solid #e5e7eb',
      overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none',
    }}>
      {items.map((it) => {
        const on = it.key === value
        return (
          <button
            key={it.key}
            ref={(el) => { refs.current[it.key] = el }}
            role="tab"
            id={`${idPrefix}-${it.key}`}
            aria-selected={on}
            aria-controls={`${idPrefix}-panel-${it.key}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(it.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(1) }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
              else if (e.key === 'Home') { e.preventDefault(); move('home') }
              else if (e.key === 'End') { e.preventDefault(); move('end') }
            }}
            style={{
              flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '9px 0 8px', fontSize: 13.5, fontWeight: on ? 700 : 600,
              color: on ? '#111827' : '#6b7280',
              borderBottom: `2px solid ${on ? '#2563eb' : 'transparent'}`,
              marginBottom: -1, whiteSpace: 'nowrap',
            }}
          >
            {it.label}
            {it.badge != null && it.badge !== '' ? (
              <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 600, color: on ? '#2563eb' : '#9ca3af' }}>{it.badge}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** 与 Tabs 配套的面板壳:把 aria 对应关系钉死,消费端不必自己拼 id */
export function TabPanel({ tabKey, active, idPrefix = 'tab', children }: {
  tabKey: string
  active: boolean
  idPrefix?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-${tabKey}`}
      hidden={!active}
      // hidden 而不是不渲染:面板里挂着**答案存在组件本地 state** 的部件时,卸载一次答案就没了
      // (08-12 分值卡弹窗化那次的坑)。消费端按需决定要不要真卸载。
      style={active ? undefined : { display: 'none' }}
    >
      {children}
    </div>
  )
}

// ── SectionTabs(模块二级 tab 条,2026-07-19 Frank 批「二级模块统一样式」)──
// 用在模块页 banner 正下方(如 移民动态:最新公告|时间线);圆角上沿,当前页高亮模块色。
export function SectionTabs({ tabs, color = UI.primary }: {
  tabs: { href: string; label: React.ReactNode; active?: boolean }[]; color?: string
}) {
  return (
    <div className="uiTabs" style={{ display: 'flex', gap: 6, margin: '-6px 0 14px', borderBottom: `2px solid ${color}22` }}>
      {/* #205(第 26 轮体检):当前页签原来也是 <a> 只是不给 href —— 看着像链接点不动。当前页=span,别的才是链接 */}
      {tabs.map((tb) => {
        const Tag = (tb.active ? 'span' : 'a') as 'a'
        return (
        <Tag key={tb.href} href={tb.active ? undefined : tb.href} className={tb.active ? undefined : 'tapPad'}
          style={{
            fontSize: 12.5, padding: '5px 14px', borderRadius: '9px 9px 0 0', textDecoration: 'none',
            border: '1px solid', borderBottom: 'none',
            ...(tb.active
              ? { background: '#fff', color, fontWeight: 700, borderColor: `${color}55` }
              : { background: UI.bg, color: UI.text2, borderColor: UI.border, cursor: 'pointer' }),
          }}>{tb.label}</Tag>
        )
      })}
    </div>
  )
}
