'use client'
// Notice(提醒 / 通知统一,#114 E-I 批):四色四用禁新配色 —— warn 升级/额度(琥珀)、
// err 错误(红,说人话+给出路)、info 口径/注记(蓝)、ok 成功(绿);圆角 10、padding 10×14、13px,
// 图标 + 粗体引导语(lead,可省)+ 正文 + 右侧钮槽(action,可省)。散装提醒框一律换用本组件。
const NOTICE_KIND: Record<string, { bg: string; bd: string; fg: string; icon: string }> = {
  warn: { bg: '#fffbeb', bd: '#fde68a', fg: '#78350f', icon: '⭐' },
  err: { bg: '#fef2f2', bd: '#fecaca', fg: '#b91c1c', icon: '✕' },
  info: { bg: '#eff6ff', bd: '#bfdbfe', fg: '#1e40af', icon: 'ⓘ' },
  ok: { bg: '#ecfdf5', bd: '#a7f3d0', fg: '#047857', icon: '✓' },
}

export function Notice({ kind = 'info', lead, action, style, className, children }: {
  kind?: keyof typeof NOTICE_KIND; lead?: React.ReactNode; action?: React.ReactNode
  style?: React.CSSProperties; className?: string; children?: React.ReactNode
}) {
  const k = NOTICE_KIND[kind]
  return (
    <div className={className} style={{ background: k.bg, border: `1px solid ${k.bd}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: k.fg, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, ...style }}>
      <span style={{ flex: 1, minWidth: 160 }}>
        <span style={{ marginRight: 6 }}>{k.icon}</span>
        {lead != null && <b style={{ marginRight: 6 }}>{lead}</b>}
        {children}
      </span>
      {action}
    </div>
  )
}
