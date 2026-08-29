'use client'
/**
 * plan 域的工厂:把通道名做成抽选线表要的那种逐行渲染口。
 * 表的这一格是 `(一行) => 节点` 的形状,而中文灰注出不出要看界面语 ——
 * 闭包变量改走显式入参,所以只能给函数不能给组件。
 * 2026-08-28 换装批第二段随 LineStreamText 一并提出。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { LineStreamText } from './linestreamtext'
import type { LineCellFn, LineDraw, LineStreamMakeIn } from './types'
import css from './plan.module.css'

/**
 * 造一个逐行渲通道名的渲染口。
 *
 * @param x 界面语。
 * @returns 一轮抽选 → 那一行的通道名格。
 */
export function makeLineStreamCell(x: LineStreamMakeIn): LineCellFn {
  return function streamCell(draw: LineDraw) {
    return (
      <span className={css.lineStreamCell}>
        <LineStreamText lang={x.lang} draw={draw} />
      </span>
    )
  }
}
