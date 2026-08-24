'use client'
/**
 * card 域的操作行:卡底部的按钮排。
 * 2026-08-24 自 ui/Card.tsx 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { CardActionIn } from './types'
import css from './card.module.css'

/**
 * 操作行。
 *
 * @param props 操作件。
 * @returns 操作行。
 */
export function CardAction({ children }: CardActionIn) {
  return <div className={css.act}>{children}</div>
}
