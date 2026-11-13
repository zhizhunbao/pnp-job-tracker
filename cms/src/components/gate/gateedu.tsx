'use client'
/**
 * 教育经历题(2026-10-13 档案加题;Frank 10-11「最近两年 和 两个 最重要」):至多两段,一段一行三只下拉,
 * 底下「+ 再加一段」;选填 —— 不填就是不按院校条件筛,主钮照常能点。
 *
 * 2026-11-12 Frank「教育经历 和 专业是不是重复了」:专业并进每一段,各段专业的名字由调用方查好递进来。
 *
 * @author Frank
 * @time 2026-10-13 02:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { EDU_BTN_KIND, EDU_ROWS_MAX, K_EDU_ADD, TEXT_NONE } from './constants'
import { GateEduLine } from './gateeduline'
import type { GateEduIn } from './types'
import css from './gate.module.css'

/**
 * 教育经历题。
 *
 * @param props 表单整机、取词函数、各段专业的名字与搜学校整机。
 * @returns 几段 + 「+ 再加一段」。
 */
export function GateEdu({ g, t, majors, sch }: GateEduIn) {
  const lines = []
  for (const [i, row] of g.edit.edu.entries()) {
    let major: string = TEXT_NONE
    const got = majors[i]
    if (got != null) {
      major = got
    }
    lines.push(
      <GateEduLine key={i} g={g} t={t} i={i} row={row} major={major} onMajor={g.edit.em.openOf(i)} sch={sch} />,
    )
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
