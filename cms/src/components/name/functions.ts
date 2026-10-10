/**
 * name 组件桶的行为:点名字时拦不拦、点了开什么、灰字取哪一份。
 *
 * @author Frank
 * @time 2026-10-09 06:40:00
 */
import { peekJobById } from '@/components/modal'
import { mapQuery, mapsUrl, PROV_NAMES } from '@/lib/location'
import { LANG_KO, LANG_ZH, LAYER_CO, MAP_CITY, MAP_PROVINCE, POOL_KEY_HEAD, PROV_KEY, TEXT_NONE } from './constants'
import type { CityMapIn, CoPeekIn, MapHrefIn, NameClickFn, NameView, ProvNameOfIn, SubIn } from './types'

/**
 * 造「点名字」的手柄:普通左键拦下、开弹框;按着 Ctrl / ⌘ / Shift / Alt 或非左键的放行给链接(新标签开整页的习惯不破)。
 * 同 companies 桶 JobMiniRow 的拦法(模板)。
 *
 * @param onOpen 开弹框。
 * @returns 点击手柄。
 */
export function makeNameClick(onOpen: () => void): NameClickFn {
  return function nameClick(e: React.MouseEvent): void {
    if (isPlainClick(e) === false) {
      return
    }
    e.preventDefault()
    onOpen()
  }
}

/**
 * 是不是「普通左键」:按着 Ctrl / ⌘ / Shift / Alt、或非左键的一律放行给链接。
 * 2026-10-09 N 批自 companies 桶收过来(全站只留这一份,companies 改从本桶取)。
 *
 * @param e 点击事件。
 * @returns 普通左键 = true。
 */
export function isPlainClick(e: React.MouseEvent): boolean {
  return e.button === 0 && e.metaKey === false && e.ctrlKey === false && e.shiftKey === false && e.altKey === false
}

/**
 * 城市的 Google 地图链接(Frank「城市 和 省份 点击 跳 google 地图啊」)。
 *
 * @param x 城市与省码。
 * @returns 地图链接。
 */
export function cityMapOf(x: CityMapIn): string {
  return mapHrefOf({ level: MAP_CITY, city: x.city, province: x.province })
}

/**
 * 省份的 Google 地图链接。
 *
 * @param province 两位省码。
 * @returns 地图链接。
 */
export function provMapOf(province: string): string {
  return mapHrefOf({ level: MAP_PROVINCE, city: TEXT_NONE, province })
}

/**
 * 城市 / 省份的地图链接(查询串走 lib/location 的单一来源:点市看市、点省看省,省一律全称)。
 *
 * @param x 哪一级与城市、省码。
 * @returns 地图链接。
 */
function mapHrefOf(x: MapHrefIn): string {
  return mapsUrl(mapQuery({
    field: x.level,
    job: { country: null, province: x.province, city: x.city, district: null, address: null },
  }))
}

/**
 * 一个名字的界面语译名:中文界面给中文、韩文界面给韩文,英文界面不出(2026-10-08 规定:英文在上、译名灰字在下,
 * 英文界面只出一行)。2026-10-09 N 批自 apply 桶收过来(全站只留这一份)。
 *
 * @param x 界面语与两种译名。
 * @returns 译名;不出给空串。
 */
export function subOf(x: SubIn): string {
  if (x.lang === LANG_ZH) {
    return x.zh
  }
  if (x.lang === LANG_KO) {
    return x.ko
  }
  return TEXT_NONE
}

/**
 * 省份的两行:英文全名(没收录的省码原样)在上,界面语省名在下(英文界面不出)。
 * 不是省码的(联邦 EE、全国 CA)词表里没有省名词条,取词会原样回键名 —— 灰字不出,免得露出 `prov.EE`(N6 把脉页实撞)。
 *
 * @param x 省码、界面语与取词函数。
 * @returns 省份的两行;省码空给两格空串。
 */
export function provNameOf(x: ProvNameOfIn): NameView {
  if (x.code === TEXT_NONE) {
    return { en: TEXT_NONE, sub: TEXT_NONE }
  }
  let en = x.code
  const full = PROV_NAMES[x.code]
  if (full != null) {
    en = full
  }
  const key = PROV_KEY + x.code
  const local = x.t(key)
  if (local === key) {
    return { en, sub: TEXT_NONE }
  }
  return { en, sub: subOf({ lang: x.lang, zh: local, ko: local }) }
}

/**
 * 造「点职位名」:叠开职位框(弹框总线按职位号现取一行;2026-10-09 N 批,Frank「而且这些英文应该是可以点击的」)。
 *
 * @param jobId 职位号。
 * @returns 点击手柄。
 */
export function makeJobPeek(jobId: number): () => void {
  return function jobPeek(): void {
    peekJobById(jobId)
  }
}

/**
 * 是不是没有公司页的池键(`n:` 开头):能开公司框,但不给整页链接(Ctrl 点会落 404;N6 子工报的 AIP 名单实情)。
 *
 * @param slug 公司页 slug 或池键。
 * @returns 池键 = true。
 */
export function isPoolKey(slug: string): boolean {
  return slug.startsWith(POOL_KEY_HEAD)
}

/**
 * 造「点公司名」:叠开公司框。
 *
 * @param x 弹框总线的叠层手柄与这一家。
 * @returns 点击手柄。
 */
export function makeCoPeek(x: CoPeekIn): () => void {
  return function coPeek(): void {
    x.push({ kind: LAYER_CO, co: x.co })
  }
}
