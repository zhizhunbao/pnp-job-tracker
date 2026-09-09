'use client'
/**
 * 手机地区卡里一行的值:最新一年的格(值 + 年份灰注,进行年再带「至 X 月」;Frank 2026-09-08 实拍
 * 配额 2026 / 已发 2025 / 剩余 0 并排无年份读成「今年已发完」);一格都没有的行显缺数据的词。
 *
 * @author Frank
 * @time 2026-09-06 22:00:00
 */
import { TEXT_NONE } from './constants'
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
    return <span className={css.dim}>{r.missing}</span>
  }
  return (
    <span className={css.nowrap}>
      {r.latest.text}
      <span className={css.noteInline}>{r.latestYear}</span>
      {r.latest.note !== TEXT_NONE && <span className={css.noteInline}>{r.latest.note}</span>}
    </span>
  )
}
