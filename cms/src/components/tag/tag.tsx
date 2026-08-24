'use client'
/**
 * tag 域的结构:状态标签(不可点)—— 省/联邦/重要/关注/通过/Pro 六变体。
 * 与 Chip 的分界:Tag 说「这是什么状态」,Chip 是可点的筛选。
 * 2026-08-24 自 ui/Tag.tsx 按组件域形制迁入(变体样式表迁 module.css)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { VARIANT_DEFAULT } from './constants'
import { tagClsOf } from './functions'
import type { TagIn } from './types'

/**
 * 状态标签。
 *
 * @param props 变体/悬停提示/文字。
 * @returns 标签。
 */
export function Tag({ variant = VARIANT_DEFAULT, title, children }: TagIn) {
  return <span title={title} className={tagClsOf(variant)}>{children}</span>
}
