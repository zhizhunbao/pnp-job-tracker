'use client'
/**
 * 城市两行(2026-10-09 N 批):英文城市名蓝链在上、界面语译名灰字在下;点了新标签开 Google 地图
 * (Frank「城市 和 省份 点击 跳 google 地图啊」)。省份另起一个 ProvName,不拼进同一格(Frank「省市 分开」)。
 *
 * @author Frank
 * @time 2026-10-09 09:00:00
 */
import { useLang } from '@/components/i18n'
import { cityMapOf, subOf } from './functions'
import { Name } from './name'
import type { CityNameIn } from './types'

/**
 * 城市两行。
 *
 * @param props 城市、省码与两种译名。
 * @returns 两行(或一行)。
 */
export function CityName({ city, province, zh, ko }: CityNameIn) {
  const [lang] = useLang()
  return <Name en={city} sub={subOf({ lang, zh, ko })} href={cityMapOf({ city, province })} />
}
