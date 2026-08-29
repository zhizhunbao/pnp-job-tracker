'use client'
/**
 * 域内小件:与我的匹配那一格的 chip(高 = 绿 / 中 = 蓝 / 低 = 灰 / 不适用 = 浅)。
 * #207(第 26 轮体检):裸字「高/中/低」无口径 —— 挂悬停说清是什么的高低,点开仍是逐条依据链。
 * 2026-08-28 换装批自 Table.tsx 的 cellOf 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { matchToneClsOf } from './functions'
import type { MatchCellIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染匹配档 chip。
 *
 * @param props 档名文案、档与悬停说明。
 * @returns 一枚 chip。
 */
export function MatchCell({ text, level, title }: MatchCellIn) {
  return (
    <span title={title} className={`${cssOf(css.match)} ${matchToneClsOf(level)}`}>{text}</span>
  )
}
