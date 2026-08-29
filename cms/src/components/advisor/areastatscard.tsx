'use client'
/**
 * 市/区体量卡(两级同一张卡,只是标题与数据不同;`/api/jobs/city` 现算,本站口径)。
 * 2026-08-28 换装批自 Advisor.tsx 的市级卡与区级卡合成一件(原先两处逐字重复)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { CARD_HEAD_CLS, CARD_MD_CLS, SPACE } from './constants'
import { KvRow } from './kvrow'
import type { AreaStatsCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染体量卡。
 *
 * @param props 卡标题、标题后的灰注与体量行。
 * @returns 体量卡。
 */
export function AreaStatsCard({ head, tag, rows }: AreaStatsCardIn) {
  const out = []
  for (const r of rows) {
    out.push(<KvRow key={r.key} label={r.label} value={r.value} />)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{head}{SPACE}<span className={cssOf(css.gnoteM)}>{tag}</span></div>
      {out}
    </div>
  )
}
