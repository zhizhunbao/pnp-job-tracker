'use client'
/**
 * 手机地区卡里一行的值:最新一年的格(值 + 灰注);一格都没有的行不会进卡,这里只兜类型。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { DASH_MARK, TEXT_NONE } from './constants'
import type { MacroRow } from './types'
import css from './start.module.css'

/**
 * 渲染最新值。
 *
 * @param r 这一行。
 * @returns 值与灰注。
 */
export function MacroLatestCell(r: MacroRow) {
  if (r.latest == null) {
    return <span className={css.dim}>{DASH_MARK}</span>
  }
  return (
    <span className={css.nowrap}>
      {r.latest.text}
      {r.latest.note !== TEXT_NONE && <span className={css.noteInline}>{r.latest.note}</span>}
    </span>
  )
}
