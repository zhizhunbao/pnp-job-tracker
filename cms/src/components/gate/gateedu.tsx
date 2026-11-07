'use client'
/**
 * 教育经历题(2026-10-13 档案加题;Frank 10-11「最近两年 和 两个 最重要」):至多两段,一段一行三只下拉,
 * 底下「+ 再加一段」;选填 —— 不填就是不按院校条件筛,主钮照常能点。
 *
 * @author Frank
 * @time 2026-10-13 02:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { EDU_BTN_KIND, EDU_ROWS_MAX, K_EDU_ADD } from './constants'
import { GateEduLine } from './gateeduline'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 教育经历题。
 *
 * @param props 访客向导整机与取词函数(见 GatePartIn 逐格注释)。
 * @returns 几段 + 「+ 再加一段」。
 */
export function GateEdu({ g, t }: GatePartIn) {
  const lines = []
  for (const [i, row] of g.edit.edu.entries()) {
    lines.push(<GateEduLine key={i} g={g} t={t} i={i} row={row} />)
  }
  return (
    <div className={cssOf(css.eduLines)}>
      {lines}
      {g.edit.edu.length < EDU_ROWS_MAX && (
        <Button kind={EDU_BTN_KIND} className={cssOf(css.eduAdd)} onClick={g.edit.onEduAdd}>{t(K_EDU_ADD)}</Button>
      )}
    </div>
  )
}
