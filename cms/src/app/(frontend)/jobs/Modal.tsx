'use client'
// 弹框统一壳(2026-07-05 用户拍板:全站弹框格式布局一致,遮罩不带毛玻璃)。
// 规范:遮罩 rgba(17,24,39,.5) · 圆角 14 · 阴影/关闭钮/内边距统一 · 普通层 z=50、叠加层 z=60。
// 居中弹框直接用 <Modal>; 支持 header 拖拽移动 (draggable) 和 放大全屏/还原 (resizable)。
import { useEffect, useRef, useState } from 'react'

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
export const SCRIM: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(17,24,39,.5)' }
export const CARD: React.CSSProperties = { position: 'relative', background: '#fff', borderRadius: MODAL_RADIUS, boxShadow: MODAL_SHADOW, overscrollBehavior: 'contain' }

export const iconBtnS: React.CSSProperties = {
  border: 'none', background: '#f3f4f6', borderRadius: 8, width: 30, height: 30,
  fontSize: 16, color: '#6b7280', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const windowActionsS: React.CSSProperties = {
  position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, zIndex: 20,
}

const WIDTH = { sm: 390, md: 560, lg: 760 } as const

/** eyebrow 小字(可省)+ 17px 标题(右侧给关闭钮留位);颜色按场景传(顾问靛蓝/升级琥珀) */
export function ModalTitle({ eyebrow, color = '#6366f1', title }: { eyebrow?: React.ReactNode; color?: string; title: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0, paddingRight: 80 }}>
      {eyebrow ? <div style={{ fontSize: 12, color, fontWeight: 600, letterSpacing: 0.3 }}>{eyebrow}</div> : null}
      <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
    </div>
  )
}

/**
 * 居中弹框壳: sm=390, md=560, lg=760。
 * 支持 header 按住拖拽移动 (draggable) 和 右上角全屏/还原按钮 (resizable)。
 */
export function Modal({ onClose, size = 'md', z = 50, pad = true, vh = 85, draggable = true, resizable = true, children }: {
  onClose: () => void; size?: 'sm' | 'md' | 'lg'; z?: number; pad?: boolean; vh?: number; draggable?: boolean; resizable?: boolean; children: React.ReactNode
}) {
  const ov = useOverlayClose(onClose)
  const narrow = useIsNarrow()
  const [maximized, setMaximized] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable || narrow || maximized) return
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a, label, .occPill, .occSelectedChip')) return
    draggingRef.current = true
    startPosRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    setPos({ x: startPosRef.current.posX + dx, y: startPosRef.current.posY + dy })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      draggingRef.current = false
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    }
  }

  const cardStyle: React.CSSProperties = narrow
    ? (size === 'sm'
      ? { ...CARD, width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: pad ? '20px 16px 16px' : 0 }
      : { ...CARD, borderRadius: 0, width: '100%', height: '100%', maxHeight: '100vh', overflowY: 'auto', padding: pad ? '20px 14px 16px' : 0 })
    : maximized
      ? { ...CARD, width: '96vw', height: '94vh', maxHeight: '94vh', overflowY: 'auto', padding: pad ? '24px 24px 20px' : 0, transform: 'none', transition: 'width .2s, height .2s' }
      : {
        ...CARD,
        width: `min(${WIDTH[size]}px, 100%)`,
        maxHeight: `${vh}vh`,
        overflowY: 'auto',
        padding: pad ? '24px 24px 20px' : 0,
        transform: pos.x !== 0 || pos.y !== 0 ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : undefined,
        transition: draggingRef.current ? 'none' : 'transform .1s ease-out',
      }

  return (
    <div {...ov} style={{ ...SCRIM, zIndex: z, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: narrow ? (size === 'sm' ? 14 : 0) : 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ ...cardStyle, cursor: draggable && !narrow && !maximized ? 'grab' : 'default' }}>
        <div style={windowActionsS} onClick={(e) => e.stopPropagation()}>
          {resizable && !narrow && (
            <button onClick={() => { setMaximized(!maximized); setPos({ x: 0, y: 0 }) }}
              aria-label={maximized ? '还原' : '全屏展开'}
              title={maximized ? '还原尺寸' : '全屏展开'}
              style={iconBtnS}>
              {maximized ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              )}
            </button>
          )}
          <button onClick={onClose} aria-label="close" style={iconBtnS}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
