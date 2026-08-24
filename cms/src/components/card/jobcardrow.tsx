'use client'
/**
 * card 域的左右两格行小件:身份在左、数字在右(右对齐在卡片流里连成竖线)。
 * 2026-08-24 自 ui/Card.tsx 的内嵌 Row 提出(一个 tsx 一个组件;域内自用,不出桶;
 * 与 row 域的 Row 无关 —— 那个是「标签-值」事实行)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { JobCardRowIn } from './types'
import css from './card.module.css'

/**
 * 左右两格行;两格都空时整行不渲染。
 *
 * @param props 左格与右格。
 * @returns 行,或 null(不渲染)。
 */
export function JobCardRow({ left, right }: JobCardRowIn) {
  if (left == null && right == null) {
    return null
  }
  return (
    <div className={css.row}>
      <span className={css.left}>{left}</span>
      <span className={css.right}>{right}</span>
    </div>
  )
}
