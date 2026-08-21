// 地点:省码/省名、岗位地点拆解、地图查询串。全站单一来源。
// 地点本身已由清洗脚本(etl/clean/04c)规范化进库,这里只做**显示**层的取用与拼串,不再解析。
import type { TFn } from '@/lib/i18n'
import type { ColKey, JobRow } from './jobs'

/** 有 PNP 的九省。**顺序只是声明顺序**,不是排名 —— 别拿前几个当默认(chat/cards.ts:224 那条教训)。 */
export const PNP_PROVINCES = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE']

/** 认得出的省码:九省 + QC(魁省走自己的体系,不属 PNP,但用户会提、模型会给)。
 *  2026-08-19 从 `chat/normalize.ts` 搬来 —— 它在 chat 与 agent 里各写了一遍同一行,
 *  而省码是**全站口径**,不该由某个域拥有(域之间不互相取常量;共享叶子才是它的家)。
 *  ⚠️ 顺带治了一个老雷:它原先住 `chat/tools.ts`(1141 行、依赖一大串),
 *  三处文件头注释记着它「初始化时 undefined / is not iterable」。本文件零运行时 import,不会有那问题。 */
export const ALL_PROVS = new Set([...PNP_PROVINCES, 'QC'])

/** 省码 → 省全名。筛选值一律用全名(fProv/深链/保存的筛选都依赖它);jobs/filters.shared 再导出给筛选侧。 */
export const PROV_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec', MB: 'Manitoba', SK: 'Saskatchewan',
  NS: 'Nova Scotia', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
  NT: 'Northwest Territories', YT: 'Yukon', NU: 'Nunavut',
}

// #146 显示用省名(Frank「中韩用户只看英文难理解」,拍板英文在前):中韩界面出「Ontario(安大略省)」,
// 英文界面译名==英文名故只出英文。**只用于显示**——筛选值仍是 PROV_NAMES 的英文全名(fProv/深链/保存的筛选都依赖它)
// localeOnly:只出界面语言的省名(Frank 2026-08-16「中文模式只显示中文即可」)。
// <option> 里没有灰字小注这一手,「Ontario(安大略省)」在下拉里就是一行两遍——中文界面出中文名即可。
export const provName = (t: TFn, code: string, localeOnly = false): string => {
  const c = (code || '').toUpperCase()
  const en = PROV_NAMES[c] || code || ''
  const loc = t('prov.' + c)
  const has = loc && loc !== 'prov.' + c && loc !== en
  return has ? (localeOnly ? loc : `${en}(${loc})`) : en
}

// 地点已由清洗脚本(04c)规范化进库,这里直接读结构化字段(省码→全称仅用于显示)
export const parseLoc = (j: JobRow): { country: string; prov: string; city: string; district: string } => ({
  country: j.country || (j.province ? 'Canada' : ''),
  prov: PROV_NAMES[(j.province || '').toUpperCase()] || j.province || '',
  city: j.city || '',
  district: j.district || '',
})

export const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

// 地点各级的地图查询串(单一来源;表格格与手机卡共用)。各级只查自己那一级(点省看省、点市看市),
// **省一律用全称**:省码 NL 既是纽芬兰也是荷兰国家码,单查会跳欧洲(#175 实测),全称无歧义。
export const mapQuery = (field: ColKey, j: JobRow): string => {
  const L = parseLoc(j)
  return field === 'province' ? [L.prov, 'Canada'].filter(Boolean).join(', ')
    : field === 'city' ? [L.city, L.prov, 'Canada'].filter(Boolean).join(', ')
    : field === 'country' ? (L.country || 'Canada')
    : field === 'district' ? [L.district, L.city, L.prov].filter(Boolean).join(', ')
    : [j.address || L.district, L.city, L.prov].filter(Boolean).join(', ')
}

/**
 * 模型给的省码 → 认得出的留下,认不出的丢掉(**不猜**),并且**去重**。
 *
 * 🔴 2026-08-20 收拢时发现两个域各有一份,而且**行为不一样**:
 * `lib/agent` 那份不去重、`lib/consult` 那份去重 —— 同一句「BC 和 BC」两条链给出不同的
 * 目标省清单。收成一份,口径取**去重**那一版:重复的省码进 `targetProvinces` 会重复计数、
 * 出重复行,而「他说了两遍」不是「他想去两次」。
 *
 * 白名单是 `ALL_PROVS`(九个 PNP 省 + QC)—— 两边本来就都用它,这一层没岔。
 */
export function cleanProvs(input: { raw?: string[] }): string[] {
  const kept: string[] = []
  for (const one of input.raw ?? []) {
    const prov = one.trim().toUpperCase()
    if (ALL_PROVS.has(prov) && !kept.includes(prov)) kept.push(prov)
  }
  return kept
}
