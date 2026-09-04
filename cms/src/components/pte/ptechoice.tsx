'use client'
/**
 * 域内小件:阅读单选 —— 题干 + 单选项;提交后正确项标绿、选错的标红。批五 2026-09-04。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP, INPUT_RADIO, RADIO_NAME } from './constants'
import type { PteChoiceIn } from './types'
import css from './pte.module.css'

/**
 * 渲染单选。
 *
 * @param props 载荷、作答面板与是否提交。
 * @returns 题干与选项。
 */
export function PteChoice({ extra, r, checked }: PteChoiceIn) {
  const rows = []
  let i = 0
  for (const o of extra.options) {
    let cls = cssOf(css.choiceRow)
    if (checked && o === extra.answer) {
      cls = cls + CLS_SEP + cssOf(css.blankOk)
    } else if (checked && o === r.choice) {
      cls = cls + CLS_SEP + cssOf(css.blankBad)
    }
    rows.push(
      <label key={i} className={cls}>
        <input type={INPUT_RADIO} name={RADIO_NAME} checked={r.choice === o} disabled={checked}
          onChange={r.chooseOf(o)} />
        <span>{o}</span>
      </label>,
    )
    i = i + 1
  }
  return (
    <div className={css.choice}>
      <div className={css.choiceQ}>{extra.question}</div>
      {rows}
    </div>
  )
}
