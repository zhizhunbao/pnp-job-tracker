'use client'
/**
 * 体量卡的一行「标签-值」(市/区级:标签是整句,所以走宽标签档)。
 * 2026-08-28 换装批自 Advisor.tsx 的市/区两处同款行提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { CLS_SEP } from './constants'
import type { KvRowIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染一行体量行。
 *
 * @param props 标签与值。
 * @returns 体量行。
 */
export function KvRow({ label, value }: KvRowIn) {
  return (
    <div className={cssOf(css.kv)}>
      <span className={cssOf(css.kvK) + CLS_SEP + cssOf(css.w128)}>{label}</span>
      <span className={cssOf(css.kvV)}>{value}</span>
    </div>
  )
}
