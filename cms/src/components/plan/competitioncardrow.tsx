'use client'
/**
 * plan 域的结构:一张各省名额竞争手机卡(省名 + 省码 + 比值 + 一行灰字明细)。
 * ÷ 算式与「截至…累计」不逐行念(2026-08-15 Frank「计算公式不用每个卡片都算一遍」):
 * 公式、存量快照月、累计口径都在脚注写一次,行内只留带短标签的值。
 * 2026-08-28 换装批自 Decision.tsx 的 dpCompCards 行提出成件。
 * 2026-10-09 N 批(Frank「职位名、公司名、地点同形」「城市 和 省份 点击 跳 google 地图」):省名 + 省码灰标签换 name 桶
 * ProvName —— 英文全名蓝链在上(点了新标签开 Google 地图)、界面语省名灰字在下,省码不再另起一格。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { ProvName } from '@/components/name'
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
      <b className={css.rowProv}><ProvName code={r.provCode} /></b>
      <span className={css.rowNum}>{r.ratioMain}</span>
      <span className={css.rowMeta}>{r.meta}</span>
    </div>
  )
}
