'use client'
/**
 * 域内小件:加载占位块。自上而下渲染铁律(2026-08-06 Frank「为什么下面的内容先刷出来」)
 * —— 数据没到先占住高度,不出空壳也不塌版;数据到了但榜全空才整块不渲染
 * (绝不拿存量榜顶包)。
 * 2026-08-28 换装批自 Pulse.tsx 的四处占位 div 收成一件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { placeholderClsOf } from './functions'
import type { PlaceholderIn } from './types'

/**
 * 渲染一块加载占位。
 *
 * @param props 高度档。
 * @returns 占位块。
 */
export function Placeholder({ size }: PlaceholderIn) {
  return <div className={placeholderClsOf({ size })} />
}
