'use client'
/**
 * 全屏钮的两态图标:放大 / 还原(按 maximized 二选一;选择收在组件体内,
 * Modal 体内不留分支)。一个 tsx 一个组件(2026-08-24 Frank 拍板),从 modal.tsx 拆出;
 * 通用图标属 icons 域,这个是 modal 专用两态件所以留本域。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { MaxIconIn } from './types'

/**
 * 全屏钮图标。
 *
 * @param props 是否全屏态。
 * @returns 图标。
 */
export function MaxIcon({ maximized }: MaxIconIn) {
  if (maximized) {
    return (
      <svg width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
      </svg>
    )
  }
  return (
    <svg width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
  )
}
