'use client'
/**
 * quiz 域的结构:一道单选题的一张选项卡片。选项用**原生 radio**:同名 radio 的方向键
 * 切换、Tab 焦点、读屏播报全是浏览器自带的,自绘控件反而要一条条补回来
 * (可访问性是 CLAUDE.md 里不上砧板的四样之一)。整块卡片就是一个点击目标
 * (2026-07-31 Frank「点一下还不行,要点好几下」)。
 * 2026-08-28 换装批自 QuizUI.tsx 的 QuizChoices 循环体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_BADGE, CLS_TEXT, INPUT_RADIO } from './constants'
import { itemClsOf, pickL } from './functions'
import type { QuizChoiceRowIn } from './types'

/**
 * 渲染一个单选选项。
 *
 * @param props 同组名、选中态、字母徽标、选项文字、界面语言与选中落格。
 * @returns 一张选项卡片。
 */
export function QuizChoiceRow({ name, on, alpha, text, lang, onPick }: QuizChoiceRowIn) {
  return (
    <label className={itemClsOf({ on })}>
      <input type={INPUT_RADIO} name={name} checked={on} onChange={onPick} />
      <span className={CLS_BADGE} aria-hidden>{alpha}</span>
      <span className={CLS_TEXT}>{pickL(text, lang)}</span>
    </label>
  )
}
