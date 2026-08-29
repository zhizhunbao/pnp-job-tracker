'use client'
/**
 * 区级卡组(点区进来;Frank「点区看区的信息」):体量 + 区内在招最多的雇主。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 区级段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { AreaStatsCard } from './areastatscard'
import { DistrictEmployers } from './districtemployers'
import { areaRowsOf } from './functions'
import type { DistrictCardsIn, DistrictStatsFact } from './types'

/**
 * 渲染区级卡组。
 *
 * @param props 取词函数、区名与市级取数。
 * @returns 区级各卡。
 */
export function DistrictCards({ t, district, cityInfo }: DistrictCardsIn) {
  let dist: DistrictStatsFact | null = null
  if (cityInfo != null) {
    dist = cityInfo.district
  }
  return (
    <>
      {dist != null && (
        <AreaStatsCard head={t('loc.distJobs')} tag={district} rows={areaRowsOf({ t, stats: dist })} />
      )}
      {dist != null && dist.topEmployers.length > 0 && (
        <DistrictEmployers t={t} employers={dist.topEmployers} />
      )}
    </>
  )
}
