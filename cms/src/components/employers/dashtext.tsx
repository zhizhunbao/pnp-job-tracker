'use client'
/**
 * 域内小件:渲染一个已经算好的单元格文本 —— 有值就按它自己的色档类渲,
 * 没值渲一个灰色横杠。
 * 🔴 横杠的口径:它表示**本站没有这一项**,不是 0 —— 官方可空的数值折成 0 等于替官方
 * 编数,所以「有没有」在洗展示行的时候就判完了,这里只认空串。
 * 本域大半的单元格都是这个形态(LMIA 一族、对比表的季度/均分/年薪/具名岗数…),
 * 行为收在这一处:各列的单元格组件只负责说清自己取哪一项,不各写一遍横杠。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { DASH_MARK, TEXT_NONE } from './constants'
import type { DashTextIn } from './types'
import css from './employers.module.css'

/**
 * 渲染一个单元格文本,没有值时渲灰色横杠。
 *
 * @param props 已经算好的这一项。
 * @returns 文本,或表示「本站没有这一项」的灰色横杠。
 */
export function DashText({ v }: DashTextIn) {
  if (v.text === TEXT_NONE) {
    return <span className={css.dim}>{DASH_MARK}</span>
  }
  return <span className={v.cls}>{v.text}</span>
}
