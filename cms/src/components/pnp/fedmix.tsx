'use client'
/**
 * 域内小件:联邦轮次的口径注(近 N 轮里各类各占几轮)。
 * 按真实轮次算 —— 原来是写死的一句「现阶段以 CEC 与法语为主」,轮次结构随政策变,写死就会过期。
 * 2026-08-28 换装批自 Pnp.tsx 的 FederalRoundsCard 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import type { FedMixIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染口径注。
 *
 * @param props 打头那句话与各类型的桶。
 * @returns 口径注。
 */
export function FedMix({ head, buckets }: FedMixIn) {
  const items = []
  for (const b of buckets) {
    items.push(
      <span key={b.key}>
        {b.sep}
        {/* eslint-disable-next-line react/forbid-dom-props -- 轮次类型色是数据(一类一色),由分桶时按类型给 */}
        <span style={{ color: b.color }}>{b.label} {b.count}</span>
      </span>,
    )
  }
  return <div className={css.fedHead}>{head}{items}</div>
}
