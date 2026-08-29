'use client'
/**
 * plan 域的工厂:把差值格做成抽选线表要的那种逐行渲染口。
 * 表的这一格是 `(一行) => 节点` 的形状,而差值还要用到「这个省的估分」——
 * 闭包变量改走显式入参,所以只能给函数不能给组件。
 * 2026-08-28 换装批第二段随 LineGapCell 一并提出。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { LineGapCell } from './linegapcell'
import type { LineCellFn, LineDraw, LineGapMakeIn } from './types'

/**
 * 造一个逐行渲差值的渲染口。
 *
 * @param x 这个省的估分。
 * @returns 一轮抽选 → 那一行的差值格。
 */
export function makeLineGapCell(x: LineGapMakeIn): LineCellFn {
  return function gapCell(draw: LineDraw) {
    return <LineGapCell score={x.score} draw={draw} />
  }
}
