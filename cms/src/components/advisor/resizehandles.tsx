'use client'
/**
 * 浮层的八向拉伸手柄(透明边条 + 角块;右下角的视觉提示三角是另一件,不吃事件)。
 * 顺序即渲染顺序:四条边在前、四个角在后 —— 角块要盖在边条上,不然角上只能拉一个方向。
 * 2026-08-28 换装批自 Advisor.tsx 的 PANEL_EDGES 渲染段提出成件
 * (八组边距与光标从内联迁进 .edgeN … .edgeSe)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { PANEL_DIRS } from './constants'
import { edgeClsOf } from './functions'
import type { ResizeHandlesIn } from './types'

/**
 * 渲染八向拉伸手柄。
 *
 * @param props 按方向要手柄的工厂。
 * @returns 八块透明手柄。
 */
export function ResizeHandles({ onEdgeDown }: ResizeHandlesIn) {
  const out = []
  for (const dir of PANEL_DIRS) {
    out.push(<div key={dir} onPointerDown={onEdgeDown(dir)} className={edgeClsOf(dir)} />)
  }
  return <>{out}</>
}
