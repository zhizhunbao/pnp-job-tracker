/**
 * NOC 显示域的行为:分类名取译、职业名译名与短名判定、大分类配色。
 * 分类名/层级由 ETL 算好存在 job 字段上,前端不再用 NOC 码现算 ——
 * 单一来源在数据层,这里只负责怎么显示。
 *
 * pickName(2026-08-02,原 lib/occName):各语言先用库里的短名,没有再回退完整译名/官方名。
 * 短名从哪来:ETL `clean/04g_short_noc_titles.py`(本地模型压缩 + 撞车检测 + 人工裁决表)
 * → `noc_descriptions.title_{zh,ko,en}_short`。**官方英文 title 一个字都不动**,短名是另外的列;
 * 前端不做截断 —— 截字符串是清洗,清洗归数据层(CLAUDE.md)。
 * (2026-08-22 Frank 拍板并入本域:occName 单独立域是瞎切 —— 它就是 NOC 的显示名判定。)
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { BROAD_COLOR, KEY_BROAD, KEY_CAT, LANG_KO, LANG_ZH, NA } from './constants'
import { CACHE } from './variables'
import type { Cat, CatLabelRows, CatNameIn, MaybeBroad, NocLocalTitleIn, PickNameIn } from './types'

/**
 * 页面拿到 dims 时把维度表的英/韩分类名登记进本域缓存(catName 优先查它)。
 *
 * @param rows noc_categories 维度行。
 * @returns 无(写进 variables.CACHE.labels)。
 */
export function registerCatLabels(rows: CatLabelRows): void {
  for (const r of rows) {
    if (r.broad != null && r.broad !== '' && (r.broadEn != null || r.broadKo != null)) {
      CACHE.labels[r.broad] = { en: r.broadEn, ko: r.broadKo }
    }
    if (r.mid != null && r.mid !== '' && (r.midEn != null || r.midKo != null)) {
      CACHE.labels[r.mid] = { en: r.midEn, ko: r.midKo }
    }
    if (r.fine != null && r.fine !== '' && (r.fineEn != null || r.fineKo != null)) {
      CACHE.labels[r.fine] = { en: r.fineEn, ko: r.fineKo }
    }
  }
}

/**
 * 中/小分类显示名(值仍是数据层中文,筛选/查询语义不变)。
 * 登记表查不到才退回老路:cat.* → broad.*(老值仍在库里)→ 原值。
 *
 * @param input 取词函数与数据层分类值。
 * @returns 界面语言下的分类名。
 */
export function catName(input: CatNameIn): string {
  let lang: string = LANG_ZH
  if (input.t.lang != null) {
    lang = input.t.lang
  }
  if (lang !== LANG_ZH) {
    const row = CACHE.labels[input.value]
    if (row != null) {
      let hit: string | null = null
      if (lang === LANG_KO) {
        if (row.ko != null) {
          hit = row.ko
        }
      } else if (row.en != null) {
        hit = row.en
      }
      if (hit != null && hit !== '') {
        return hit
      }
    }
  }
  for (const k of [KEY_CAT + input.value, KEY_BROAD + input.value]) {
    const s = input.t(k)
    if (s !== k) {
      return s
    }
  }
  return input.value
}

/**
 * #147:界面语言下的职业名完整译名(英文界面/无译名 → 空串,调用方不渲染灰注)。
 * 英文名永远是主文案(Frank 拍板「英文在前」)。
 *
 * @param input 职业名行与语言。
 * @returns 译名;没有则空串。
 */
export function nocLocalTitle(input: NocLocalTitleIn): string {
  const n = input.row
  if (n == null) {
    return ''
  }
  if (input.lang === LANG_ZH) {
    return n.titleZh || ''
  }
  if (input.lang === LANG_KO) {
    return n.titleKo || ''
  }
  return ''
}

/**
 * 界面语言下的职业显示名:短名 → 完整译名 → 官方英文名,一路回退;没有行给空串。
 *
 * @param input 名字行与语言。
 * @returns 显示名;没有则空串。
 */
export function pickName(input: PickNameIn): string {
  const f = input.row
  if (f == null) {
    return ''
  }
  if (input.lang === LANG_ZH) {
    return f.titleZhShort || f.titleZh || f.title || ''
  }
  if (input.lang === LANG_KO) {
    return f.titleKoShort || f.titleKo || f.title || ''
  }
  return f.titleEnShort || f.title || ''
}

/**
 * 大分类配色(查不到给中性色)。
 *
 * @param broad 大分类值;没有则 null。
 * @returns 配色。
 */
export function colorOf(broad: MaybeBroad): Cat {
  if (broad == null || broad === '') {
    return NA
  }
  const hit = BROAD_COLOR[broad]
  if (hit == null) {
    return NA
  }
  return hit
}
