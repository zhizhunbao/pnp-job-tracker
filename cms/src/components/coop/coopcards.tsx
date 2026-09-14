'use client'
/**
 * 校内板的手机卡片流(≤640 出;桌面藏)。全量行进来,卡片流不分页 —— 与雇主板同形。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { CoopCard } from './coopcard'
import type { CoopCardsIn } from './types'
import css from './coop.module.css'

/**
 * 渲染卡片流。
 *
 * @param props 展示行与空态文案。
 * @returns 一叠卡;没有行时一条空态。
 */
export function CoopCards({ rows, empty }: CoopCardsIn) {
  const cards = []
  for (const r of rows) {
    cards.push(<CoopCard key={r.key} r={r} />)
  }
  return (
    <>
      {cards}
      {rows.length === 0 && <div className={css.cardsEmpty}>{empty}</div>}
    </>
  )
}
