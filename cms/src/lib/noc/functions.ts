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

import { firstOf, queryRows, SQL, text } from '../db'
import {
  BROAD_COLOR, DUTY_HITS_MAX, DUTY_SCAN_ROWS, KEY_BROAD, KEY_CAT, LANG_KO, LANG_ZH, LIKE_ANY, LIKE_ESCAPE, LIKE_SPECIAL_RE,
  LINE_SEP, NA, NAME_NONE, RANK_EXACT, RANK_EXAMPLE, RANK_START, RANK_TITLE,
} from './constants'
import { CACHE } from './variables'
import type {
  Cat, CatLabelRows, CatNameIn, MaybeBroad, NocDutiesIn, NocDutiesOut, NocDutiesRow, NocDutyHits, NocDutyHitsIn, NocDutyLines, NocDutyRankIn,
  NocDutyRanked, NocDutyRow, NocDutySearchIn, NocDutySearchOut, NocLocalTitleIn, PickNameIn, Row,
} from './types'

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
    return NAME_NONE
  }
  if (input.lang === LANG_ZH) {
    return n.titleZh || NAME_NONE
  }
  if (input.lang === LANG_KO) {
    return n.titleKo || NAME_NONE
  }
  return NAME_NONE
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
    return NAME_NONE
  }
  if (input.lang === LANG_ZH) {
    return f.titleZhShort || f.titleZh || f.title || NAME_NONE
  }
  if (input.lang === LANG_KO) {
    return f.titleKoShort || f.titleKo || f.title || NAME_NONE
  }
  return f.titleEnShort || f.title || NAME_NONE
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

/**
 * NOC 官方职责/任职要求（英文单语，懒翻译的源）。
 *
 * @param input 连接与职业码。
 * @returns 两段英文；查无这条是 null。
 */
export async function loadNocDuties(input: NocDutiesIn): NocDutiesOut {
  const rows = await queryRows({ db: input.db, sql: SQL.NOC_DUTIES_BY_CODE, params: [input.noc], map: toNocDutiesRow })
  return firstOf(rows)
}

/**
 * 生成简历「导入职责」:按职位名找职业(职业名或示例职位名里含这个词、且有职责原文的;排序另做)。
 *
 * @param input 连接与检索词。
 * @returns 命中的行(未排序)。
 */
export async function loadNocDutyRows(input: NocDutySearchIn): NocDutySearchOut {
  const like = LIKE_ANY + input.q.replace(LIKE_SPECIAL_RE, LIKE_ESCAPE) + LIKE_ANY
  return queryRows({ db: input.db, sql: SQL.NOC_DUTY_SEARCH, params: [like, DUTY_SCAN_ROWS], map: toNocDutyRow })
}

/**
 * 搜到的行排档取前几个:一字不差 → 开头相同 → 职业名含 → 只有示例名含;同档按职业码。
 *
 * @param x 库里捞回的行与检索词。
 * @returns 前几个职业(职责拆成一条一项)。
 */
export function nocDutyHitsOf(x: NocDutyHitsIn): NocDutyHits {
  const q = x.q.toLowerCase()
  const ranked: NocDutyRanked[] = []
  for (const row of x.rows) {
    ranked.push(rankedOf({ row, q }))
  }
  ranked.sort(byDutyRank)
  const out: NocDutyHits = []
  for (const r of ranked.slice(0, DUTY_HITS_MAX)) {
    out.push({ noc: r.row.noc, title: r.row.title, hit: r.hit, duties: dutyLinesOf(r.row.duties) })
  }
  return out
}

/**
 * 一行排哪一档、命中的是哪个名字(职业名与各示例职位名里挑档最靠前的那个)。
 *
 * @param x 一行与小写检索词。
 * @returns 排过档的行。
 */
function rankedOf(x: NocDutyRankIn): NocDutyRanked {
  let best: NocDutyRanked = { row: x.row, rank: RANK_EXAMPLE, hit: x.row.title }
  const title = x.row.title.toLowerCase()
  if (title === x.q) {
    return { row: x.row, rank: RANK_EXACT, hit: x.row.title }
  }
  if (title.startsWith(x.q)) {
    best = { row: x.row, rank: RANK_START, hit: x.row.title }
  } else if (title.includes(x.q)) {
    best = { row: x.row, rank: RANK_TITLE, hit: x.row.title }
  }
  let firstExample = NAME_NONE
  for (const raw of x.row.examples.split(LINE_SEP)) {
    const ex = raw.trim()
    const low = ex.toLowerCase()
    if (low === x.q) {
      return { row: x.row, rank: RANK_EXACT, hit: ex }
    }
    if (low.startsWith(x.q) && best.rank > RANK_START) {
      best = { row: x.row, rank: RANK_START, hit: ex }
    }
    if (low.includes(x.q) && firstExample === NAME_NONE) {
      firstExample = ex
    }
  }
  if (best.rank === RANK_EXAMPLE && firstExample !== NAME_NONE) {
    best = { row: x.row, rank: RANK_EXAMPLE, hit: firstExample }
  }
  return best
}

/**
 * 排档比较:档小的在前,同档按职业码。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 负数 a 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
function byDutyRank(a: NocDutyRanked, b: NocDutyRanked): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank
  }
  return a.row.noc.localeCompare(b.row.noc)
}

/**
 * 职责原文拆成一条一项(去头尾空格、丢空行)。
 *
 * @param duties 职责逐行文本。
 * @returns 各条。
 */
function dutyLinesOf(duties: string): NocDutyLines {
  const out: NocDutyLines = []
  for (const raw of duties.split(LINE_SEP)) {
    const line = raw.trim()
    if (line !== NAME_NONE) {
      out.push(line)
    }
  }
  return out
}

// =========================================================================
// 行构造器（rows 抽屉 2026-08-23 撤编后的固定尾段：db 词汇只许 to* 体内）
// =========================================================================

/**
 * 一行 NOC 职责/要求（SQL.NOC_DUTIES_BY_CODE）。
 *
 * @param r 库里的一行。
 * @returns 两段英文（缺位空串）。
 */
export function toNocDutiesRow(r: Row): NocDutiesRow {
  return { duties: text(r.duties), requirements: text(r.requirements) }
}

/**
 * 一行「导入职责」搜职业(SQL.NOC_DUTY_SEARCH)。
 *
 * @param r 库里的一行。
 * @returns 四格(缺位空串)。
 */
export function toNocDutyRow(r: Row): NocDutyRow {
  return { noc: text(r.noc), title: text(r.title), duties: text(r.duties), examples: text(r.examples) }
}
