'use client'
/**
 * 市级卡组(点市进来;`/api/jobs/city` 现算,本站口径):体量 + 指定学习机构 + AIP 指定雇主。
 * AIP 卡不等取数 —— 它筛的是已加载的名录,数据在手就该出。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 市级段提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { AipEmployersCard } from './aipemployerscard'
import { AreaStatsCard } from './areastatscard'
import { DliCard } from './dlicard'
import { aipListOf, areaRowsOf } from './functions'
import type { CityCardsIn } from './types'

/**
 * 渲染市级卡组。
 *
 * @param props 取词函数、这一岗、市名、市级取数与名录。
 * @returns 市级各卡。
 */
export function CityCards({ t, job, city, cityInfo, desigEmp }: CityCardsIn) {
  const aipList = aipListOf({ desigEmp, job })
  return (
    <>
      {cityInfo != null && (
        <AreaStatsCard head={t('loc.cityJobs')} tag={city} rows={areaRowsOf({ t, stats: cityInfo })} />
      )}
      {cityInfo != null && cityInfo.dli.count > 0 && <DliCard t={t} dli={cityInfo.dli} />}
      {aipList.length > 0 && <AipEmployersCard t={t} list={aipList} />}
    </>
  )
}
