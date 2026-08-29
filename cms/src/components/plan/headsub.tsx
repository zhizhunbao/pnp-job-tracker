'use client'
/**
 * plan 域的小件:带灰字小注的表头。同列同口径的日期不逐行重复
 * (2026-08-14 Frank「年份月份要拆出来吧」)—— 存量快照月与流量口径全表一致,
 * 挪进表头当灰注;拆成独立列会得到一整列同一个值。
 * 2026-08-28 换装批自 Decision.tsx 的 thSub 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { HeadSubIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一个带灰注的表头。
 *
 * @param props 主表头词与灰字小注。
 * @returns 表头。
 */
export function HeadSub({ main, sub }: HeadSubIn) {
  return (
    <span>
      {main}
      {sub != null && <span className={css.thSub}>{sub}</span>}
    </span>
  )
}
