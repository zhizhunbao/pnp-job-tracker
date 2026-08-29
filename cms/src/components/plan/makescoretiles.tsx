'use client'
/**
 * plan 域的工厂:把「某个省的估分题条件格」做成估分线卡要的那种按省渲染口。
 * 估分线卡的这一格是 `(省码) => 节点` 的形状(它自己有省页签),所以只能给函数不能给组件。
 * 2026-08-28 换装批随 ScoreTiles 一并提出。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { ScoreTiles } from './scoretiles'
import type { ProvNodeFn, ProvRenderIn } from './types'

/**
 * 造一个按省渲条件格的渲染口。
 *
 * @param x 决策页整机。
 * @returns 省码 → 该省的条件格。
 */
export function makeScoreTiles(x: ProvRenderIn): ProvNodeFn {
  return function tiles(province: string) {
    return <ScoreTiles d={x.d} province={province} />
  }
}
