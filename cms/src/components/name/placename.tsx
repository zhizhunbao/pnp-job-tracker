'use client'
/**
 * 地点一行(2026-10-11 批 4,CLAUDE.md「地点照 Indeed 写一行」):完整地址(没街号写「市, 省码」)整行一个蓝链去 Google 地图,
 * 不带图标;中 / 韩界面下面灰字「市译名,省译名」。表格外的职位地点(卡片、弹框、详情页)全站只此一个出口;
 * 一行怎么拼走 lib/location 的 placeLineOf(调用方拼好传进来)。
 * 2026-10-11 加 plain:只出英文一行(相关职位卡「隐藏翻译」)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import { placeHrefOf, placeSubOf } from './functions'
import { Name } from './name'
import type { PlaceNameIn } from './types'

/**
 * 地点一行。
 *
 * @param props 地点一行、城市两种译名与省码。
 * @returns 一行蓝链(+ 灰字);没有地点不渲。
 */
export function PlaceName({ line, cityZh, cityKo, province, plain = false }: PlaceNameIn) {
  const [lang, , t] = useLang()
  if (line === TEXT_NONE) {
    return null
  }
  let sub = TEXT_NONE
  if (plain === false) {
    sub = placeSubOf({ cityZh, cityKo, province, lang, t })
  }
  return <Name en={line} sub={sub} href={placeHrefOf(line)} />
}
