'use client'
/**
 * 对比表「与我的匹配」行的单元格(Pro 专属维度):渲染两行小字 —— 高匹配岗数用绿色、
 * 中匹配岗数用蓝色。没建过档、或还没算过的雇主渲灰色横杠 —— 那表示「我们没算」,
 * 不是「零匹配」。
 * 2026-08-27 换装批自 Compare.tsx 的 match 维度 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { CompareCellRow } from './types'
import css from './employers.module.css'

/**
 * 渲染对比表「与我的匹配」行里属于这家雇主的那一个单元格。
 *
 * @param r 这家雇主的展示行。
 * @returns 高匹配与中匹配两行,没算过时是灰色横杠。
 */
export function MatchCell(r: CompareCellRow) {
  if (r.matchHigh === TEXT_NONE) {
    return <DashText v={{ text: TEXT_NONE, cls: TEXT_NONE }} />
  }
  return (
    <span className={css.matchCell}>
      <div className={css.matchHigh}>{r.matchHigh}</div>
      <div className={css.matchMid}>{r.matchMid}</div>
    </span>
  )
}
