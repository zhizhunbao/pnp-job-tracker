'use client'
/**
 * 域内小件:DLI 名单表的院校名格 —— 中文界面有译名走「译名主文案 + 英文灰注」双行,
 * 其余单行英文(2026-09-12 Frank「大学名 最好也加上中文翻译吧」,形照城市名双行约定;
 * 只读行上两格,不回头 import functions 防环)。
 *
 * @author Frank
 * @time 2026-09-12 14:05:00
 */
import type { SchoolRow } from './types'
import css from './city.module.css'

/**
 * 渲染院校名格。
 *
 * @param r 这一行(读 name / note)。
 * @returns 单行名或双行名。
 */
export function SchoolNameCell(r: SchoolRow) {
  if (r.note === '') {
    return r.name
  }
  return (
    <div>
      <div>{r.name}</div>
      <div className={css.note}>{r.note}</div>
    </div>
  )
}
