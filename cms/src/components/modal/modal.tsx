'use client'
/**
 * modal 域的结构与交互:居中弹框壳(三档宽 / Esc / 点遮罩关 / header 拖拽 / 全屏还原)
 * 与统一标题块。样式在 modal.module.css,机器在 hooks,死值在 constants。
 * (2026-07-05 用户拍板:全站弹框格式布局一致;2026-08-24 组件域刀 A 形制化。)
 *
 * style 白名单(同 table 域头注那条边界):zIndex、拖拽 transform 与过渡、
 * 按档宽 --mw 与高上限 --vh、eyebrow 场景色 —— 全是运行时数据/变量,不是静态样式。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useEffect, useRef, useState } from 'react'

import { useLang } from '@/components/i18n'
import { iconBtnS, WIDTH, Z_MODAL } from './constants'
import { useIsNarrow, useOverlayClose } from './hooks'
import type { ModalIn, ModalTitleIn } from './types'
import css from './modal.module.css'

/**
 * 弹框标题块:eyebrow 小字(可省)+ 17px 标题(右侧给关闭钮留位)。
 *
 * @param props eyebrow/场景色/标题。
 * @returns 标题块。
 */
export function ModalTitle({ eyebrow, color = '#6366f1', title }: ModalTitleIn) {
  return (
    <div className={css.titleWrap}>
      {eyebrow ? <div className={css.eyebrow} style={{ '--eyebrow-c': color } as React.CSSProperties}>{eyebrow}</div> : null}
      <h3 className={css.title}>{title}</h3>
    </div>
  )
}

/**
 * 居中弹框壳:sm=390, md=560, lg=760;支持 header 按住拖拽移动(draggable)
 * 与右上角全屏/还原(resizable)。
 *
 * @param props 关闭回调与形态开关。
 * @returns 弹框。
 */
export function Modal({ onClose, size = 'md', z = Z_MODAL, pad = true, vh = 85, draggable = true, resizable = true, actions, children }: ModalIn) {
  const ov = useOverlayClose(onClose)
  const [, , t] = useLang()   // #314:全屏钮的 title/aria-label 原是写死中文,英韩界面属性残留中文
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

  const cardCls = [css.card]
  if (narrow) {
    cardCls.push(size === 'sm' ? css.narrowSm : css.narrowFull)
  } else if (maximized) {
    cardCls.push(css.max)
  } else {
    cardCls.push(css.center)
    if (draggable) cardCls.push(css.grab)
  }
  if (!pad) cardCls.push(css.noPad)

  const dragging = pos.x !== 0 || pos.y !== 0
  const cardStyle: React.CSSProperties = narrow || maximized
    ? {}
    : {
      '--mw': `${WIDTH[size]}px`,
      '--vh': `${vh}vh`,
      transform: dragging ? `translate3d(${pos.x}px, ${pos.y}px, 0)` : undefined,
      transition: draggingRef.current ? 'none' : 'transform .1s ease-out',
    } as React.CSSProperties

  const scrimCls = [css.scrim]
  if (narrow) {
    scrimCls.push(size === 'sm' ? css.scrimNarrowSm : css.scrimNarrowFull)
  }

  return (
    <div {...ov} className={scrimCls.join(' ')} style={{ zIndex: z }}>
      <div onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cardCls.join(' ')}
        style={cardStyle}>
        <div className={css.acts} onClick={(e) => e.stopPropagation()}>
          {actions}
          {resizable && !narrow && (
            <button onClick={() => { setMaximized(!maximized); setPos({ x: 0, y: 0 }) }}
              aria-label={t(maximized ? 'cw.restore' : 'cw.max')}
              title={t(maximized ? 'cw.restore' : 'cw.max')}
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
