'use client'
/**
 * me 桶子桶 profile 的结构:档案里的一条「标签-值」(照 Azure Essentials:宽屏标签一列灰字、值一列;手机标签在上、值在下)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import type { PfItemIn } from './types'
import css from './profile.module.css'

/**
 * 一条「标签-值」。
 *
 * @param props 标签与值。
 * @returns 一条。
 */
export function ProfileItem({ k, children }: PfItemIn) {
  return (
    <div className={cssOf(css.item)}>
      <div className={cssOf(css.k)}>{k}</div>
      <div className={cssOf(css.v)}>{children}</div>
    </div>
  )
}
