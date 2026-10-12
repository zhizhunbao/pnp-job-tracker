'use client'
/**
 * 域内小件:卡片上的数字格(2026-10-12 抽选页三段式)—— 一行三格,格名黑字在上、数字灰字在下
 * (Frank「key 不要是灰字,数字应该是灰字吧」「这个不用加粗 吧」);一格一条,不拿「·」串成一句。
 *
 * @author Frank
 * @time 2026-10-12 17:30:00
 */
import type { StatGridIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染数字格。
 *
 * @param props 各格。
 * @returns 格栅。
 */
export function StatGrid({ cells }: StatGridIn) {
  const items = []
  for (const c of cells) {
    items.push(
      <span key={c.k} className={css.stat}>
        <span className={css.statK}>{c.k}</span>
        <span className={c.cls}>{c.v}</span>
      </span>,
    )
  }
  return <span className={css.stats}>{items}</span>
}
