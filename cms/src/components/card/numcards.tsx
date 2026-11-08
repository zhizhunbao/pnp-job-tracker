'use client'
/**
 * card 域的小件:一排数字卡(数字主、标题副;2026-11-08 运维页立,形照就业把脉的四格)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import type { NumCardsIn } from './types'
import css from './card.module.css'

/**
 * 渲染一排数字卡。
 *
 * @param props 各格。
 * @returns 一排静态卡。
 */
export function NumCards({ cards }: NumCardsIn) {
  const items = []
  for (const c of cards) {
    items.push(<div key={c.label}><b>{c.value}</b><span>{c.label}</span></div>)
  }
  return <div className={css.nums}>{items}</div>
}
