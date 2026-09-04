'use client'
/**
 * 域内小件:带关键词高亮的题面 —— 按考纲档给词上色(六级 / 雅思托福 / GRE 三档),
 * 悬停变色、点一下开字典弹层(Frank 2026-09-04「鼠标放上去先变颜色,然后点击才显示翻译」)(Frank 2026-09-04「关键单词应该高亮,多种颜色。鼠标放上去显示字典解析」)。
 * 选中任意词查词的老路照旧(弹层同一个)。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { TEXT_NONE } from './constants'
import { textPartsOf } from './functions'
import type { PteTextIn } from './types'
import css from './pte.module.css'

/**
 * 渲染高亮题面。
 *
 * @param props 题面、档表与悬停手柄。
 * @returns 题面。
 */
export function PteText({ text, tiers, onHoverWord, qid }: PteTextIn) {
  const parts = []
  let i = 0
  for (const p of textPartsOf({ text, tiers })) {
    if (p.word === TEXT_NONE) {
      parts.push(<span key={i}>{p.text}</span>)
    } else {
      parts.push(
        <mark key={i} className={p.cls} onClick={onHoverWord} data-q={qid} data-i={p.sent}>{p.text}</mark>,
      )
    }
    i = i + 1
  }
  return <div className={css.text}>{parts}</div>
}
