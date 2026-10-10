'use client'
/**
 * 我的档案「所在地」那一格(2026-10-09「我的档案」批,Frank「省市 分开」):城市、省份两个名字并排
 * (name 桶 CityName / ProvName,英文在上、译名灰字在下,点了新标签开地图);没选城市只出省份;在境外写「加拿大境外」。
 *
 * @author Frank
 * @time 2026-10-09 23:30:00
 */
import { cssOf } from '@/components/css'
import { CityName, ProvName } from '@/components/name'
import { PF_ABROAD_KEY, TEXT_NONE } from './constants'
import type { PfWhereIn } from './types'
import css from './account.module.css'

/**
 * 所在地。
 *
 * @param props 档案与取词函数。
 * @returns 城市 + 省份,或「加拿大境外」。
 */
export function ProfileWhere({ v, t }: PfWhereIn) {
  if (v.abroad) {
    return <>{t(PF_ABROAD_KEY)}</>
  }
  return (
    <span className={cssOf(css.pfPlace)}>
      {v.city.en !== TEXT_NONE && <CityName city={v.city.en} province={v.prov} zh={v.city.zh} ko={v.city.ko} />}
      <ProvName code={v.prov} />
    </span>
  )
}
