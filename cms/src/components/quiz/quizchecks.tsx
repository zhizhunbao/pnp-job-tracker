'use client'
/**
 * quiz 域的结构:一道多选题的选项组 —— 与单选题**同一张卡片**,只把 radio 换成
 * checkbox、字母徽标换成对勾。官方加分项(「符合以下哪些」)先前是一条一屏的是/否题:
 * BC 一个省就 7 屏,答完一遍要点二十几下。这些条目彼此独立、又同属一张官方表,
 * 合成一屏多选既少点二十几下,也更像官方表本来的样子。
 * 2026-08-28 换装批自 QuizUI.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { QuizCheckRow } from './quizcheckrow'
import { listCls } from './functions'
import type { QuizChecksIn } from './types'

/**
 * 渲染一道多选题的全部条目。
 *
 * @param props 全部条目。
 * @returns 选项组。
 */
export function QuizChecks({ items }: QuizChecksIn) {
  const rows = []
  for (const it of items) {
    rows.push(<QuizCheckRow key={it.key} text={it.text} pts={it.pts} on={it.on} toggle={it.toggle} />)
  }
  return <div className={listCls()}>{rows}</div>
}
