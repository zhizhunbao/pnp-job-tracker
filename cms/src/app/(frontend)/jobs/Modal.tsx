'use client'
// 弹框统一壳(2026-07-05 用户拍板:全站弹框格式布局一致,遮罩不带毛玻璃)。
// 规范:遮罩 rgba(17,24,39,.5) · 圆角 14 · 阴影/关闭钮/内边距统一 · 普通层 z=50、叠加层 z=60。
// 居中弹框直接用 <Modal>;顾问弹框(拖拽/全屏)自绘面板,但必须复用这里的 token(SCRIM/CARD/iconBtnS/ModalTitle)。
import { useEffect, useState } from 'react'

import { useOverlayClose } from './overlay'

// 窄屏判定(E8-03,单一来源):≤640px 弹窗一律全屏。弹窗都是水合后才开,惰性初值直接读 matchMedia 无水合差异。
export function useIsNarrow(bp = 640): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${bp}px)`).matches)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [bp])
  return narrow
}

export const MODAL_RADIUS = 14
export const MODAL_SHADOW = '0 24px 60px rgba(0,0,0,.3)'
// 纯遮罩(不含居中布局):顾问弹框的自由定位面板也铺这层
export const SCRIM: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)' }
export const CARD: React.CSSProperties = { position: 'relative', background: '#fff', borderRadius: MODAL_RADIUS, boxShadow: MODAL_SHADOW }
// 头部图标钮(关闭/全屏):统一 30×30
export const iconBtnS: React.CSSProperties = {
  border: 'none', background: '#f3f4f6', borderRadius: 8, width: 30, height: 30,
  fontSize: 16, color: '#6b7280', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
}
const closeBtnS: React.CSSProperties = { ...iconBtnS, position: 'absolute', top: 12, right: 12 }
const WIDTH = { sm: 390, md: 560, lg: 720 } as const

/** eyebrow 小字 + 17px 标题(右侧给关闭钮留位);颜色按场景传(顾问靛蓝/升级琥珀) */
export function ModalTitle({ eyebrow, color = '#6366f1', title }: { eyebrow: React.ReactNode; color?: string; title: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0, paddingRight: 44 }}>
      <div style={{ fontSize: 12, color, fontWeight: 600, letterSpacing: 0.3 }}>{eyebrow}</div>
      <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
    </div>
  )
}

/**
 * 居中弹框壳:sm=390(登录/升级) md=560(公司/JD) lg=720(定价对照/榜单类)。
 * pad=true 整卡 24px 内边距(表单类);pad=false 内容区自管(头/体分区类,约定头 '16px 20px 8px' 体 '4px 20px 20px')。
 */
export function Modal({ onClose, size = 'md', z = 50, pad = true, vh = 85, children }: {
  onClose: () => void; size?: 'sm' | 'md' | 'lg'; z?: number; pad?: boolean; vh?: number; children: React.ReactNode
}) {
  const ov = useOverlayClose(onClose)
  const narrow = useIsNarrow()  // 窄屏(≤640px)→ 全屏卡:占满视口、圆角 0、内边距收窄(E8-03)
  useEffect(() => {  // ESC 关闭(统一壳新增的一致行为;老弹框只支持点外面)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div {...ov} style={{ ...SCRIM, zIndex: z, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: narrow ? (size === 'sm' ? 14 : 0) : 16 }}>
      {/* E8-03 微调(第 2 轮 #9):sm 档(登录/升级等短内容)窄屏不再撑满全屏——内容只占顶部时下方大片空白;改自适应高度居中卡。md/lg 内容长,维持全屏。 */}
      <div onClick={(e) => e.stopPropagation()}
        style={narrow
          ? (size === 'sm'
            ? { ...CARD, width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: pad ? '20px 16px 16px' : 0 }
            : { ...CARD, borderRadius: 0, width: '100%', height: '100%', maxHeight: '100vh', overflowY: 'auto', padding: pad ? '20px 14px 16px' : 0 })
          : { ...CARD, width: `min(${WIDTH[size]}px, 100%)`, maxHeight: `${vh}vh`, overflowY: 'auto', padding: pad ? '24px 24px 20px' : 0 }}>
        <button onClick={onClose} aria-label="close" style={closeBtnS}>×</button>
        {children}
      </div>
    </div>
  )
}
