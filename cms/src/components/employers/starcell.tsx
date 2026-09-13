'use client'
/**
 * 域内哑单元格:雇主板「星级」列 —— 五枚星形字符(实心补空心),悬停出「N 星」。
 * 星级是数据层算死的切面星(指定 >> 在招+入门 > 技能 LMIA),板只读不复算(口径单一红线)。
 *
 * @author Frank
 * @time 2026-09-13 18:00:00
 */
import type { EmployerCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染星级格。
 *
 * @param r 这一行的展示行。
 * @returns 星形文本。
 */
export function StarCell(r: EmployerCellRow) {
  return <span className={css.star} title={r.starTitle}>{r.starText}</span>
}
