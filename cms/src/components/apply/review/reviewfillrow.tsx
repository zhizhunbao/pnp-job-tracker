'use client'
/**
 * apply 桶子桶 review 的补充经历一行(2026-11-09 Frank「给用户一个 skeleton 让用户填」):要求原文加一段带空格的句子骨架。
 * 同日 Frank 看过实物「骨架 就告诉这部分应该填什么即可」:不再预填带空格的句子,文本框空着,框里提示该写什么。
 *
 * @author Frank
 * @time 2026-11-09 23:00:00
 */
import { cssOf } from '@/components/css'
import { FILL_ROWS } from './constants'
import type { ReviewFillRowIn } from './types'
import css from './review.module.css'

/**
 * 一条要补的要求。
 *
 * @param props 这条要求、文字、提示与改动手柄。
 * @returns 一行。
 */
export function ReviewFillRow({ r, value, hint, onChange }: ReviewFillRowIn) {
  return (
    <div className={cssOf(css.fillRow)}>
      <div className={cssOf(css.fillReq)}>{r.jd}</div>
      <textarea className={cssOf(css.area)}
        rows={FILL_ROWS}
        value={value}
        placeholder={hint}
        onChange={onChange}
        aria-label={r.jd} />
    </div>
  )
}
