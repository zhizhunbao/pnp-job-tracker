/**
 * 地点域的行为:省名显示、岗位地点拆解、地图查询串、省码清洗。
 * 地点已由清洗脚本(04c)规范化进库,这里只读结构化字段(省码 → 全称仅用于显示)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import {
  ALL_PROVS, COUNTRY_CANADA, F_CITY, F_COUNTRY, F_DISTRICT, F_PROVINCE, LOC_NONE, MAPS_URL, NOTE_L, NOTE_R,
  HOME_GATE_CSS_SLOT, HOME_GATE_JS, HOME_GATE_ZONES_SLOT,
  LANG_FR_HEAD, PROV_KEY, PROV_NAMES, PROV_QC, SEP_COMMA, TZ_CANADA_HEAD, TZ_CANADA_OTHER, TZ_EASTERN, TZ_PROVINCE,
} from './constants'
import type { CleanProvsIn, HqLineIn, LocJob, MapQueryIn, ParsedLoc, ProvList, ProvNameIn } from './types'

/**
 * #146 显示用省名(Frank「中韩用户只看英文难理解」,拍板英文在前):中韩界面出
 * 「Ontario(安大略省)」,英文界面译名==英文名故只出英文。**只用于显示** ——
 * 筛选值仍是 PROV_NAMES 的英文全名(fProv/深链/保存的筛选都依赖它)。
 *
 * @param input 取词函数、省码与「只出本语」开关。
 * @returns 显示省名。
 */
export function provName(input: ProvNameIn): string {
  const c = (input.code || LOC_NONE).toUpperCase()
  const en = PROV_NAMES[c] || input.code || LOC_NONE
  const loc = input.t(PROV_KEY + c)
  const has = loc !== '' && loc !== PROV_KEY + c && loc !== en
  if (has === false) {
    return en
  }
  if (input.localeOnly) {
    return loc
  }
  return en + NOTE_L + loc + NOTE_R
}

/**
 * Google 地图搜索链接。
 *
 * @param q 查询串。
 * @returns 地图 URL。
 */
export function mapsUrl(q: string): string {
  return MAPS_URL + encodeURIComponent(q)
}

/**
 * 公司真总部的一行字:街址、市、省码三格里有值的,用逗号接成一行,一律带国家(「320 Matheson Blvd W., Unit #212, Mississauga, ON, Canada」)。
 * 2026-09-20 Frank「都带上国家」:省格是加拿大省码的补 Canada;外国总部的省格数据层已是「州, 国」(Menlo Park, California, United States)。
 * 英文原样不译(2026-09-19 Frank「不要用 中文」);三格的清洗(街址只留到街、省码大写)在数据层 mart 做完,这里只拼。
 * 2026-09-20 立:公司卡「总部」行与雇主板「总部」列共用这一份拼法(行为一份,两处同口径)。
 *
 * @param input 总部三格。
 * @returns 一行字;三格都空给空串。
 */
export function hqLineOf(input: HqLineIn): string {
  const parts: string[] = []
  for (const part of [input.address, input.city, input.province]) {
    if (part !== LOC_NONE) {
      parts.push(part)
    }
  }
  if (PROV_NAMES[input.province] != null) {
    parts.push(COUNTRY_CANADA)
  }
  return parts.join(SEP_COMMA)
}

/**
 * 地点各级的地图查询串(单一来源;表格格与手机卡共用)。各级只查自己那一级
 * (点省看省、点市看市),**省一律用全称**:省码 NL 既是纽芬兰也是荷兰国家码,
 * 单查会跳欧洲(#175 实测),全称无歧义。
 *
 * @param input 哪一级与职位的地点格。
 * @returns 查询串。
 */
export function mapQuery(input: MapQueryIn): string {
  const L = parseLoc(input.job)
  if (input.field === F_PROVINCE) {
    return [L.prov, COUNTRY_CANADA].filter(Boolean).join(SEP_COMMA)
  }
  if (input.field === F_CITY) {
    return [L.city, L.prov, COUNTRY_CANADA].filter(Boolean).join(SEP_COMMA)
  }
  if (input.field === F_COUNTRY) {
    return L.country || COUNTRY_CANADA
  }
  if (input.field === F_DISTRICT) {
    return [L.district, L.city, L.prov].filter(Boolean).join(SEP_COMMA)
  }
  return [input.job.address || L.district, L.city, L.prov].filter(Boolean).join(SEP_COMMA)
}

/**
 * 岗位行的地点格 → 显示地点(省码 → 全称仅用于显示)。
 *
 * @param j 职位的地点格。
 * @returns 拆解后的显示地点。
 */
export function parseLoc(j: LocJob): ParsedLoc {
  let country = LOC_NONE
  if (j.country != null && j.country !== '') {
    country = j.country
  } else if (j.province != null && j.province !== '') {
    country = COUNTRY_CANADA
  }
  return {
    country: country,
    prov: PROV_NAMES[(j.province || LOC_NONE).toUpperCase()] || j.province || LOC_NONE,
    city: j.city || LOC_NONE,
    district: j.district || LOC_NONE,
  }
}

/**
 * 模型给的省码 → 认得出的留下,认不出的丢掉(**不猜**),并且**去重**。
 *
 * 🔴 2026-08-20 收拢时发现两个域各有一份,而且**行为不一样**:
 * `lib/agent` 那份不去重、`lib/consult` 那份去重 —— 同一句「BC 和 BC」两条链给出不同的
 * 目标省清单。收成一份,口径取**去重**那一版:重复的省码进 `targetProvinces` 会重复计数、
 * 出重复行,而「他说了两遍」不是「他想去两次」。
 * 白名单是 `ALL_PROVS`(九个 PNP 省 + QC)—— 两边本来就都用它,这一层没岔。
 *
 * @param input 模型给的省码清单。
 * @returns 认得出且去重后的省码。
 */
export function cleanProvs(input: CleanProvsIn): ProvList {
  let raw: string[] = []
  if (input.raw != null) {
    raw = input.raw
  }
  const kept: ProvList = []
  for (const one of raw) {
    const prov = one.trim().toUpperCase()
    if (ALL_PROVS.has(prov) && kept.includes(prov) === false) {
      kept.push(prov)
    }
  }
  return kept
}

/**
 * 设备时区(加上东部时区的语言判)→ 省码;对不上给空串。浏览器 API 读不到(老环境)也给空串。
 *
 * 2026-09-18 自 components/jobs 原样迁入(雇主板也按它预选本省;Frank「默认是当前省份」):行为一份,两块板同口径。
 *
 * @returns 省码;'' = 不预选。
 */
export function homeProvinceOf(): string {
  let tz = LOC_NONE
  let lang = LOC_NONE
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    lang = navigator.language.toLowerCase()
  } catch {
    return LOC_NONE
  }
  const prov = TZ_PROVINCE[tz]
  if (prov == null) {
    return LOC_NONE
  }
  if (tz === TZ_EASTERN && lang.startsWith(LANG_FR_HEAD)) {
    return PROV_QC
  }
  return prov
}

/**
 * 设备时区名(浏览器报的 IANA 名)。2026-10-03 付费闭环批 A1 立:访客向导拿它判「加拿大境外」——
 * 省怎么预选仍归 homeProvinceOf,这里只交时区名本身。
 *
 * @returns 时区名;浏览器没报给空串。
 */
export function deviceTzOf(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (typeof tz !== 'string') {
    return LOC_NONE
  }
  return tz
}

/**
 * 这个时区名在不在加拿大境内(对得上省的、分不出省的、领地、旧式 Canada/ 名都算)。
 * 2026-10-03 付费闭环批 A1 立:访客向导只在「不在境内」时才预选「加拿大境外」,
 * 大西洋时区这类分不出省的不预选,也不许当成境外。
 *
 * @param tz 时区名;空串 = 不知道,不算境内。
 * @returns 在境内 true。
 */
export function isCanadaTz(tz: string): boolean {
  if (TZ_PROVINCE[tz] != null || TZ_CANADA_OTHER.includes(tz)) {
    return true
  }
  return tz.startsWith(TZ_CANADA_HEAD)
}

/**
 * 首帧脚本:设备时区对得上时区表里的省(与 homeProvinceOf 同一张 TZ_PROVINCE),就往 `<head>` 插一段给定的样式。
 * 2026-09-26 /fe 首页 Frank「首屏整表替换」立:服务端不知道时区(只用时区、不记上次所选、不看 IP —— 09-14 / 09-18 两拍),
 * 没带省的首屏只能先渲全国;这段脚本在浏览器解析到它时当场判、早于首帧绘制,让职位板把「马上要被换成本省」的全国列表压住。
 * 它只问「会不会预选」,不分省 —— 选哪一省仍归 homeProvinceOf(东部时区还要看语言分安省 / 魁省)。
 * 脚本是另一种介质(页面 JS 到之前就得跑),所以是模板串;时区清单由 TZ_PROVINCE 现拼,不另抄一份。
 *
 * @param css 命中时插入的样式(调用方给;本函数不认识任何类名)。
 * @returns 一段自执行脚本的源码。
 */
export function homeGateJsOf(css: string): string {
  return HOME_GATE_JS.split(HOME_GATE_ZONES_SLOT).join(JSON.stringify(Object.keys(TZ_PROVINCE)))
    .split(HOME_GATE_CSS_SLOT).join(JSON.stringify(css))
}
