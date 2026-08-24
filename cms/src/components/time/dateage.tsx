'use client'
/**
 * time 域的「日期 + 已挂天数」:职位卡与列表的发布日形态 ——
 * 日期是事实、天数是注(所以天数更淡一档)。
 * 已关闭的岗不算天数(aging=false):它的「已挂」停在关闭那天,不该继续涨。
 * 2026-08-24 立域时自 Jobs 卡片收拢。
 *
 * @author Frank
 * @time 2026-08-24 13:00:00
 */
import { daysSince } from '@/lib/time'
import { textOf, toneClsOf } from './functions'
import type { DateAgeIn } from './types'
import css from './time.module.css'

/**
 * 日期 + 天数后缀。
 *
 * @param props ISO 串/天数文案/算不算天数。
 * @returns 文本。
 */
export function DateAge({ iso, ageText, aging }: DateAgeIn) {
  let days: number | null = null
  if (aging) {
    days = daysSince({ iso, now: Date.now() })
  }
  return (
    <span className={toneClsOf('dim')} suppressHydrationWarning>
      {textOf({ iso, grain: 'date' })}
      {days != null && <span className={css.age}>{ageText(days)}</span>}
    </span>
  )
}
