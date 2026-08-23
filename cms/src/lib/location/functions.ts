/**
 * 地点域的行为:省名显示、岗位地点拆解、地图查询串、省码清洗。
 * 地点已由清洗脚本(04c)规范化进库,这里只读结构化字段(省码 → 全称仅用于显示)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import {
  ALL_PROVS, COUNTRY_CANADA, F_CITY, F_COUNTRY, F_DISTRICT, F_PROVINCE, MAPS_URL, NOTE_L, NOTE_R, PROV_KEY,
  PROV_NAMES, SEP_COMMA,
} from './constants'
import type { CleanProvsIn, LocJob, MapQueryIn, ParsedLoc, ProvList, ProvNameIn } from './types'

/**
 * #146 显示用省名(Frank「中韩用户只看英文难理解」,拍板英文在前):中韩界面出
 * 「Ontario(安大略省)」,英文界面译名==英文名故只出英文。**只用于显示** ——
 * 筛选值仍是 PROV_NAMES 的英文全名(fProv/深链/保存的筛选都依赖它)。
 *
 * @param input 取词函数、省码与「只出本语」开关。
 * @returns 显示省名。
 */
export function provName(input: ProvNameIn): string {
  const c = (input.code || '').toUpperCase()
  const en = PROV_NAMES[c] || input.code || ''
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
 * 岗位行的地点格 → 显示地点(省码 → 全称仅用于显示)。
 *
 * @param j 职位的地点格。
 * @returns 拆解后的显示地点。
 */
export function parseLoc(j: LocJob): ParsedLoc {
  let country = ''
  if (j.country != null && j.country !== '') {
    country = j.country
  } else if (j.province != null && j.province !== '') {
    country = COUNTRY_CANADA
  }
  return {
    country: country,
    prov: PROV_NAMES[(j.province || '').toUpperCase()] || j.province || '',
    city: j.city || '',
    district: j.district || '',
  }
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
