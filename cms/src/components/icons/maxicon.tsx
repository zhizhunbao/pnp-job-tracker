'use client'
/**
 * 全屏钮的两态图标:放大 / 还原(按 maximized 二选一;选择收在组件体内,
 * 消费方体内不留分支)。2026-08-24 自 modal 域迁入 icons 域(Frank「title.tsx 和
 * maxicon.tsx 也需要拆成域」)—— 手画 svg 两态件,与 icons.tsx 的 lucide 词汇表并排。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import {
  MAXICON_ENTER_PATH, MAXICON_FILL, MAXICON_LINE_CAP, MAXICON_LINE_JOIN, MAXICON_RESTORE_PATH, MAXICON_SIZE_PX,
  MAXICON_STROKE, MAXICON_STROKE_WIDTH, MAXICON_VIEW_BOX,
} from './constants'
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
      <svg width={MAXICON_SIZE_PX}
        height={MAXICON_SIZE_PX}
        viewBox={MAXICON_VIEW_BOX}
        fill={MAXICON_FILL}
        stroke={MAXICON_STROKE}
        strokeWidth={MAXICON_STROKE_WIDTH}
        strokeLinecap={MAXICON_LINE_CAP}
        strokeLinejoin={MAXICON_LINE_JOIN}>
        <path d={MAXICON_RESTORE_PATH}/>
      </svg>
    )
  }
  return (
    <svg width={MAXICON_SIZE_PX}
      height={MAXICON_SIZE_PX}
      viewBox={MAXICON_VIEW_BOX}
      fill={MAXICON_FILL}
      stroke={MAXICON_STROKE}
      strokeWidth={MAXICON_STROKE_WIDTH}
      strokeLinecap={MAXICON_LINE_CAP}
      strokeLinejoin={MAXICON_LINE_JOIN}>
      <path d={MAXICON_ENTER_PATH}/>
    </svg>
  )
}
