'use client'
/**
 * eyebrow 小字:弹框标题上方的场景小字(如「简历对照」功能名)。
 * 可省件 —— 调用方没传内容就整块不渲染(「渲染还是不渲染」这个判断收在本组件体内,
 * 父组件的 JSX 里不留条件式;2026-08-24 Frank「这种都抽象成函数先」)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { eyebrowClsOf } from './functions'
import type { EyebrowIn } from './types'

/**
 * eyebrow 小字块;内容为空时返回 null(React 里 return null = 什么都不画)。
 *
 * @param props 内容与深色档。
 * @returns 小字块,或 null(不渲染)。
 */
export function Eyebrow({ eyebrow, deep }: EyebrowIn) {
  if (eyebrow == null) {
    return null
  }
  return <div className={eyebrowClsOf(deep)}>{eyebrow}</div>
}
