'use client'
/**
 * quiz 域的结构:答题进度条(2026-08-03 #253)。选工作是决定线第 1 步,也算一项 ——
 * 从第一屏到最后一题同一套数,不让用户在两套计数之间对不上。
 * 2026-08-28 换装批自 QuizUI.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { barStyleOf, progressTextOf } from './functions'
import type { QuizProgressIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染进度条与它下面那一行计数。
 *
 * @param props 界面语言与两个计数。
 * @returns 进度块。
 */
export function QuizProgress({ lang, done, total }: QuizProgressIn) {
  return (
    <div className={css.progress}>
      <div className={css.progressTrack}>
        {/* eslint-disable-next-line react/forbid-dom-props -- 运行时数据:已填比例逐题变,类是有限枚举装不下 */}
        <div className={css.progressFill} style={barStyleOf({ done, total })} />
      </div>
      <div className={css.progressNote}>{progressTextOf({ lang, done, total })}</div>
    </div>
  )
}
