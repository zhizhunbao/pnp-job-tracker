'use client'
/**
 * modal 域的状态机器:窄屏判定与 overlay 关闭手势(hooks 抽屉 —— 调用位置被 React
 * 规则定死的单独一格,这个域有几台机器一眼数得清)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useEffect, useRef, useState } from 'react'
import { NARROW_BP } from './constants'
import type { OverlayHandlers } from './types'

/**
 * 窄屏判定(E8-03,单一来源):≤640px 弹窗一律全屏。
 * 弹窗都是水合后才开,惰性初值直接读 matchMedia 无水合差异。
 *
 * @param bp 断点像素(缺省走规范值)。
 * @returns 是否窄屏。
 */
export function useIsNarrow(bp = NARROW_BP): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${bp}px)`).matches)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
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
  return {
    onMouseDown: (e: React.MouseEvent) => { downOnOverlay.current = e.target === e.currentTarget },
    onClick: (e: React.MouseEvent) => { if (downOnOverlay.current && e.target === e.currentTarget) onClose() },
  }
}
