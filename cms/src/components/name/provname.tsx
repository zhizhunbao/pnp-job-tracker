'use client'
/**
 * 省份两行(2026-10-09 N 批):英文省全名蓝链在上、界面语省名灰字在下;点了新标签开 Google 地图。
 *
 * @author Frank
 * @time 2026-10-09 09:00:00
 */
import { useLang } from '@/components/i18n'
import { provMapOf, provNameOf } from './functions'
import { Name } from './name'
import type { ProvNameIn } from './types'

/**
 * 省份两行。
 *
 * @param props 两位省码。
 * @returns 两行(或一行)。
 */
export function ProvName({ code }: ProvNameIn) {
  const [lang, , t] = useLang()
  const n = provNameOf({ code, lang, t })
  return <Name en={n.en} sub={n.sub} href={provMapOf(code)} />
}
