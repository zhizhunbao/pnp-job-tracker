'use client'
/**
 * 域内小件:表 1(主要城市)的专属通道格(2026-09-11 重设计批)。
 * 有试点绿字(与 momUp 同色)—— 试点是移民视角的差异点信号;没有画杠。
 *
 * @author Frank
 * @time 2026-09-11 16:30:00
 */
import { DASH_MARK } from './constants'
import type { CityMainRow } from './types'
import css from './start.module.css'

/**
 * 渲染专属通道格。
 *
 * @param r 这一行。
 * @returns 通道文案。
 */
export function CityPilotCell(r: CityMainRow) {
  if (r.pilotText === DASH_MARK) {
    return DASH_MARK
  }
  return <span className={css.momUp}>{r.pilotText}</span>
}
