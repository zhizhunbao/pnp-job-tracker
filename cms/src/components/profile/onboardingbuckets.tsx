'use client'
/**
 * 向导的区间单选行(§3.4 大白话零打字):英语水平、快速通道分、工签剩余三步共用,
 * 每档一枚 chip,点 null 值那档 = 清空该格。与档案表单的 BucketRow 是同一套点选逻辑
 * (手柄都走 functions 的 makeOptPick),只有行距按向导的一屏一问放宽一档。
 * 2026-08-28 换装批自 OnboardingWizard.tsx 体内的 Chips 内嵌件提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:30:00
 */
import { Chip } from '@/components/chip'
import { makeOptPick } from './functions'
import type { OnboardingBucketsIn } from './types'
import css from './profile.module.css'

/**
 * 区间单选的一排 chips。
 *
 * @param props 档表、现值归属与上报口(见 OnboardingBucketsIn 逐格注释)。
 * @returns 一排档 chips。
 */
export function OnboardingBuckets({ opts, active, onPick, t }: OnboardingBucketsIn) {
  const chips = []
  for (const o of opts) {
    chips.push(
      <Chip key={o.key} onClick={makeOptPick({ value: o.value, onPick })} active={active === o.value}>
        {t(o.key)}
      </Chip>,
    )
  }
  return <div className={css.obRow}>{chips}</div>
}
