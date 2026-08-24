'use client'
/**
 * modal 域的状态机器:窄屏判定、overlay 关闭手势、Esc 关闭、header 拖拽
 * (hooks 抽屉 —— 调用位置被 React 规则定死的单独一格,这个域有几台机器一眼数得清)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useEffect, useRef, useState } from 'react'
import { DRAG_IGNORE_SEL, KEY_ESC, NARROW_BP } from './constants'
import { elOf } from './functions'
import type { CardIn, CardOut, DragPos, DragStart, OverlayHandlers } from './types'

/**
 * 窄屏判定(E8-03,单一来源):≤640px 弹窗一律全屏。
 * 弹窗都是水合后才开,惰性初值直接读 matchMedia 无水合差异。
 *
 * @param bp 断点像素(缺省走规范值)。
 * @returns 是否窄屏。
 */
export function useIsNarrow(bp = NARROW_BP): boolean {
  const [narrow, setNarrow] = useState(function init() {
    return typeof window !== 'undefined' && window.matchMedia(`(max-width: ${bp}px)`).matches
  })
  useEffect(function bind() {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    function onChange() {
      setNarrow(mq.matches)
    }
    mq.addEventListener('change', onChange)
    function off() {
      mq.removeEventListener('change', onChange)
    }
    return off
  }, [bp])
  return narrow
}

/**
 * 弹框 overlay 关闭手势:框内按下、框外松开(如滑动选中文本)时浏览器把 click 派发到
 * overlay,会误关弹框 —— 只有「按下与松开都落在 overlay 本身」才算点外面关闭。
 * 所有 overlay 弹框共用(2026-08-24 自 ui/overlay.ts 并入本抽屉)。
 *
 * @param onClose 关闭回调。
 * @returns 挂到 overlay 元素上的两枚手柄。
 */
export function useOverlayClose(onClose: () => void): OverlayHandlers {
  const downOnOverlay = useRef(false)
  function onMouseDown(e: React.MouseEvent) {
    downOnOverlay.current = e.target === e.currentTarget
  }
  function onClick(e: React.MouseEvent) {
    if (downOnOverlay.current && e.target === e.currentTarget) {
      onClose()
    }
  }
  return { onMouseDown, onClick }
}

/**
 * Esc 关闭:挂窗口级 keydown,卸载时摘除。
 *
 * @param onClose 关闭回调。
 * @returns 无。
 */
export function useEscClose(onClose: () => void) {
  useEffect(function bind() {
    function onKey(e: KeyboardEvent) {
      if (e.key === KEY_ESC) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    function off() {
      window.removeEventListener('keydown', onKey)
    }
    return off
  }, [onClose])
}

/**
 * 白卡形态整机:全屏态 + header 拖拽(一台机器 —— 全屏切换要复位位移、全屏中禁拖,
 * 拆两个 hook 会互相依赖成环)。按下起手(落在按钮/输入件/occ 药丸上豁免)→ 移动跟手
 * → 松手释放捕获。位移与全屏态是 state(要触发重渲),拖拽中与起手快照是 ref(不重渲)。
 *
 * @param x 外部形态(窄屏/开没开拖拽)。
 * @returns 机器面板(全屏态与切换、位移、是否在拖、三枚指针手柄)。
 */
export function useCard(x: CardIn): CardOut {
  const [maximized, setMaximized] = useState(false)
  const [pos, setPos] = useState<DragPos>({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const startRef = useRef<DragStart>({ x: 0, y: 0, posX: 0, posY: 0 })
  const dragEnabled = x.draggable === true && x.narrow === false && maximized === false

  function onPointerDown(e: React.PointerEvent) {
    if (dragEnabled === false) {
      return
    }
    if (elOf(e.target).closest(DRAG_IGNORE_SEL)) {
      return
    }
    draggingRef.current = true
    startRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
    elOf(e.target).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (draggingRef.current === false) {
      return
    }
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    setPos({ x: startRef.current.posX + dx, y: startRef.current.posY + dy })
  }

  function onPointerUp(e: React.PointerEvent) {
    if (draggingRef.current === false) {
      return
    }
    draggingRef.current = false
    try {
      elOf(e.target).releasePointerCapture(e.pointerId)
    } catch {
      return
    }
  }

  function dragging(): boolean {
    return draggingRef.current
  }

  function toggleMax() {
    setMaximized(maximized === false)
    setPos({ x: 0, y: 0 })
  }

  return { maximized, toggleMax, pos, dragging, onPointerDown, onPointerMove, onPointerUp }
}
