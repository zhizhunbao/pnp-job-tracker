'use client'
/**
 * quiz 域的结构:一道多选题的一张选项卡片。与单选题**同一张卡片**,只把 radio 换成
 * checkbox、字母徽标换成对勾。整块卡片就是一个点击目标(2026-07-31 Frank「点一下还不行,
 * 要点好几下」):内边距在 label 上,点卡片任何一处 checkbox 都收得到。
 * 2026-08-28 换装批自 QuizUI.tsx 的 QuizChecks 循环体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_BADGE, CLS_PTS, CLS_TEXT, INPUT_CHECKBOX, MARK_CHECK, TEXT_NONE } from './constants'
import { itemClsOf, makeCheckToggle, ptsTextOf } from './functions'
import type { QuizCheckRowIn } from './types'

/**
 * 渲染一条多选条目。
 *
 * @param props 这一条的文字、分值、勾选态与落格。
 * @returns 一张选项卡片。
 */
export function QuizCheckRow({ text, pts, on, toggle }: QuizCheckRowIn) {
  let mark = TEXT_NONE
  if (on) {
    mark = MARK_CHECK
  }
  return (
    <label className={itemClsOf({ on })}>
      <input type={INPUT_CHECKBOX} checked={on} onChange={makeCheckToggle({ toggle })} />
      <span className={CLS_BADGE} aria-hidden>{mark}</span>
      <span className={CLS_TEXT}>{text}</span>
      {pts != null && <span className={CLS_PTS}>{ptsTextOf({ pts })}</span>}
    </label>
  )
}
