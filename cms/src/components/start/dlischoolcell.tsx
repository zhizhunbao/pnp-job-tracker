'use client'
/**
 * 域内小件:表 4(留学院校)的院校名格 —— 中文界面有译名走「译名主文案 + 英文灰注」双行,
 * 其余单行英文(2026-09-12 Frank「要不每个学校单独一行怎么样」一校一行形;
 * 双行照城市名约定,只读行上两格,不回头 import functions 防环)。
 *
 * @author Frank
 * @time 2026-09-12 15:10:00
 */
import type { CityDliRow } from './types'
import css from './start.module.css'

/**
 * 渲染院校名格。
 *
 * @param r 这一行(读 name / note)。
 * @returns 单行名或双行名。
 */
export function DliSchoolCell(r: CityDliRow) {
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
