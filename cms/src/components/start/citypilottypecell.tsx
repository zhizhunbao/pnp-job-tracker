'use client'
/**
 * 域内小件:表 3(试点社区)的通道类型格(2026-09-11 重设计批)。
 * RCIP / FCIP 试点,绿字与表 1 的通道格同色。
 *
 * @author Frank
 * @time 2026-09-11 16:30:00
 */
import type { CityPilotRow } from './types'
import css from './start.module.css'

/**
 * 渲染通道类型格。
 *
 * @param r 这一行。
 * @returns 通道类型。
 */
export function CityPilotTypeCell(r: CityPilotRow) {
  return <span className={css.momUp}>{r.typeText}</span>
}
