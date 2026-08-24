'use client'
/**
 * modal 域的结构与交互:居中弹框壳(三档宽 / Esc / 点遮罩关 / header 拖拽 / 全屏还原)
 * 与统一标题块。样式在 modal.module.css,机器在 hooks,死值在 constants。
 * (2026-07-05 用户拍板:全站弹框格式布局一致;2026-08-24 组件域刀 A 形制化,
 * 同日 Frank「没重构干净」二筛:体内三目/箭头赋值/裸断言/行内注释清零。)
 *
 * style 白名单(同 table 域头注那条边界):zIndex、拖拽 transform 与过渡、
 * 按档宽 --mw 与高上限 --vh、eyebrow 场景色 —— 全是运行时数据/变量,不是静态样式。
 *
 * 决策记录:#314 全屏钮的 title/aria-label 原是写死中文,英韩界面属性残留中文 ——
 * 改经 useLang 取词(cw.restore/cw.max)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useEffect, useRef, useState } from 'react'

import { useLang } from '@/components/i18n'
import { EYEBROW_C_DEFAULT, WIDTH, Z_MODAL } from './constants'
import { elOf } from './functions'
import { useIsNarrow, useOverlayClose } from './hooks'
import type { ModalIn, ModalTitleIn } from './types'
import css from './modal.module.css'

/**
 * 弹框标题块:eyebrow 小字(可省)+ 17px 标题(右侧给关闭钮留位)。
 *
 * @param props eyebrow/场景色/标题。
 * @returns 标题块。
 */
export function ModalTitle({ eyebrow, color = EYEBROW_C_DEFAULT, title }: ModalTitleIn) {
  return (
    <div className={css.titleWrap}>
      {eyebrow ? <div className={css.eyebrow} style={{ '--eyebrow-c': color } as React.CSSProperties}>{eyebrow}</div> : null}
      <h3 className={css.title}>{title}</h3>
    </div>
  )
}

/**
 * 放大图标(全屏钮的两态之一;提成具名小件,JSX 里不放三目二选一)。
 *
 * @returns 图标。
 */
function MaxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
  )
}

/**
 * 还原图标(全屏钮的两态之一)。
 *
 * @returns 图标。
 */
function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
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
  const [, , t] = useLang()
  const narrow = useIsNarrow()
  const [maximized, setMaximized] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function onPointerDown(e: React.PointerEvent) {
    if (!draggable || narrow || maximized) {
      return
    }
    if (elOf(e.target).closest('button, input, select, textarea, a, label, .occPill, .occSelectedChip')) {
      return
    }
    draggingRef.current = true
    startPosRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
    elOf(e.target).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) {
      return
    }
    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    setPos({ x: startPosRef.current.posX + dx, y: startPosRef.current.posY + dy })
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!draggingRef.current) {
      return
    }
    draggingRef.current = false
    try {
      elOf(e.target).releasePointerCapture(e.pointerId)
    } catch {
      return
    }
  }

  function stopClick(e: React.MouseEvent) {
    e.stopPropagation()
  }

  function toggleMax() {
    setMaximized(!maximized)
    setPos({ x: 0, y: 0 })
  }

  const cardCls = [css.card]
  const scrimCls = [css.scrim]
  if (narrow) {
    if (size === 'sm') {
      cardCls.push(css.narrowSm)
      scrimCls.push(css.scrimNarrowSm)
    } else {
      cardCls.push(css.narrowFull)
      scrimCls.push(css.scrimNarrowFull)
    }
  } else if (maximized) {
    cardCls.push(css.max)
  } else {
    cardCls.push(css.center)
    if (draggable) {
      cardCls.push(css.grab)
    }
  }
  if (!pad) {
    cardCls.push(css.noPad)
  }

  let cardStyle: React.CSSProperties = {}
  if (!narrow && !maximized) {
    const moved = pos.x !== 0 || pos.y !== 0
    let transform: string | undefined
    if (moved) {
      transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
    }
    let transition = 'transform .1s ease-out'
    if (draggingRef.current) {
      transition = 'none'
    }
    cardStyle = {
      '--mw': `${WIDTH[size]}px`,
      '--vh': `${vh}vh`,
      transform,
      transition,
    } as React.CSSProperties
  }

  let maxLabel = t('cw.max')
  let maxIcon = <MaxIcon />
  if (maximized) {
    maxLabel = t('cw.restore')
    maxIcon = <RestoreIcon />
  }

  return (
    <div {...ov} className={scrimCls.join(' ')} style={{ zIndex: z }}>
      <div onClick={stopClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cardCls.join(' ')}
        style={cardStyle}>
        <div className={css.acts} onClick={stopClick}>
          {actions}
          {resizable && !narrow && (
            <button onClick={toggleMax} aria-label={maxLabel} title={maxLabel} className={css.iconBtn}>
              {maxIcon}
            </button>
          )}
          <button onClick={onClose} aria-label="close" className={css.iconBtn}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
