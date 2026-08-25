'use client'
/**
 * card 域的键值区:两列 grid,条目 = k 在 v 上方,wide 独占一整行。
 * 与 grid 域的分界(2026-08-17 Frank 点破):那边的网格列装**格子**(k 与 v 同行相邻),
 * 这边的列装**条目**—— 实现相同,不是同一件事。
 * 2026-08-24 自 ui/Card.tsx 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { CELL_CLS_NONE } from './constants'
import type { CardKvIn } from './types'
import css from './card.module.css'

/**
 * 键值区。
 *
 * @param props 条目清单。
 * @returns 键值网格。
 */
export function CardKV({ items }: CardKvIn) {
  const cells = []
  let i = 0
  for (const it of items) {
    let cls = CELL_CLS_NONE
    if (it.wide) {
      cls = css.wide
    }
    cells.push(
      <div key={i} className={cls}>
        <div className={css.kvK}>{it.k}</div>
        <div className={css.kvV}>{it.v}</div>
      </div>,
    )
    i = i + 1
  }
  return <div className={css.kv}>{cells}</div>
}
