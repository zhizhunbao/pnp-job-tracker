'use client'
/**
 * 抽选表「通道」列的单元格:官方名主文案 + 界面语言译名灰注。
 * 通道名不截断(Frank 2026-08-06「名字别隐藏」):列内自然折行。
 * 2026-08-28 换装批自 Pulse.tsx 的 stream 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { TEXT_NONE } from './constants'
import type { DrawCellRow } from './types'
import css from './start.module.css'

/**
 * 渲染抽选表「通道」列的一个单元格。
 *
 * @param r 这一期的展示行。
 * @returns 通道名,以及有译名时的灰注行。
 */
export function StreamCell(r: DrawCellRow) {
  return (
    <>
      <span className={css.streamMain}>{r.main}</span>
      {r.note !== TEXT_NONE && <span className={css.streamNote}>{r.note}</span>}
    </>
  )
}
