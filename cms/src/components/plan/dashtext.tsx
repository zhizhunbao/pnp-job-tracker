'use client'
/**
 * plan 域的小件:「这一格没有数据」的灰横杠。0 与它意思不同 —— 0 是「没有」,
 * 横杠是「我们没这个数」,所以它用灰字,不许被读成一个真值。
 * 2026-08-28 换装批自 Decision.tsx 里逐处重复的那枚灰 span 收拢。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { TEXT_DASH } from './constants'
import css from './plan.module.css'

/**
 * 渲染一根灰横杠。
 *
 * @returns 灰横杠。
 */
export function DashText() {
  return <span className={css.dash}>{TEXT_DASH}</span>
}
