'use client'
/**
 * 弹框总线的报件(无界面;2026-10-09 N 批,Frank「一个全站宿主,并掉各页那 5 套」):各页原先自己画 PeekStack 时
 * 直接递分层态与职业名表,宿主上收到全站骨架后由它把这两样报上去,卸载撤回。
 *
 * @author Frank
 * @time 2026-10-09 05:30:00
 */
import { usePeekContext } from './hooks'
import type { PeekContextIn } from './types'

/**
 * 报件。
 *
 * @param props 本页的分层态与职业名表。
 * @returns 什么都不渲。
 */
export function PeekContext({ plan, nocDesc }: PeekContextIn) {
  usePeekContext({ plan, nocDesc })
  return null
}
