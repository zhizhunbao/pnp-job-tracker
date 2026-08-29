'use client'
/**
 * plan 域的结构:一张各省名额竞争手机卡(省名 + 省码 + 比值 + 一行灰字明细)。
 * ÷ 算式与「截至…累计」不逐行念(2026-08-15 Frank「计算公式不用每个卡片都算一遍」):
 * 公式、存量快照月、累计口径都在脚注写一次,行内只留带短标签的值。
 * 2026-08-28 换装批自 Decision.tsx 的 dpCompCards 行提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { CompetitionCardRowIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一张竞争手机卡。
 *
 * @param props 这一行展示行。
 * @returns 一张卡。
 */
export function CompetitionCardRow({ r }: CompetitionCardRowIn) {
  return (
    <div className={css.compRow}>
      <b className={css.rowProv}>{r.provName}</b>
      <span className={css.rowCode}>{r.provCode}</span>
      <span className={css.rowNum}>{r.ratioMain}</span>
      <span className={css.rowMeta}>{r.meta}</span>
    </div>
  )
}
