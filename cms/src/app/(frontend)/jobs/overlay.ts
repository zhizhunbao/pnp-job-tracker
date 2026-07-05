'use client'
// 弹框 overlay 关闭手势:框内按下、框外松开(如滑动选中文本)时浏览器把 click 派发到 overlay,
// 会误关弹框 —— 只有「按下与松开都落在 overlay 本身」才算点外面关闭。所有 overlay 弹框共用。
import { useRef } from 'react'

export function useOverlayClose(onClose: () => void) {
  const downOnOverlay = useRef(false)
  return {
    onMouseDown: (e: React.MouseEvent) => { downOnOverlay.current = e.target === e.currentTarget },
    onClick: (e: React.MouseEvent) => { if (downOnOverlay.current && e.target === e.currentTarget) onClose() },
  }
}
