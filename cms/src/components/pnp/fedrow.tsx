'use client'
/**
 * 域内小件:联邦轮次的一行(日期 / 轮次类型 / 分数线 / 邀请数)。
 * 类型色是**数据**(一类一色,含职业类别桶与兜底),所以逐行走内联色;几何全在 css。
 * 2026-08-28 换装批自 Pnp.tsx 的 FederalRoundsCard 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { TimeText } from '@/components/time'
import type { FedRowViewIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一条联邦轮次。
 *
 * @param props 洗好的这一行。
 * @returns 轮次行。
 */
export function FedRow({ r }: FedRowViewIn) {
  return (
    <div className={css.fedRow}>
      <TimeText iso={r.iso} />
      {/* eslint-disable-next-line react/forbid-dom-props -- 轮次类型色是数据(一类一色),由洗行时按类型给 */}
      <span title={r.title} className={css.fedType} style={{ color: r.color }}>{r.type}</span>
      <span className={css.fedCrs}>{r.crs}</span>
      <span className={css.fedIta}>{r.ita}</span>
    </div>
  )
}
