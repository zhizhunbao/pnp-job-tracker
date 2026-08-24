'use client'
/**
 * row 域的结构:事实行 —— 一条「标签-值」,标签列定宽 88 让多行的值左缘对齐成一条竖线。
 * 空值守卫是它存在的理由之一:值为 null / '' / '—' 时整行不渲染(缺项不占行,宁可留空),
 * 摊开进调用点就是几十处各写一遍 if。
 * 2026-08-24 自 ui/Row.tsx 按组件域形制迁入(fact* 三类自 main.css 随迁)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { EMPTY_MARK } from './constants'
import type { RowIn } from './types'
import css from './row.module.css'

/**
 * 事实行;值为空(null / 空串 / 「—」占位符)时返回 null 整行不渲染。
 *
 * @param props 标签与值。
 * @returns 事实行,或 null(不渲染)。
 */
export function Row({ k, children }: RowIn) {
  if (children == null || children === '' || children === EMPTY_MARK) {
    return null
  }
  return (
    <div className={css.row}>
      <span className={css.k}>{k}</span>
      <span className={css.v}>{children}</span>
    </div>
  )
}
