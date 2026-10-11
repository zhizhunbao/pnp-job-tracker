'use client'
/**
 * 「更多推荐」里锁住的一条(2026-10-10 批 2,16d):职位名与理由胶囊看得见,公司 / 地址 / 薪资是模糊的假字
 * (真值服务端不下发,纹理取本桶 LOCK_FILL)。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { Tag } from '@/components/tag'
import { WHY_TAG } from './constants'
import { lockFillOf } from './functions'
import type { LockedPickIn } from './types'
import css from './myjobs.module.css'

/**
 * 锁住的一条。
 *
 * @param props 职位名、理由与第几条。
 * @returns 一行。
 */
export function LockedPick({ title, reasons, i }: LockedPickIn) {
  const fill = lockFillOf(i)
  const tags = []
  for (const w of reasons) {
    tags.push(<Tag key={w} variant={WHY_TAG}>{w}</Tag>)
  }
  return (
    <div className={css.locked}>
      <div className={css.lockedTitle}>{title}</div>
      <div aria-hidden className={css.blur}>{fill.company}</div>
      <div aria-hidden className={css.blur}>{fill.address}</div>
      <div aria-hidden className={css.blur}>{fill.salary}</div>
      <div className={css.lockedWhy}>{tags}</div>
    </div>
  )
}
