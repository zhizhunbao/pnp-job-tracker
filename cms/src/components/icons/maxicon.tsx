'use client'
/**
 * 全屏钮的两态图标:放大 / 还原(按 maximized 二选一;选择收在组件体内,
 * 消费方体内不留分支)。2026-08-24 自 modal 域迁入 icons 域(Frank「title.tsx 和
 * maxicon.tsx 也需要拆成域」)—— 手画 svg 两态件,与 icons.tsx 的 lucide 词汇表并排。
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
