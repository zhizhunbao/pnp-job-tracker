'use client'
/**
 * quiz 域的结构:一道题的题干。全站答题页共用同一件 —— 选工作页与四选一那几页
 * 渲染的是同一批 DOM 与同一段 CSS(Frank 2026-08-03「保证所有答题页面一致」),
 * 想不一致都不行。
 * 2026-08-28 换装批自 QuizUI.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_TITLE } from './constants'
import type { QuizTitleIn } from './types'

/**
 * 渲染题干。
 *
 * @param props 题干文字。
 * @returns 题干行。
 */
export function QuizTitle({ children }: QuizTitleIn) {
  return <div className={CLS_TITLE}>{children}</div>
}
