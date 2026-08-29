'use client'
/**
 * quiz 域的结构:题干下的一句小注(可多选 / 其中含义…)。
 * 先前三个页面各写各的负 margin,间距各差 1-2px —— 收成一件之后只有一份值。
 * 2026-08-28 换装批自 QuizUI.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_SUB } from './constants'
import type { QuizSubIn } from './types'

/**
 * 渲染题干下的小注。
 *
 * @param props 小注文字。
 * @returns 小注行。
 */
export function QuizSub({ children }: QuizSubIn) {
  return <div className={CLS_SUB}>{children}</div>
}
