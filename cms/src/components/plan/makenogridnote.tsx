'use client'
/**
 * plan 域的工厂:把「该省没有分值表时那句说明」做成估分线卡要的那种按省渲染口。
 * 2026-08-28 换装批随 NoGridNote 一并提出。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { NoGridNote } from './nogridnote'
import type { ProvNodeFn, ProvRenderIn } from './types'

/**
 * 造一个按省渲说明的渲染口。
 *
 * @param x 决策页整机。
 * @returns 省码 → 该省那句说明。
 */
export function makeNoGridNote(x: ProvRenderIn): ProvNodeFn {
  return function noGridNote(province: string) {
    return <NoGridNote d={x.d} province={province} />
  }
}
