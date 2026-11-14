'use client'
/**
 * gate 域的结构:「做过的工作」弹框的正文(2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索」):
 * 顶上「+ 再加一段」(新的一段加在最前),下面一段一个框;形照教育经历弹框。
 *
 * @author Frank
 * @time 2026-11-12 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { EDU_BTN_KIND, K_EDU_ADD, TEXT_NONE } from './constants'
import { GateWorkLine } from './gateworkline'
import type { GateWorkIn } from './types'
import { WORK_ROWS_MAX } from './work'
import css from './gate.module.css'

/**
 * 工作经历弹框正文。
 *
 * @param props 表单整机、取词、各段职业的字与选职业手柄工厂。
 * @returns 「+ 再加一段」与几段。
 */
export function GateWork({ g, t, names, occOpenOf, full }: GateWorkIn) {
  const w = g.edit.w
  const lines = []
  for (const [i, row] of w.work.entries()) {
    let name: string = TEXT_NONE
    const got = names[i]
    if (got != null) {
      name = got
    }
    lines.push(<GateWorkLine key={i} g={g} t={t} i={i} row={row} name={name} onOcc={occOpenOf(i)}
      full={full} />)
  }
  return (
    <div className={cssOf(css.eduLines)}>
      {w.work.length < WORK_ROWS_MAX && (
        <Button kind={EDU_BTN_KIND} className={cssOf(css.eduAdd)} onClick={w.onWorkAdd}>{t(K_EDU_ADD)}</Button>
      )}
      {lines}
    </div>
  )
}
