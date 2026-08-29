'use client'
/**
 * 区间单选行(§3.4 大白话零打字):clb / crs / pgwp 三个字段共用的一排 chips,
 * 每档一枚,点 null 值档 = 清空该字段。active 用严格等值判:o.value 为 null 的
 * 「不确定」档,恰好在 active 也是 null 时相等 —— 旧版那句三目
 * (`o.value === null ? active === null : active === o.value`)本来就是同一件事。
 * 2026-08-27 换装批自 ProfileForm.tsx 的内嵌 BucketRow 提出成文件
 * (一文件一组件;逐枚手柄走 functions 的 makeOptPick 工厂)。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Chip } from '@/components/chip'
import { makeOptPick } from './functions'
import type { BucketRowIn } from './types'
import css from './profile.module.css'

/**
 * 区间单选的一排 chips。
 *
 * @param props 档表、现值归属与上报口(见 BucketRowIn 逐格注释)。
 * @returns 一排档 chips。
 */
export function BucketRow({ opts, active, onPick, t }: BucketRowIn) {
  const chips = []
  for (const o of opts) {
    chips.push(
      <Chip key={o.key} onClick={makeOptPick({ value: o.value, onPick })} active={active === o.value}>
        {t(o.key)}
      </Chip>,
    )
  }
  return <div className={css.chipsRow}>{chips}</div>
}
