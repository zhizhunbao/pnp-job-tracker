/**
 * 分值:按**官方分值表**给一份档案算分。
 *
 * 两个省的官方分值表结构完全不同(BC SIRS 200 分制有时薪 / 地区,SK SINP 110 分制有年龄 / 二语),
 * 但用户只想填**一套**自己的条件,然后看「哪个省更快」。所以这里做的是
 * 一套用户条件 → 各省官方档位 → 各省估分。
 *
 * 硬约束(别放宽):
 *   ① **分值一分都不许在这里编** —— 全部来自 `pnp_score_factors`(官方分值表抓取入库);
 *      本域只负责「你选的条件对应官方表的哪一行」,分数照抄那一行的 `points`;
 *   ② 匹配尽量**从官方标签自身解析数字**(年数、CLB、年龄区间),不写死分值表内容 ——
 *      官方改版加一档,这里自动跟着走;
 *   ③ 学历没有数字可解析,用关键词阶梯定级 —— 那是**显示层映射**,所以 UI 必须把命中的
 *      官方原文标签显出来,让用户自己核对;
 *   ④ 组上限(SK FACTOR I=80 / II=30)按官方封顶,任何勾选组合都不会算出超过官方的分。
 *
 * @author Frank
 * @time 2026-08-20 22:10:00
 *
 * 尾段注(rows 抽屉 2026-08-23 撤编并入):🔴 数字一律走 db 的 `numOrNull` ——
 * pnp_draws 的 score/invitations 与分值表的 points 都是 numeric,pg 直连交回来是
 * **字符串**;并入前经 Payload Local API 拿到的是数字 —— 一套词汇两条路都对
 * (jobs 域老坑:`typeof x === 'number'` 换路后整列静默判 null)。
 */

import { fail, POINTS_ERR } from '../error'
import { queryRowsOrEmpty, SQL, count, jsonOrNull, numOrNull, text } from '../db'
import type { Db } from '../db'
import { CACHE } from './variables'
import {
  AGE_AND_OLDER, AGE_LESS_THAN, AGE_MAX, AGE_MORE_THAN, AGE_ONE, AGE_RANGE, AT_LEAST, AUTO_FACTOR, CLB_ANY, CLB_ZERO,
  CRS_COMBO_TIER, CRS_EDU_SPECIAL, CRS_EDU_YEARS, CRS_STUDY_LONG_YEARS, CRS_STUDY_SHORT_YEARS, CRS_SUB_TIER,
  DEFAULT_SELF, EDU, EDU_LADDER, EDU_RANK, EE_AGE_AND_OLDER, EE_AGE_BARE, EE_AGE_EXACT, EE_AGE_MAX, EE_AGE_OR_LESS,
  EE_AGE_OR_MORE, EE_AGE_RANGE, EE_AGE_UNDER, EE_CLB_AT_LEAST, EE_CLB_BELOW, EE_CLB_MAX, EE_CLB_ONE, EE_CLB_OR_LESS,
  EE_CLB_OR_MORE, EE_CLB_RANGE, EE_COL_SPEAKING, EE_COL_WITHOUT_SPOUSE, EE_COL_WITH_SPOUSE, EE_CRIT_CANADA_STUDY,
  EE_CRIT_PAST_STUDY, EE_CRIT_PAST_WORK, EE_CRIT_STUDY_LONG, EE_CRIT_STUDY_SHORT, EE_FACTOR, EE_HEAD_CANADA_EXP,
  EE_HEAD_FIRST_LANG, EE_HEAD_FOREIGN_EXP, EE_HEAD_GOOD_LANG, EE_KEY, EE_KIND_DETAIL, EE_LABEL, EE_NOTE, EE_SECTION,
  EE_YEARS_MAX, EE_YEARS_NONE, EE_YEARS_ONE, EE_YEARS_OR, EE_YEARS_OR_MORE, EE_YEARS_RANGE, FSW_ADAPT_STUDY_YEARS,
  FSW_ADAPT_WORK_MONTHS, FSW_EDU_PLUS, FSW_EDU_SPECIAL, FSW_EDU_YEARS, GRID, GRID_STREAM, GROUP_NONE, ITEM_STATUS, KIND,
  LANG_ABILITIES, LESS_THAN_ANY, LESS_THAN_HEAD, LINE, MATCHED_MAX, MATCHED_NONE, MB, MB_ADAPT_RE, MB_AGE_BARE,
  MB_AGE_OR_OLDER, MB_AGE_RANGE, MB_CLB, MB_CTX, MB_CTX_SEP, MB_EDU, MB_EDU_ONE_YEAR, MB_EDU_RE, MB_EDU_TWO_YEARS,
  MB_FACTOR, MB_JOIN, MB_LABEL_NONE, MB_NOTE, MB_NOTE_NONE, MB_RISK_RE, MB_WORK_LESS, MB_WORK_WORD, MONTHS_ANY,
  MONTHS_PER_YEAR, NON_ALPHA, NO_EXPERIENCE, PROGRAM_YEARS, SEP, SOURCE, STREAM_NONE, STREAM_STOP, STREAM_WORD_MIN,
  SUB_TIER_VALUE, SYSTEM_TAIL, SYSTEM_TAIL_CUT, TICK_SEP, WORD, WORD_NUM, YEARS_ANY, PNP_PROV_CODES, RECENT_ROUNDS,
  SCORE_TTL_MS, COMP_KEY, MONTH_NUM, PERIOD_SEP,
} from './constants'
import type {
  AdaptItemIn, AdaptOut, AgeRangeOut, AutoPickIn, BonusPointsIn, BonusPointsOut, ComboItemIn, ComboSubTierIn,
  ComboSubTierOut, ComboTierOfIn, ComboTierOfOut, CompetitionExtrasIn, DefaultProfileOut, DifficultyFact, DrawFact,
  DrawFacts, DrawRow, DrawRows, EduComboIn, EduSpecialOfIn, EduSpecialOfOut, EduYearsOut, EeEvidenceOfIn,
  EeEvidenceOfOut, EeGridRow, EstimateIn, EstimateItem, EstimateItemIn, EstimateItemOut, EstimateMbEoiIn,
  EstimateMbEoiOut, EstimateOut, ExtrasMap, FactorPartIn, FactorPartOut, ForeignComboIn, FswPickerIn, FswRowsOfIn,
  FswRowsOfOut, GroupCapIn, GroupCapOut, HasAutoPickOut, HitItemIn, LabelIn, LabelNumOut, LineSideOut, LineStateOut,
  MarginOut, MatchIn, MaybeCompetition, MbAgePickIn, MbBandsIn, MbBandsOut, MbConnectionPicksIn,
  MbConnectionPicksOut, MbEduReOfIn, MbEduReOfOut, MbLangPickIn, MbLangPickOut, MbMaxPointsIn, MbMaxPointsOut,
  MbPartIn, MbPartOut, MbPick, MbRiskTicksIn, MbRiskTicksOut, MbRowOut, MbRowsOfIn, MbScorePart, MbThresholdRow,
  MbWorkPickIn, MbWorkYearsOut, MonthsToYearsIn, MonthsToYearsOut, NeedRowIn, NeedRowOut, NeedsInfoItemIn,
  NeedsInfoOfIn, NeedsInfoOfOut, OneGroup, OneGroupOut, OverviewDraws, PickBestTierIn, PickBestTierOut, PickByAgeIn,
  PickByRangeIn, PickByRangeOut, PickByThresholdIn, PickEduRowIn, PickOut, PickStudyTierIn, PickerIn,
  ProvCompetitions, ProvHitFn, ProvInfoFacts, ProvKeyed, ProvSet, RangeGroup, RangeGroupOut, RangeOut, RowsOfIn,
  RowsOfOut, ScoreFactor, ScoreFactors, ScoreLineIn, ScorePart, ScoreProvinceIn, ScoreProvinceOut, ScoreSource,
  ScoreTablesOut, StrList, StreamMatchesIn, StreamMatchesOut, StreamWordsIn, StreamWordsOut, SumPointsIn,
  SumPointsOut, SystemIn, SystemOut, ThresholdRow, TierRow, TotalOfIn, TotalOfOut, WordGroup, WordGroupOut,
  DifficultyDbRow, FlowSeriesEntryJson, MaybeCompFactor, MaybeDifficulty, MaybeFlow, MaybeNum, MaybeProvInfo,
  MaybeSeries, NumCell, ProvFlowYear, ProvInfoDbRow, ProvInfoExtra, ProvInfoFact, ProvInfoJson, ProvQuotaYears,
  ProvStockYear, Row, ProvCompetition,
} from './types'
// =========================================================================
// 0. 正则的具名捕获组
// =========================================================================

/**
 * 读一个只有单个捕获组的正则。
 *
 * 🔴 **全域只有这三个函数碰得到 `m.groups`**,理由:具名捕获组在类型系统里只有
 * `Record<string, string>` —— 到底有没有 `n` / `low` / `high`,由正则**字面量**决定,
 * 编译器看不见。所以断言收在这三处,别处拿到的已经是本域自己的形状。
 *
 * 这也是「**禁止下标取值**」的落点:`m[2]` 读不出那是上界还是别的什么,
 * 而下标写错不会报错,只会算出一个看起来很合理的错值(2026-08-20 Frank 立)。
 *
 * @param input 正则与要匹的那段字。
 * @returns 那一格;没命中则 null。
 */
function oneGroupOf(input: MatchIn): OneGroupOut {
  const m = input.re.exec(input.text)
  if (m == null || m.groups == null) {
    return null
  }
  return m.groups as OneGroup
}

/**
 * 读一个一头一尾两个捕获组的正则。
 *
 * @param input 正则与要匹的那段字。
 * @returns 上下界;没命中则 null。
 */
function rangeGroupOf(input: MatchIn): RangeGroupOut {
  const m = input.re.exec(input.text)
  if (m == null || m.groups == null) {
    return null
  }
  return m.groups as RangeGroup
}

/**
 * 读一个捕获拼写单词的正则。
 *
 * @param input 正则与要匹的那段字。
 * @returns 那个单词;没命中则 null。
 */
function wordGroupOf(input: MatchIn): WordGroupOut {
  const m = input.re.exec(input.text)
  if (m == null || m.groups == null) {
    return null
  }
  return m.groups as WordGroup
}

// =========================================================================
// 1. 通道名匹配
// =========================================================================

/**
 * 通道名切成实词:小写、非字母当分隔、丢掉虚词与两字母以下的碎片。
 *
 * @param s 通道名。
 * @returns 实词。
 */
function streamWords(s: StreamWordsIn): StreamWordsOut {
  const out: string[] = []
  for (const w of (s || STREAM_NONE).toLowerCase().replace(NON_ALPHA, SEP.space).split(SEP.space)) {
    if (w.length > STREAM_WORD_MIN && STREAM_STOP.includes(w as typeof STREAM_STOP[number]) === false) {
      out.push(w)
    }
  }
  return out
}

/**
 * 抽选那一次说的是不是分值表这条通道。
 *
 * 🔴 **BC 现行是按通道分别设线**(近 12 次里 Build 97 / Care: Health 96 / Innovate 132 /
 * 偏远医疗 50),拿最近一次的 50 去比一个木匠的分是错的对照。所以先按通道名匹配,
 * 匹配不上就不给差分结论。
 *
 * 两边写法不同 → 取实词做**子集**判断,不做字面相等。
 *
 * @param input 抽选侧与分值表侧的通道名。
 * @returns 对得上则 true。
 */
export function streamMatches(input: StreamMatchesIn): StreamMatchesOut {
  const a = streamWords(input.drawStream)
  const b = streamWords(input.gridStream)
  if (a.length === 0 || b.length === 0) {
    return false
  }
  for (const w of a) {
    if (b.includes(w) === false) {
      return false
    }
  }
  return true
}

/**
 * 打分表自报的通道名:`system` 结尾括号里那一段。
 *
 * @param system 分制全名。
 * @returns 通道名;没自报则空。
 */
export function gridStreamOf(system: SystemIn): SystemOut {
  const hit = oneGroupOf({ re: GRID_STREAM, text: system })
  if (hit == null || hit.n == null) {
    return STREAM_NONE
  }
  return hit.n
}

/**
 * 显示用的分制短名:去掉自报通道的括号(整串印在句子里太长)。
 *
 * @param system 分制全名。
 * @returns 短名。
 */
export function systemShort(system: SystemIn): SystemOut {
  return system.replace(SYSTEM_TAIL, SYSTEM_TAIL_CUT)
}

// =========================================================================
// 2. 从官方标签里解析可比较的数字
// =========================================================================

/**
 * 年数档:「5 or more years」5 /「At least 4 but less than 5 years」4 /「4 years」4 /
 * 「Less than 1 year」0。
 *
 * ⚠️ 判断顺序不能调:「At least 3 but less than 4 years」里有两个数字,先跑通用正则会取到 4
 * (实撞过,3 年经验被判成 2-3 年那档少算 4 分)—— 必须先认「At least N」。
 *
 * @param label 官方原文标签。
 * @returns 这一档的年数下界;读不出则 null。
 */
function yearsOf(label: LabelIn): LabelNumOut {
  if (NO_EXPERIENCE.test(label)) {
    return 0
  }
  if (LESS_THAN_HEAD.test(label)) {
    return 0
  }
  const at = oneGroupOf({ re: AT_LEAST, text: label })
  if (at) {
    return Number(at.n)
  }
  const any = oneGroupOf({ re: YEARS_ANY, text: label })
  if (any == null) {
    return null
  }
  return Number(any.n)
}

/**
 * 月数档(AB EOI 按月计经验):「12 or more months」12 /「6-11 months」6 /
 * 「Less than 6 months」0。
 *
 * @param label 官方原文标签。
 * @returns 这一档的月数下界;读不出则 null。
 */
function monthsOf(label: LabelIn): LabelNumOut {
  if (LESS_THAN_ANY.test(label)) {
    return 0
  }
  const m = oneGroupOf({ re: MONTHS_ANY, text: label })
  if (m == null) {
    return null
  }
  return Number(m.n)
}

/**
 * CLB 档:「9+」9 /「CLB 8 and higher」8 /「8」8 /「Below 4…」「Not Applicable」
 * 「without language test」0。
 *
 * @param label 官方原文标签。
 * @returns 这一档的 CLB 下界;读不出则 null。
 */
function clbOf(label: LabelIn): LabelNumOut {
  if (CLB_ZERO.test(label)) {
    return 0
  }
  const m = oneGroupOf({ re: CLB_ANY, text: label })
  if (m == null) {
    return null
  }
  return Number(m.n)
}

/**
 * 学历档:一条标签命中多个关键词时取**最低**的那档。
 *
 * SK 的「Master's or Doctorate degree」是硕博同一行,硕士就该能选中它。
 *
 * @param label 官方原文标签。
 * @returns 这一档的学历等级;读不出则 null。
 */
function eduRankOf(label: LabelIn): LabelNumOut {
  let low: number | null = null
  for (const one of EDU_LADDER) {
    if (one.re.test(label) === false) {
      continue
    }
    if (low == null || one.rank < low) {
      low = one.rank
    }
  }
  return low
}

/**
 * 年龄区间:「Less than 18 years」[0,17] /「22 – 34 years」[22,34] /
 * 「More than 50 years」[51,∞] /「50 years and older」[50,∞](AB EOI 的写法)。
 *
 * @param label 官方原文标签。
 * @returns 闭区间;读不出则 null。
 */
function ageRangeOf(label: LabelIn): AgeRangeOut {
  const under = oneGroupOf({ re: AGE_LESS_THAN, text: label })
  if (under) {
    return { from: 0, to: Number(under.n) - 1 }
  }
  const older = oneGroupOf({ re: AGE_AND_OLDER, text: label })
  if (older) {
    return { from: Number(older.n), to: AGE_MAX }
  }
  const above = oneGroupOf({ re: AGE_MORE_THAN, text: label })
  if (above) {
    return { from: Number(above.n) + 1, to: AGE_MAX }
  }
  const span = rangeGroupOf({ re: AGE_RANGE, text: label })
  if (span) {
    return { from: Number(span.low), to: Number(span.high) }
  }
  const exact = oneGroupOf({ re: AGE_ONE, text: label })
  if (exact == null) {
    return null
  }
  return { from: Number(exact.n), to: Number(exact.n) }
}

// =========================================================================
// 3. 挑档
// =========================================================================

/**
 * 在档位里选「阈值 ≤ 你的值」中**最高**的那条。
 *
 * 🔴 全都比你高 = 该因素 0 分,**不能白送最低档分数**。
 *
 * @param input 档位行、读阈值的那把尺与他自己的值。
 * @returns 命中的那一行;没有则 null。
 */
function pickByThreshold(input: PickByThresholdIn): PickOut {
  const scored: ThresholdRow[] = []
  for (const r of input.rows) {
    const th = input.thresholdOf(r.label)
    if (th != null) {
      scored.push({ r: r, th: th })
    }
  }
  if (scored.length === 0) {
    return null
  }
  let best: ThresholdRow | null = null
  for (const x of scored) {
    if (x.th > input.want) {
      continue
    }
    if (best == null || x.th > best.th) {
      best = x
    }
  }
  if (best == null) {
    return null
  }
  return best.r
}

/**
 * 年龄按区间挑档,**取第一条命中的**(官方表的区间不重叠)。
 *
 * @param input 年龄那几行与他的年龄。
 * @returns 命中的那一行;没有则 null。
 */
function pickByAge(input: PickByAgeIn): PickOut {
  for (const r of input.rows) {
    const range = ageRangeOf(r.label)
    if (range && input.age >= range.from && input.age <= range.to) {
      return r
    }
  }
  return null
}

/**
 * 每个官方因素怎么从档案取值。
 *
 * BC 的 `work` 是「同职业总年数」；SK 把它拆成近 5 年与 6-10 年两块相加;
 * AB 的总经验按**月**分档，档案存年,这里换算(年取的是下界,换算后仍保守)。
 *
 * 没登记的因素返回 null —— 由调用方当「手动 / 自动项」处理,**不猜**。
 *
 * @param input 因素名、该因素的档位行与他自报的条件。
 * @returns 命中的那一行;没登记或没命中则 null。
 */
function autoPick(input: AutoPickIn): PickOut {
  const p = input.profile
  const rows = input.rows
  if (input.factor === AUTO_FACTOR.work) {
    return pickByThreshold({ rows: rows, thresholdOf: yearsOf, want: p.expRecent + p.expOlder })
  }
  if (input.factor === AUTO_FACTOR.work5) {
    return pickByThreshold({ rows: rows, thresholdOf: yearsOf, want: p.expRecent })
  }
  if (input.factor === AUTO_FACTOR.work610) {
    return pickByThreshold({ rows: rows, thresholdOf: yearsOf, want: p.expOlder })
  }
  if (input.factor === AUTO_FACTOR.workMonths) {
    return pickByThreshold({
      rows: rows, thresholdOf: monthsOf, want: (p.expRecent + p.expOlder) * MONTHS_PER_YEAR,
    })
  }
  if (input.factor === AUTO_FACTOR.education) {
    return pickByThreshold({ rows: rows, thresholdOf: eduRankOf, want: EDU_RANK[p.edu] })
  }
  if (input.factor === AUTO_FACTOR.language || input.factor === AUTO_FACTOR.language1) {
    return pickByThreshold({ rows: rows, thresholdOf: clbOf, want: p.clb1 })
  }
  if (input.factor === AUTO_FACTOR.language2) {
    return pickByThreshold({ rows: rows, thresholdOf: clbOf, want: p.clb2 })
  }
  if (input.factor === AUTO_FACTOR.age) {
    return pickByAge({ rows: rows, age: p.age })
  }
  return null
}

/**
 * 这个因素本域登记过自动匹配吗。
 *
 * @param input 因素名(其余两格不看)。
 * @returns 登记过则 true。
 */
function hasAutoPick(input: AutoPickIn): HasAutoPickOut {
  for (const name of Object.values(AUTO_FACTOR)) {
    if (name === input.factor) {
      return true
    }
  }
  return false
}

// =========================================================================
// 4. 算一个省的分
// =========================================================================

/**
 * 没答的项一律从最低档起算的那份档案。
 *
 * @returns 默认档案。
 */
export function defaultProfile(): DefaultProfileOut {
  return {
    edu: DEFAULT_SELF.edu, expRecent: DEFAULT_SELF.expRecent, expOlder: DEFAULT_SELF.expOlder,
    clb1: DEFAULT_SELF.clb1, clb2: DEFAULT_SELF.clb2, age: DEFAULT_SELF.age,
  }
}

/**
 * 算一个省的估分。
 *
 * @param input 官方分值表、省码、他自报的条件、手动项、勾选与自动匹配白名单。
 * @returns 该省估分;这个省没有分值表则 null。
 */
export function scoreProvince(input: ScoreProvinceIn): ScoreProvinceOut {
  const all: ScoreFactor[] = []
  for (const f of input.factors) {
    if (f.province === input.province) {
      all.push(f)
    }
  }
  if (all.length === 0) {
    return null
  }
  const head = all[0]

  const names: string[] = []
  for (const f of all) {
    if (names.includes(f.factor) === false) {
      names.push(f.factor)
    }
  }
  const parts: ScorePart[] = []
  for (const name of names) {
    parts.push(factorPart({
      all: all, name: name, province: input.province, profile: input.profile,
      overrides: input.overrides, ticks: input.ticks, only: input.only,
    }))
  }

  const total = totalOf({ parts: parts, all: all })
  let maxTotal = 0
  let capped = total
  if (head.maxTotal != null) {
    maxTotal = head.maxTotal
    capped = Math.min(total, head.maxTotal)
  }
  return {
    province: input.province, system: head.system, maxTotal: maxTotal,
    passMark: head.passMark, url: head.url, guideEffective: head.guideEffective,
    fetched: head.fetched, parts: parts, total: capped,
  }
}

/**
 * 一个因素算出来的那一块分。
 *
 * 取分次序:手动项优先 → 登记过自动匹配且在白名单内就查表 →
 * **都不是就交给 UI 勾**：本域没登记映射的档位块一律不猜,由用户自己选。
 * 加分项无论走哪一支都要加上,并按因素封顶。
 *
 * @param input 该省全部分值行、因素名、省码、档案、手动项、勾选与白名单。
 * @returns 那一块分。
 */
function factorPart(input: FactorPartIn): FactorPartOut {
  const mine: ScoreFactor[] = []
  for (const f of input.all) {
    if (f.factor === input.name) {
      mine.push(f)
    }
  }
  const rows = rowsOf({ rows: mine, kind: KIND.row })
  const bonusRows = rowsOf({ rows: mine, kind: KIND.bonus })
  let group = GROUP_NONE
  let max = 0
  if (mine.length > 0) {
    group = mine[0].factorGroup || GROUP_NONE
    if (mine[0].factorMax != null) {
      max = mine[0].factorMax
    }
  }

  const ov = input.overrides[input.name]
  let pts = 0
  let matched = MATCHED_NONE
  let source: ScoreSource = SOURCE.profile
  const auto: AutoPickIn = { factor: input.name, rows: rows, profile: input.profile }
  if (ov) {
    pts = ov.pts
    matched = ov.matched
    source = ov.source
  } else if (hasAutoPick(auto) && rows.length > 0 && (input.only == null || input.only.has(input.name))) {
    const hit = autoPick(auto)
    if (hit != null) {
      if (hit.points != null) {
        pts = hit.points
      }
      matched = hit.label
    }
  } else if (rows.length > 0) {
    source = SOURCE.tick
  }
  if (bonusRows.length > 0) {
    pts += bonusPoints({
      list: bonusRows, prefix: `${input.province}${TICK_SEP}${input.name}`, ticks: input.ticks,
    })
    if (ov == null) {
      source = SOURCE.tick
    }
  }
  return {
    factor: input.name, pts: Math.min(pts, max || pts), max: max, matched: matched,
    group: group, source: source,
  }
}

/**
 * 按种类挑行。
 *
 * @param input 候选行与要哪一种。
 * @returns 那几行,保持原序。
 */
function rowsOf(input: RowsOfIn): RowsOfOut {
  const out: ScoreFactor[] = []
  for (const r of input.rows) {
    if (r.kind === input.kind) {
      out.push(r)
    }
  }
  return out
}

/**
 * 逐因素的分 → 合计。
 *
 * 组上限:官方给了 FACTOR I / II 各自的 Max(SK)→ **组内相加后封顶**;
 * 没分组的省(BC)按因素直接相加。
 *
 * @param input 逐因素的分与该省全部分值行。
 * @returns 合计(还没按满分封顶)。
 */
function totalOf(input: TotalOfIn): TotalOfOut {
  const groups = new Map<string, number>()
  let total = 0
  for (const p of input.parts) {
    if (p.group === '') {
      total += p.pts
      continue
    }
    let cur = 0
    const seen = groups.get(p.group)
    if (seen != null) {
      cur = seen
    }
    groups.set(p.group, cur + p.pts)
  }
  for (const [g, sum] of groups) {
    const cap = groupCap({ all: input.all, group: g })
    if (cap == null) {
      total += sum
    } else {
      total += Math.min(sum, cap)
    }
  }
  return total
}

/**
 * 某个官方分组封顶几分。
 *
 * @param input 该省全部分值行与分组名。
 * @returns 封顶;没封顶则 null。
 */
function groupCap(input: GroupCapIn): GroupCapOut {
  for (const f of input.all) {
    if (f.factorGroup === input.group) {
      return f.groupMax
    }
  }
  return null
}

/**
 * 加分项求和。
 *
 * 🔴 官方原文「…, or」标成 `xorPrev` 的相邻项是**二选一**,组内只算最大的一条。
 *
 * @param input 加分项行(保持官方原序)、键前缀与勾选状态。
 * @returns 合计。
 */
export function bonusPoints(input: BonusPointsIn): BonusPointsOut {
  const list = input.list
  let sum = 0
  let groupBest = 0
  let inGroup = false
  for (let i = 0; i < list.length; i += 1) {
    const b = list[i]
    const on = Boolean(input.ticks[`${input.prefix}${TICK_SEP}${i}`])
    let bPts = 0
    if (b.points != null) {
      bPts = b.points
    }
    let mine = 0
    if (on) {
      mine = bPts
    }
    if (i + 1 < list.length && list[i + 1].xorPrev) {
      inGroup = true
      groupBest = Math.max(groupBest, mine)
      continue
    }
    if (b.xorPrev) {
      groupBest = Math.max(groupBest, mine)
      sum += groupBest
      groupBest = 0
      inGroup = false
      continue
    }
    if (inGroup) {
      sum += groupBest
      groupBest = 0
      inGroup = false
    }
    if (on) {
      sum += bPts
    }
  }
  return sum + groupBest
}

// =========================================================================
// 5. 联邦表:从官方标签解析区间
// =========================================================================

/**
 * 年龄区间。
 *
 * 兼容 CRS 的「40 years of age」「45 years of age or more」「20 to 29 years of age」
 * 与 FSW67 的「Under 18」「18-35」「47 and older」「36」这几种写法。
 *
 * @param label 官方原文。
 * @returns 闭区间;读不出则 null。
 */
function eeAgeRangeOf(label: LabelIn): RangeOut {
  const s = label.trim()
  const under = oneGroupOf({ re: EE_AGE_UNDER, text: s })
  if (under) {
    return { from: 0, to: Number(under.n) - 1 }
  }
  const orLess = oneGroupOf({ re: EE_AGE_OR_LESS, text: s })
  if (orLess) {
    return { from: 0, to: Number(orLess.n) }
  }
  const orMore = oneGroupOf({ re: EE_AGE_OR_MORE, text: s })
  if (orMore) {
    return { from: Number(orMore.n), to: EE_AGE_MAX }
  }
  const older = oneGroupOf({ re: EE_AGE_AND_OLDER, text: s })
  if (older) {
    return { from: Number(older.n), to: EE_AGE_MAX }
  }
  const span = rangeGroupOf({ re: EE_AGE_RANGE, text: s })
  if (span) {
    return { from: Number(span.low), to: Number(span.high) }
  }
  const exact = oneGroupOf({ re: EE_AGE_EXACT, text: s })
  if (exact) {
    return { from: Number(exact.n), to: Number(exact.n) }
  }
  const bare = oneGroupOf({ re: EE_AGE_BARE, text: s })
  if (bare) {
    return { from: Number(bare.n), to: Number(bare.n) }
  }
  return null
}

/**
 * CLB 区间。
 *
 * 兼容 CRS 的「CLB 6」「CLB 4 or 5」「Less than CLB 4」「CLB 10 or more」
 * 与 FSW67 的「CLB level 9 or higher」「Below CLB level 7」
 * 「At least CLB 5 in all of the 4 abilities」。
 *
 * @param label 官方原文。
 * @returns 闭区间;读不出则 null。
 */
function eeClbRangeOf(label: LabelIn): RangeOut {
  const s = label.trim()
  const below = oneGroupOf({ re: EE_CLB_BELOW, text: s })
  if (below) {
    return { from: 0, to: Number(below.n) - 1 }
  }
  const orMore = oneGroupOf({ re: EE_CLB_OR_MORE, text: s })
  if (orMore) {
    return { from: Number(orMore.n), to: EE_CLB_MAX }
  }
  const atLeast = oneGroupOf({ re: EE_CLB_AT_LEAST, text: s })
  if (atLeast) {
    return { from: Number(atLeast.n), to: EE_CLB_MAX }
  }
  const orLess = oneGroupOf({ re: EE_CLB_OR_LESS, text: s })
  if (orLess) {
    return { from: 0, to: Number(orLess.n) }
  }
  const span = rangeGroupOf({ re: EE_CLB_RANGE, text: s })
  if (span) {
    return { from: Number(span.low), to: Number(span.high) }
  }
  const exact = oneGroupOf({ re: EE_CLB_ONE, text: s })
  if (exact) {
    return { from: Number(exact.n), to: Number(exact.n) }
  }
  return null
}

/**
 * 年数区间(整年档)。
 *
 * CRS 用「None or less than a year」「1 year」「5 years or more」;
 * FSW67 用「1 year」「2-3 years」「6 or more years」。
 *
 * @param label 官方原文。
 * @returns 闭区间;读不出则 null。
 */
function eeYearsRangeOf(label: LabelIn): RangeOut {
  const s = label.trim()
  if (EE_YEARS_NONE.test(s)) {
    return { from: 0, to: 0 }
  }
  const span = rangeGroupOf({ re: EE_YEARS_RANGE, text: s })
  if (span) {
    return { from: Number(span.low), to: Number(span.high) }
  }
  const either = rangeGroupOf({ re: EE_YEARS_OR, text: s })
  if (either) {
    return { from: Number(either.low), to: Number(either.high) }
  }
  const orMore = oneGroupOf({ re: EE_YEARS_OR_MORE, text: s })
  if (orMore) {
    return { from: Number(orMore.n), to: EE_YEARS_MAX }
  }
  const exact = oneGroupOf({ re: EE_YEARS_ONE, text: s })
  if (exact) {
    return { from: Number(exact.n), to: Number(exact.n) }
  }
  return null
}

/**
 * 月 → 整年(向下取整)。
 *
 * @param months 月数;没答则 null。
 * @returns 整年数;没答则 null。
 */
function monthsToYears(months: MonthsToYearsIn): MonthsToYearsOut {
  if (months == null) {
    return null
  }
  return Math.floor(months / MONTHS_PER_YEAR)
}

/**
 * 在候选行里挑「区间包含他的值」的**第一条**;找不到返回 null(**不猜**)。
 *
 * @param input 候选行、他的值与读区间的那把尺。
 * @returns 那一行;没有则 null。
 */
function pickByRange(input: PickByRangeIn): PickByRangeOut {
  for (const r of input.rows) {
    const rg = input.rangeOf(r.criterion)
    if (rg && input.want >= rg.from && input.want <= rg.to) {
      return r
    }
  }
  return null
}

/**
 * 攒一项估分。
 *
 * @param input 内部键、短名、分、命中原文、出处与判定态。
 * @returns 那一项。
 */
function estimateItem(input: EstimateItemIn): EstimateItemOut {
  return {
    factor: input.factor, label: input.label, points: input.points, matched: input.matched,
    evidence: input.evidence, status: input.status,
  }
}

/**
 * 命中那一行的出处。
 *
 * @param input 命中的那一行。
 * @returns 出处。
 */
function eeEvidenceOf(input: EeEvidenceOfIn): EeEvidenceOfOut {
  return {
    url: input.r.url, fetched: input.r.fetched,
    label: `${input.r.criterion}${SEP.dash}${input.r.pointsText}`,
  }
}

/**
 * 一项「判不了」。
 *
 * 缺输入、或查不到能用的行 —— **不猜**,让上游去反问。
 *
 * @param input 内部键与短名。
 * @returns 那一项。
 */
function needsInfoItem(input: NeedsInfoItemIn): EstimateItemOut {
  return estimateItem({
    factor: input.factor, label: input.label, points: 0, matched: MATCHED_NONE, evidence: null,
    status: ITEM_STATUS.needsInfo,
  })
}

/**
 * 命中官方行之后攒一项 —— 分从官方行抄,**大于 0 才算命中**,等于 0 是硬结论。
 *
 * @param input 内部键、短名、命中的行、分与命中原文。
 * @returns 那一项。
 */
function hitItem(input: HitItemIn): EstimateItemOut {
  let status: EstimateItem['status'] = ITEM_STATUS.zero
  if (input.points > 0) {
    status = ITEM_STATUS.matched
  }
  return estimateItem({
    factor: input.factor, label: input.label, points: input.points, matched: input.matched,
    evidence: eeEvidenceOf({ r: input.r }),
    status: status,
  })
}

/**
 * 门槛不超过他的值里**最高**的那一行;一档都够不到则 null。
 *
 * 并列时保留先出现的那一条(官方表的行序即优先序)。
 *
 * @param input 带门槛的候选行与他的值。
 * @returns 那一行;没有则 null。
 */
function pickBestTier(input: PickBestTierIn): PickBestTierOut {
  let best: TierRow | null = null
  for (const x of input.scored) {
    if (x.th > input.want) {
      continue
    }
    if (best == null || x.th > best.th) {
      best = x
    }
  }
  if (best == null) {
    return null
  }
  return best.r
}

// =========================================================================
// 6. CRS(排名分)
// =========================================================================

/**
 * CRS 学历档里能读出「几年制」的那几条。
 *
 * 只覆盖不带博士 / 硕士 / 高中字样的「N-year program」系列 —— 那三档按学位名认,见 `crsEduSpecial`。
 *
 * @param criterion 官方原文。
 * @returns 年数;这一条不按年数认则 null。
 */
function crsEduYearsOf(criterion: LabelIn): EduYearsOut {
  if (CRS_EDU_YEARS.one.test(criterion)) {
    return PROGRAM_YEARS.one
  }
  if (CRS_EDU_YEARS.two.test(criterion)) {
    return PROGRAM_YEARS.two
  }
  if (CRS_EDU_YEARS.three.test(criterion)) {
    return PROGRAM_YEARS.three
  }
  return null
}

/**
 * CRS 学历档里按学位名认的那三档。
 *
 * @param input 学历档。
 * @returns 匹配式;这一档不按学位名认则 null。
 */
function crsEduSpecial(input: EduSpecialOfIn): EduSpecialOfOut {
  if (input.edu === EDU.doctorate) {
    return CRS_EDU_SPECIAL.doctorate
  }
  if (input.edu === EDU.master) {
    return CRS_EDU_SPECIAL.master
  }
  if (input.edu === EDU.highschool) {
    return CRS_EDU_SPECIAL.highschool
  }
  return null
}

/**
 * 学历挑行:两张联邦表同一套办法,只是匹配式与要不要去空白不同。
 *
 * @param input 候选行、学历档、学制年数与两把尺。
 * @returns 那一行;挑不出则 null。
 */
function pickEduRow(input: PickEduRowIn): PickByRangeOut {
  const special = input.specialOf({ edu: input.edu })
  if (special) {
    for (const r of input.cand) {
      let crit = r.criterion
      if (input.trimCriterion) {
        crit = r.criterion.trim()
      }
      if (special.test(crit)) {
        return r
      }
    }
    return null
  }
  if (input.eduYears == null) {
    return null
  }
  const scored: TierRow[] = []
  for (const r of input.cand) {
    const y = input.yearsOf(r.criterion)
    if (y != null) {
      scored.push({ r: r, th: y })
    }
  }
  return pickBestTier({ scored: scored, want: input.eduYears })
}

/**
 * CRS 年龄分。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickAgeCrs(input: PickerIn): EstimateItemOut {
  const age = input.profile.age
  if (age == null) {
    return needsInfoItem({ factor: EE_KEY.age, label: EE_LABEL.age })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core && r.factor === EE_FACTOR.age && r.kind === EE_KIND_DETAIL
      && input.spouseCol.test(r.columnLabel)) {
      cand.push(r)
    }
  }
  const hit = pickByRange({ rows: cand, want: age, rangeOf: eeAgeRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.age, label: EE_LABEL.age })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.age, label: EE_LABEL.age, r: hit, points: pts,
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}

/**
 * CRS 学历分:博士 / 硕士 / 高中按学位名认,其余按学制年数取「不超过你的最高档」。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickEduCrs(input: PickerIn): EstimateItemOut {
  const edu = input.profile.edu
  if (edu == null) {
    return needsInfoItem({ factor: EE_KEY.edu, label: EE_LABEL.edu })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core && r.factor === EE_FACTOR.crsEdu && r.kind === EE_KIND_DETAIL
      && input.spouseCol.test(r.columnLabel)) {
      cand.push(r)
    }
  }
  const hit = pickEduRow({
    cand: cand, edu: edu, eduYears: input.profile.eduYears,
    specialOf: crsEduSpecial, yearsOf: crsEduYearsOf, trimCriterion: false,
  })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.edu, label: EE_LABEL.edu })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.edu, label: EE_LABEL.edu, r: hit, points: pts,
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}

/**
 * CRS 首官方语言分:单项 CLB 命中一行 × 四项(四项同档口径)。
 *
 * 二语没有对应档案字段,恒判不了 —— 那一项在 `estimateCrs` 里单独摆。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickLang1Crs(input: PickerIn): EstimateItemOut {
  const clb = input.profile.clb
  if (clb == null) {
    return needsInfoItem({ factor: EE_KEY.clb, label: EE_LABEL.clb })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core && r.factor === EE_FACTOR.crsLang && r.kind === EE_KIND_DETAIL
      && EE_HEAD_FIRST_LANG.test(r.heading) && input.spouseCol.test(r.columnLabel)) {
      cand.push(r)
    }
  }
  const hit = pickByRange({ rows: cand, want: clb, rangeOf: eeClbRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.clb, label: EE_LABEL.clb })
  }
  let per = 0
  if (hit.points != null) {
    per = hit.points
  }
  let status: EstimateItem['status'] = ITEM_STATUS.zero
  if (per > 0) {
    status = ITEM_STATUS.matched
  }
  return estimateItem({
    factor: EE_KEY.clb, label: EE_LABEL.clb, points: per * LANG_ABILITIES,
    matched: `${hit.criterion}${SEP.timesAbilitiesSlash}${hit.columnLabel}`,
    evidence: eeEvidenceOf({ r: hit }),
    status: status,
  })
}

/**
 * CRS 加拿大工作经验分。
 *
 * @param input CRS 全部行、档案与有无配偶那一列。
 * @returns 那一项。
 */
function pickCanadaExpCrs(input: PickerIn): EstimateItemOut {
  const months = input.profile.expCanadaMonths
  if (months == null) {
    return needsInfoItem({ factor: EE_KEY.expCanada, label: EE_LABEL.expCanada })
  }
  let years = 0
  const yearsOrNull = monthsToYears(months)
  if (yearsOrNull != null) {
    years = yearsOrNull
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.core && r.factor === EE_FACTOR.crsCanadaExp
      && r.kind === EE_KIND_DETAIL && input.spouseCol.test(r.columnLabel)) {
      cand.push(r)
    }
  }
  const hit = pickByRange({ rows: cand, want: years, rangeOf: eeYearsRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.expCanada, label: EE_LABEL.expCanada })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.expCanada, label: EE_LABEL.expCanada, r: hit, points: pts,
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}

/**
 * 加拿大学习加分挑档:三年及以上一档,一到两年一档,不足一年没有档。
 *
 * @param input 候选行与学制年数。
 * @returns 那一行;没有则 null。
 */
function pickStudyTier(input: PickStudyTierIn): PickByRangeOut {
  if (input.years >= CRS_STUDY_LONG_YEARS) {
    for (const r of input.cand) {
      if (EE_CRIT_STUDY_LONG.test(r.criterion)) {
        return r
      }
    }
    return null
  }
  if (input.years >= CRS_STUDY_SHORT_YEARS) {
    for (const r of input.cand) {
      if (EE_CRIT_STUDY_SHORT.test(r.criterion)) {
        return r
      }
    }
    return null
  }
  return null
}

/**
 * CRS 加拿大学习加分(D 节,不分有无配偶)。
 *
 * 一到两年学制一档、三年及以上一档。**没有加拿大学历是硬结论 0**,不是判不了。
 *
 * @param input CRS 全部行、档案与有无配偶那一列(这一项用不上)。
 * @returns 那一项。
 */
function pickCanadaStudyBonus(input: PickerIn): EstimateItemOut {
  const key = EE_KEY.canadaStudyBonus
  const label = EE_LABEL.canadaStudyBonus
  const study = input.profile.canadaStudy
  if (study == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  if (study === false) {
    return estimateItem({
      factor: key, label: label, points: 0, matched: EE_NOTE.noCanadaStudy, evidence: null,
      status: ITEM_STATUS.zero,
    })
  }
  const years = input.profile.eduYears
  if (years == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.section === EE_SECTION.extra && r.kind === EE_KIND_DETAIL
      && EE_CRIT_CANADA_STUDY.test(r.criterion)) {
      cand.push(r)
    }
  }
  const hit = pickStudyTier({ cand: cand, years: years })
  if (hit == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({ factor: key, label: label, r: hit, points: pts, matched: hit.criterion })
}

/**
 * C 节(技能可转移性)的子档门槛 —— 列名里带 CLB9 / CLB7 / 2 years or more / 1 year。
 *
 * @param input 列名原文。
 * @returns 门槛;读不出则 null。
 */
function comboSubTier(input: ComboSubTierIn): ComboSubTierOut {
  const s = input.columnLabel
  if (CRS_SUB_TIER.clb9.test(s)) {
    return SUB_TIER_VALUE.clb9
  }
  if (CRS_SUB_TIER.clb7.test(s)) {
    return SUB_TIER_VALUE.clb7
  }
  if (CRS_SUB_TIER.years2.test(s)) {
    return SUB_TIER_VALUE.years2
  }
  if (CRS_SUB_TIER.year1.test(s)) {
    return SUB_TIER_VALUE.year1
  }
  return null
}

/**
 * 该学历在 C 节组合分表里对应哪一档。
 *
 * @param input 学历档。
 * @returns 匹配式。
 */
function comboTierOf(input: ComboTierOfIn): ComboTierOfOut {
  if (input.edu === EDU.doctorate) {
    return CRS_COMBO_TIER.doctorate
  }
  if (input.edu === EDU.master) {
    return CRS_COMBO_TIER.master
  }
  if (input.edu === EDU.highschool) {
    return CRS_COMBO_TIER.highschool
  }
  return CRS_COMBO_TIER.other
}

/**
 * 组合分定档:门槛不超过他的值里最高的那一档。
 *
 * 🔴 **一档都够不到是确定的 0,不是判不了** —— 缺输入才是判不了,那一步在调用方就挡掉了。
 * 两个组合分(学历×、海外经验×)挑候选行的方式不同,但**定档与出行的方式一模一样**,
 * 所以收在这儿(2026-08-20:dupcheck 报出这 8 行逐字重复才抽的,不是先设计出来的)。
 *
 * @param input 带门槛的候选行、他的值与键名。
 * @returns 那一项。
 */
function comboItem(input: ComboItemIn): EstimateItemOut {
  const hit = pickBestTier({ scored: input.scored, want: input.want })
  if (hit == null) {
    return estimateItem({
      factor: input.key, label: input.label, points: 0, matched: EE_NOTE.belowTier,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: input.key, label: input.label, r: hit, points: pts,
    matched: `${hit.criterion}${SEP.slash}${hit.columnLabel}`,
  })
}

/**
 * C 节:学历 ×(语言或加拿大经验)组合分。
 *
 * 🔴 缺输入 → 判不了;**输入给了但一档都够不到 → 确定的 0**,两者不能混为一谈。
 *
 * @param input CRS 全部行、学历、官方因素名、比门槛的那个值与键名。
 * @returns 那一项。
 */
function pickEduComboCrs(input: EduComboIn): EstimateItemOut {
  if (input.edu == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  if (input.want == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  const tierRe = comboTierOf({ edu: input.edu })
  const scored: TierRow[] = []
  for (const r of input.rows) {
    if (r.section !== EE_SECTION.combo || r.kind !== EE_KIND_DETAIL) {
      continue
    }
    if (r.factor !== input.factor || tierRe.test(r.criterion) === false) {
      continue
    }
    const th = comboSubTier({ columnLabel: r.columnLabel })
    if (th != null) {
      scored.push({ r: r, th: th })
    }
  }
  return comboItem({ scored: scored, want: input.want, key: input.key, label: input.label })
}

/**
 * C 节:海外经验 ×(语言或加拿大经验)组合分。
 *
 * @param input CRS 全部行、小节标题片段、海外经验月数、比门槛的那个值与键名。
 * @returns 那一项。
 */
function pickForeignComboCrs(input: ForeignComboIn): EstimateItemOut {
  if (input.expForeignMonths == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  if (input.want == null) {
    return needsInfoItem({ factor: input.key, label: input.label })
  }
  let years = 0
  const yearsOrNull = monthsToYears(input.expForeignMonths)
  if (yearsOrNull != null) {
    years = yearsOrNull
  }
  const scored: TierRow[] = []
  for (const r of input.rows) {
    if (r.section !== EE_SECTION.combo || r.kind !== EE_KIND_DETAIL) {
      continue
    }
    const head = r.heading.toLowerCase()
    if (head.includes(EE_HEAD_FOREIGN_EXP) === false || head.includes(input.headingHas) === false) {
      continue
    }
    const rg = eeYearsRangeOf(r.criterion)
    if (rg == null || years < rg.from || years > rg.to) {
      continue
    }
    const th = comboSubTier({ columnLabel: r.columnLabel })
    if (th != null) {
      scored.push({ r: r, th: th })
    }
  }
  return comboItem({ scored: scored, want: input.want, key: input.key, label: input.label })
}

/**
 * 逐项 → 判不了的那几项的内部键,**按逐项的次序**。
 *
 * 🔴 从 `breakdown` 派生,不靠一个在参数里被就地改的数组传出来 ——
 * 每一项判不了都对应 `breakdown` 里判定态为「判不了」的一条,次序也一致。
 *
 * @param input 逐项。
 * @returns 那几个内部键。
 */
function needsInfoOf(input: NeedsInfoOfIn): NeedsInfoOfOut {
  const out: string[] = []
  for (const b of input.breakdown) {
    if (b.status === ITEM_STATUS.needsInfo) {
      out.push(b.factor)
    }
  }
  return out
}

/**
 * 逐项 → 合计。
 *
 * @param input 逐项。
 * @returns 合计。
 */
function sumPoints(input: SumPointsIn): SumPointsOut {
  let total = 0
  for (const b of input.breakdown) {
    total += b.points
  }
  return total
}

/**
 * 档案 → CRS 估分。
 *
 * 配偶随行走「with a spouse」那张表,单身或配偶不随行走「without a spouse」。
 *
 * @param input 档案与官方联邦表全部行。
 * @returns 合计、逐项、走的哪张表与判不了的那几项。
 */
export function estimateCrs(input: EstimateIn): EstimateOut {
  const p = input.profile
  const withSpouse = p.married === true
  let spouseCol = EE_COL_WITHOUT_SPOUSE
  if (withSpouse) {
    spouseCol = EE_COL_WITH_SPOUSE
  }
  const rows: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.grid === GRID.crs) {
      rows.push(r)
    }
  }
  const one: PickerIn = { rows: rows, profile: p, spouseCol: spouseCol }

  const breakdown: EstimateItem[] = [
    pickAgeCrs(one),
    pickEduCrs(one),
    pickLang1Crs(one),
    needsInfoItem({ factor: EE_KEY.clb2, label: EE_LABEL.clb2 }),
    pickCanadaExpCrs(one),
    pickCanadaStudyBonus(one),
    pickEduComboCrs({
      rows: rows, edu: p.edu, factor: EE_FACTOR.crsComboEduLang, want: p.clb,
      key: EE_KEY.eduLangCombo, label: EE_LABEL.eduLangCombo,
    }),
    pickEduComboCrs({
      rows: rows, edu: p.edu, factor: EE_FACTOR.crsComboEduExp,
      want: monthsToYears(p.expCanadaMonths), key: EE_KEY.eduExpCombo, label: EE_LABEL.eduExpCombo,
    }),
    pickForeignComboCrs({
      rows: rows, headingHas: EE_HEAD_GOOD_LANG, expForeignMonths: p.expForeignMonths,
      want: p.clb, key: EE_KEY.foreignLangCombo, label: EE_LABEL.foreignLangCombo,
    }),
    pickForeignComboCrs({
      rows: rows, headingHas: EE_HEAD_CANADA_EXP, expForeignMonths: p.expForeignMonths,
      want: monthsToYears(p.expCanadaMonths), key: EE_KEY.foreignExpCombo,
      label: EE_LABEL.foreignExpCombo,
    }),
  ]
  return {
    total: sumPoints({ breakdown: breakdown }), breakdown: breakdown, withSpouse: withSpouse,
    needsInfo: needsInfoOf({ breakdown: breakdown }),
  }
}

// =========================================================================
// 7. FSW67(资格分)
// =========================================================================

/**
 * FSW67 学历档里能读出「几年制」的那几条。
 *
 * 🔴 **排除「… plus a …」双证书组合行** —— 档案没有「第二证书」这一格,不猜那一档。
 *
 * @param criterion 官方原文。
 * @returns 年数;这一条不按年数认则 null。
 */
function fswEduYearsOf(criterion: LabelIn): EduYearsOut {
  if (FSW_EDU_PLUS.test(criterion)) {
    return null
  }
  if (FSW_EDU_YEARS.one.test(criterion)) {
    return PROGRAM_YEARS.one
  }
  if (FSW_EDU_YEARS.two.test(criterion)) {
    return PROGRAM_YEARS.two
  }
  if (FSW_EDU_YEARS.three.test(criterion)) {
    return PROGRAM_YEARS.three
  }
  if (FSW_EDU_YEARS.four.test(criterion)) {
    return PROGRAM_YEARS.four
  }
  return null
}

/**
 * FSW67 学历档里按学位名认的那三档。
 *
 * @param input 学历档。
 * @returns 匹配式;这一档不按学位名认则 null。
 */
function fswEduSpecial(input: EduSpecialOfIn): EduSpecialOfOut {
  if (input.edu === EDU.doctorate) {
    return FSW_EDU_SPECIAL.doctorate
  }
  if (input.edu === EDU.master) {
    return FSW_EDU_SPECIAL.master
  }
  if (input.edu === EDU.highschool) {
    return FSW_EDU_SPECIAL.highschool
  }
  return null
}

/**
 * 按官方因素名挑行。
 *
 * @param input FSW67 全部行与官方因素名。
 * @returns 那几行,保持原序。
 */
function fswRowsOf(input: FswRowsOfIn): FswRowsOfOut {
  const out: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.factor === input.factor) {
      out.push(r)
    }
  }
  return out
}

/**
 * FSW67 年龄分。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickAgeFsw(input: FswPickerIn): EstimateItemOut {
  const age = input.profile.age
  if (age == null) {
    return needsInfoItem({ factor: EE_KEY.age, label: EE_LABEL.age })
  }
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.age })
  const hit = pickByRange({ rows: cand, want: age, rangeOf: eeAgeRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.age, label: EE_LABEL.age })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.age, label: EE_LABEL.age, r: hit, points: pts,
    matched: hit.criterion,
  })
}

/**
 * FSW67 学历分。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickEduFsw(input: FswPickerIn): EstimateItemOut {
  const edu = input.profile.edu
  if (edu == null) {
    return needsInfoItem({ factor: EE_KEY.edu, label: EE_LABEL.edu })
  }
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.fswEdu })
  const hit = pickEduRow({
    cand: cand, edu: edu, eduYears: input.profile.eduYears,
    specialOf: fswEduSpecial, yearsOf: fswEduYearsOf, trimCriterion: true,
  })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.edu, label: EE_LABEL.edu })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.edu, label: EE_LABEL.edu, r: hit, points: pts,
    matched: hit.criterion,
  })
}

/**
 * FSW67 首官方语言分:官方四项同档,取「Speaking」那一列 × 四项。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickLang1Fsw(input: FswPickerIn): EstimateItemOut {
  const clb = input.profile.clb
  if (clb == null) {
    return needsInfoItem({ factor: EE_KEY.clb, label: EE_LABEL.clb })
  }
  const cand: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.factor === EE_FACTOR.fswLang && r.columnLabel === EE_COL_SPEAKING) {
      cand.push(r)
    }
  }
  const hit = pickByRange({ rows: cand, want: clb, rangeOf: eeClbRangeOf })
  if (hit == null) {
    return needsInfoItem({ factor: EE_KEY.clb, label: EE_LABEL.clb })
  }
  let per = 0
  if (hit.points != null) {
    per = hit.points
  }
  let status: EstimateItem['status'] = ITEM_STATUS.zero
  if (per > 0) {
    status = ITEM_STATUS.matched
  }
  return estimateItem({
    factor: EE_KEY.clb, label: EE_LABEL.clb, points: per * LANG_ABILITIES,
    matched: `${hit.criterion}${SEP.timesAbilities}`, evidence: eeEvidenceOf({ r: hit }),
    status: status,
  })
}

/**
 * FSW67 工作经验分:官方**不分境内境外**,合计年数一次查表。
 *
 * 查不到档 = 不足一年,那是**硬结论 0**,不是判不了。
 *
 * @param input FSW67 全部行与档案。
 * @returns 那一项。
 */
function pickExpFsw(input: FswPickerIn): EstimateItemOut {
  const can = input.profile.expCanadaMonths
  const foreign = input.profile.expForeignMonths
  if (can == null || foreign == null) {
    return needsInfoItem({ factor: EE_KEY.exp, label: EE_LABEL.exp })
  }
  const years = Math.floor((can + foreign) / MONTHS_PER_YEAR)
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.fswExp })
  const hit = pickByRange({ rows: cand, want: years, rangeOf: eeYearsRangeOf })
  if (hit == null) {
    return estimateItem({
      factor: EE_KEY.exp, label: EE_LABEL.exp, points: 0, matched: EE_NOTE.underOneYear,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (hit.points != null) {
    pts = hit.points
  }
  return hitItem({
    factor: EE_KEY.exp, label: EE_LABEL.exp, r: hit, points: pts,
    matched: hit.criterion,
  })
}

/**
 * FSW67 适应性:档案只覆盖「加拿大学习」与「加拿大工作」两项。
 *
 * 配偶语言 / 配偶学习 / 预安排就业 / 加拿大亲属**档案里没有对应字段,恒判不了** —— 不猜。
 *
 * @param input FSW67 全部行与档案。
 * @returns 适应性那六项。
 */
function pickAdaptabilityFsw(input: FswPickerIn): AdaptOut {
  const cand = fswRowsOf({ rows: input.rows, factor: EE_FACTOR.fswAdapt })
  let studyRow: EeGridRow | null = null
  let workRow: EeGridRow | null = null
  for (const r of cand) {
    if (studyRow == null && EE_CRIT_PAST_STUDY.test(r.criterion.trim())) {
      studyRow = r
    }
    if (workRow == null && EE_CRIT_PAST_WORK.test(r.criterion.trim())) {
      workRow = r
    }
  }
  return [
    adaptStudyItem({ row: studyRow, profile: input.profile }),
    adaptWorkItem({ row: workRow, profile: input.profile }),
    needsInfoItem({ factor: EE_KEY.adaptSpouseLang, label: EE_LABEL.adaptSpouseLang }),
    needsInfoItem({ factor: EE_KEY.adaptSpouseStudy, label: EE_LABEL.adaptSpouseStudy }),
    needsInfoItem({
      factor: EE_KEY.adaptArrangedEmployment, label: EE_LABEL.adaptArrangedEmployment,
    }),
    needsInfoItem({ factor: EE_KEY.adaptRelatives, label: EE_LABEL.adaptRelatives }),
  ]
}

/**
 * 适应性:加拿大学习经历那一项 —— 要满两学年全日制。
 *
 * @param input 官方那一行与档案。
 * @returns 那一项。
 */
function adaptStudyItem(input: AdaptItemIn): EstimateItemOut {
  const key = EE_KEY.adaptStudy
  const label = EE_LABEL.adaptStudy
  const p = input.profile
  const row = input.row
  if (p.canadaStudy == null || p.eduYears == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  if (p.canadaStudy === false || p.eduYears < FSW_ADAPT_STUDY_YEARS || row == null) {
    let matched = MATCHED_NONE
    if (row != null) {
      matched = EE_NOTE.underTwoStudyYears
    }
    return estimateItem({
      factor: key, label: label, points: 0, matched: matched,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  return hitItem({
    factor: key, label: label, r: row, points: pts,
    matched: row.criterion.slice(0, MATCHED_MAX),
  })
}

/**
 * 适应性:加拿大工作经历那一项 —— 要满一年。
 *
 * @param input 官方那一行与档案。
 * @returns 那一项。
 */
function adaptWorkItem(input: AdaptItemIn): EstimateItemOut {
  const key = EE_KEY.adaptWork
  const label = EE_LABEL.adaptWork
  const months = input.profile.expCanadaMonths
  const row = input.row
  if (months == null) {
    return needsInfoItem({ factor: key, label: label })
  }
  if (months < FSW_ADAPT_WORK_MONTHS || row == null) {
    let matched = MATCHED_NONE
    if (row != null) {
      matched = EE_NOTE.underOneWorkYear
    }
    return estimateItem({
      factor: key, label: label, points: 0, matched: matched,
      evidence: null, status: ITEM_STATUS.zero,
    })
  }
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  return hitItem({
    factor: key, label: label, r: row, points: pts,
    matched: row.criterion.slice(0, MATCHED_MAX),
  })
}

/**
 * 档案 → FSW67 估分(联邦技术工人 67/100 资格分)。
 *
 * 🔴 与 CRS 排名分**不可相加**,是两把尺。
 * FSW67 官方表不分有无配偶,`withSpouse` 只是原样回传供上游标注,不参与查表。
 *
 * @param input 档案与官方联邦表全部行。
 * @returns 合计、逐项、有无配偶与判不了的那几项。
 */
export function estimateFsw67(input: EstimateIn): EstimateOut {
  const rows: EeGridRow[] = []
  for (const r of input.rows) {
    if (r.grid === GRID.fsw67) {
      rows.push(r)
    }
  }
  const one: FswPickerIn = { rows: rows, profile: input.profile }

  const breakdown: EstimateItem[] = [
    pickAgeFsw(one),
    pickEduFsw(one),
    pickLang1Fsw(one),
    needsInfoItem({ factor: EE_KEY.clb2, label: EE_LABEL.clb2 }),
    pickExpFsw(one),
  ]
  for (const item of pickAdaptabilityFsw(one)) {
    breakdown.push(item)
  }
  return {
    total: sumPoints({ breakdown: breakdown }), breakdown: breakdown,
    withSpouse: input.profile.married === true,
    needsInfo: needsInfoOf({ breakdown: breakdown }),
  }
}

// =========================================================================
// 8. 估分 × 抽选线
// =========================================================================

/**
 * 估分 × 最近抽选线的三态判定。
 *
 * 🔴 `partial` 的含义是 `value` = **下界**(问不到的加分项按 0 记)、`ceiling` = **上界**
 * (加分项全按满分)。两个方向各取各的那一侧,才都是**不会翻案的硬结论**:
 *   · 够得着:下界 ≥ 线 —— 加分项只会让分更高,partial 与否都成立;
 *   · 够不着:上界 < 线 —— 全按满分也摸不到线;
 *   · 中间那段:如实留白,由展示层说「取决于加分项」。
 *
 * 病灶(2026-08-16 改之前):两头都拿 `value` 判,又把 partial 整个排除掉 —— 于是
 * AB 的官方表带 12 条加分项、恒 partial,沉底**永不触发**;「够得着」这一侧压根没写过。
 * 结果是估分入库、上页,却对排序与结论**零影响**。
 *
 * 没分 / 没线一律说不好 —— **缺一边就不比,不拿空当 0**。
 * 上界算不出时退回 `value`:宁可不沉,也不误判「够不着」。
 *
 * 分与线都是官方事实(分 = 官方分值表,线 = 官方抽选史),比较它们不碰禁概率红线;
 * 但也**只到「够不够线」为止** —— 不许延伸成「多久能被捞」「概率多大」。
 *
 * @param score 估分与线;没有就传 null。
 * @returns 三态。
 */
export function lineStateOf(score: ScoreLineIn): LineStateOut {
  if (score == null) {
    return LINE.unknown
  }
  const line = score.refLine
  if (line == null || Number.isFinite(line) === false) {
    return LINE.unknown
  }
  const low = score.value
  if (low != null && Number.isFinite(low) && low >= line) {
    return LINE.above
  }
  let top = score.value
  if (score.ceiling != null) {
    top = score.ceiling
  }
  if (top != null && Number.isFinite(top) && top < line) {
    return LINE.below
  }
  return LINE.unknown
}

/**
 * 够不够得着线。
 *
 * @param score 估分与线。
 * @returns 够得着则 true。
 */
export function isAboveLine(score: ScoreLineIn): LineSideOut {
  return lineStateOf(score) === LINE.above
}

/**
 * 是不是确定够不着线。
 *
 * @param score 估分与线。
 * @returns 够不着则 true。
 */
export function isBelowLine(score: ScoreLineIn): LineSideOut {
  return lineStateOf(score) === LINE.below
}

/**
 * 够得着时高出线多少分。
 *
 * 够不着或无从比较给 null —— 展示层据此决定出不出这个数。
 *
 * @param score 估分与线。
 * @returns 高出多少;够不着或无从比较则 null。
 */
export function marginOf(score: ScoreLineIn): MarginOut {
  if (lineStateOf(score) !== LINE.above) {
    return null
  }
  if (score == null) {
    return null
  }
  const value = score.value
  const line = score.refLine
  if (value == null || line == null) {
    return null
  }
  return value - line
}

// =========================================================================
// 9. 曼省 EOI
// =========================================================================

/**
 * 按因素与种类挑曼省的行。
 *
 * @param input 曼省全部行、因素名与种类。
 * @returns 那几行,保持原序。
 */
function mbRowsOf(input: MbRowsOfIn): RowsOfOut {
  const out: ScoreFactor[] = []
  for (const r of input.rows) {
    if (r.factor === input.factor && r.kind === input.kind) {
      out.push(r)
    }
  }
  return out
}

/**
 * 官方表里必须有的那一行 —— **少一行就抛**。
 *
 * 🔴 不静默补 0:官方表改版是要人去改抓取脚本的事,悄悄算出一个少了几百分的结果,
 * 比报错难查得多。
 *
 * @param input 候选行、匹配式与报错时的上下文。
 * @returns 那一行。
 */
function needRow(input: NeedRowIn): NeedRowOut {
  for (const r of input.rows) {
    if (input.re.test(r.label)) {
      return r
    }
  }
  throw fail({
    name: POINTS_ERR.name,
    msg: `${POINTS_ERR.rowMissingHead}${input.ctx}${POINTS_ERR.rowMissingTail}`,
    code: null,
  })
}

/**
 * 曼省语言单档:阈值取标签里的「CLB N」,就近取「≤ 你的值」里最高的那档。
 *
 * 一档都够不到时退到**最低档**(官方表的最低档本身就是给低分段的,不是没有分)。
 * 返回行上的 `as ScoreFactor` 是既有断言原样保留:官方语言档位行为空的表进不了这条流水线,
 * best 只在空表时才是 null。
 *
 * @param input 语言档位行与这一项的 CLB。
 * @returns 这一项得几分与命中的那一行。
 */
function mbLangPick(input: MbLangPickIn): MbLangPickOut {
  const scored: MbThresholdRow[] = []
  for (const r of input.rows) {
    const hit = oneGroupOf({ re: MB_CLB, text: r.label })
    if (hit == null) {
      continue
    }
    const th = Number(hit.n)
    if (Number.isNaN(th) === false) {
      scored.push({ r: r, th: th })
    }
  }
  let best: MbThresholdRow | null = null
  for (const x of scored) {
    if (x.th > input.clb) {
      continue
    }
    if (best == null || x.th > best.th) {
      best = x
    }
  }
  if (best == null) {
    for (const x of scored) {
      if (best == null || x.th < best.th) {
        best = x
      }
    }
  }
  let pts = 0
  if (best != null && best.r.points != null) {
    pts = best.r.points
  }
  let bestRow: ScoreFactor | null = null
  if (best != null) {
    bestRow = best.r
  }
  return { pts: pts, row: bestRow as ScoreFactor }
}

/**
 * 曼省年龄:裸数字单年档、「21 to 45」区间、「50 or older」开区间三种写法。
 *
 * @param input 年龄档位行与他的年龄。
 * @returns 那一行。
 */
function mbAgePick(input: MbAgePickIn): MbRowOut {
  for (const r of input.rows) {
    const older = oneGroupOf({ re: MB_AGE_OR_OLDER, text: r.label })
    if (older) {
      if (input.age >= Number(older.n)) {
        return r
      }
      continue
    }
    const span = rangeGroupOf({ re: MB_AGE_RANGE, text: r.label })
    if (span) {
      if (input.age >= Number(span.low) && input.age <= Number(span.high)) {
        return r
      }
      continue
    }
    const single = oneGroupOf({ re: MB_AGE_BARE, text: r.label.trim() })
    if (single && input.age === Number(single.n)) {
      return r
    }
  }
  throw fail({
    name: POINTS_ERR.name, msg: `${POINTS_ERR.noAgeRowHead}${input.age}`, code: null,
  })
}

/**
 * 曼省工作年限档的年数 —— 官方用**拼写数字**(One / Two / Three / Four)。
 *
 * @param label 官方原文。
 * @returns 这一档的年数;读不出则 null。
 */
function mbWorkYearsOf(label: LabelIn): MbWorkYearsOut {
  if (MB_WORK_LESS.test(label)) {
    return 0
  }
  const m = wordGroupOf({ re: MB_WORK_WORD, text: label.trim() })
  if (m == null) {
    return null
  }
  const word = m.word.toLowerCase()
  if (word === WORD.one) {
    return WORD_NUM.one
  }
  if (word === WORD.two) {
    return WORD_NUM.two
  }
  if (word === WORD.three) {
    return WORD_NUM.three
  }
  return WORD_NUM.four
}

/**
 * 曼省工作年限:就近取「≤ 你的年数」里最高的那档;一档都够不到退到最低档。
 *
 * @param input 工作年限档位行与他的整年数。
 * @returns 那一行。
 */
function mbWorkPick(input: MbWorkPickIn): MbRowOut {
  const scored: MbThresholdRow[] = []
  for (const r of input.rows) {
    const t = mbWorkYearsOf(r.label)
    if (t != null) {
      scored.push({ r: r, th: t })
    }
  }
  let best: MbThresholdRow | null = null
  for (const x of scored) {
    if (x.th > input.years) {
      continue
    }
    if (best == null || x.th > best.th) {
      best = x
    }
  }
  if (best == null) {
    for (const x of scored) {
      if (best == null || x.th < best.th) {
        best = x
      }
    }
  }
  let bestRow: ScoreFactor | null = null
  if (best != null) {
    bestRow = best.r
  }
  return bestRow as ScoreFactor
}

/**
 * 曼省学历档对应哪一条官方标签。
 *
 * @param input 学历档。
 * @returns 匹配式。
 */
function mbEduReOf(input: MbEduReOfIn): MbEduReOfOut {
  if (input.edu === MB_EDU.masterOrDoctorate) {
    return MB_EDU_RE.masterOrDoctorate
  }
  if (input.edu === MB_EDU.twoPrograms2yPlus) {
    return MB_EDU_RE.twoPrograms2yPlus
  }
  if (input.edu === MB_EDU.oneProgram3yPlus) {
    return MB_EDU_RE.oneProgram3yPlus
  }
  if (input.edu === MB_EDU.oneProgram2y) {
    return MB_EDU_RE.oneProgram2y
  }
  if (input.edu === MB_EDU.oneYearProgram) {
    return MB_EDU_RE.oneYearProgram
  }
  if (input.edu === MB_EDU.tradeCert) {
    return MB_EDU_RE.tradeCert
  }
  return MB_EDU_RE.none
}

/**
 * 语言摊平成四项 —— 单一数字表示四项同档。
 *
 * @param input 语言:单一数或四项数组。
 * @returns 四项。
 */
function mbBands(input: MbBandsIn): MbBandsOut {
  const one = input.clb
  if (typeof one === 'number') {
    return [one, one, one, one]
  }
  return [one.reading, one.writing, one.listening, one.speaking]
}

/**
 * 曼省语言那一块:**四项各自查表相加** + 第二官方语言一次性加分。
 *
 * 🔴 这是曼省单写一套的第一条理由:别的省语言是「查一次表 = 总分」,曼省的官方规则行写明
 * 四项各自按同一张表打分后相加(CLB6 单项 20 → 四项 80)。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbLanguagePart(input: MbPartIn): MbPartOut {
  const langRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.language, kind: KIND.row })
  const bands = mbBands({ clb: input.profile.clb })
  let pts = 0
  const hits: ScoreFactor[] = []
  for (const clb of bands) {
    const one = mbLangPick({ rows: langRows, clb: clb })
    pts += one.pts
    hits.push(one.row)
  }
  const lang2Rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.language, kind: KIND.bonus })
  let secondNote = MB_NOTE_NONE
  if (input.profile.secondLangClb5Plus && lang2Rows.length > 0) {
    const lang2 = lang2Rows[0]
    if (lang2.points != null) {
      pts += lang2.points
    }
    secondNote = `${MB_JOIN.plus}${lang2.label}`
  }
  let max: number | null = null
  if (langRows.length > 0) {
    max = langRows[0].factorMax
  }
  let capped = pts
  if (max != null) {
    capped = Math.min(pts, max)
  }
  let firstHitLabel = MB_LABEL_NONE
  if (hits.length > 0 && hits[0] != null) {
    firstHitLabel = hits[0].label
  }
  return {
    factor: MB_FACTOR.language, pts: capped, max: max,
    matched: `${firstHitLabel}${MB_JOIN.times}${bands.length}${secondNote}`,
  }
}

/**
 * 曼省年龄那一块。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbAgePart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.age, kind: KIND.row })
  const row = mbAgePick({ rows: rows, age: input.profile.age })
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  let max: number | null = null
  if (rows.length > 0) {
    max = rows[0].factorMax
  }
  return {
    factor: MB_FACTOR.age, pts: pts, max: max,
    matched: row.label,
  }
}

/**
 * 曼省工作年限那一块,含发证机构全面认可的加分。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbWorkPart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.work, kind: KIND.row })
  const row = mbWorkPick({
    rows: rows, years: Math.floor(input.profile.workMonthsSameOcc / MONTHS_PER_YEAR),
  })
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  const bonusRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.work, kind: KIND.bonus })
  let licensedNote = MB_NOTE_NONE
  if (input.profile.employerLicenseRecognized && bonusRows.length > 0) {
    const bonus = bonusRows[0]
    if (bonus.points != null) {
      pts += bonus.points
    }
    licensedNote = `${MB_JOIN.plus}${bonus.label}`
  }
  let max: number | null = null
  if (rows.length > 0) {
    max = rows[0].factorMax
  }
  let capped = pts
  if (max != null) {
    capped = Math.min(pts, max)
  }
  return {
    factor: MB_FACTOR.work, pts: capped, max: max,
    matched: `${row.label}${licensedNote}`,
  }
}

/**
 * 曼省学历那一块。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbEduPart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.education, kind: KIND.row })
  const row = needRow({
    rows: rows, re: mbEduReOf({ edu: input.profile.edu }),
    ctx: `${MB_FACTOR.education}${MB_CTX_SEP}${input.profile.edu}`,
  })
  let pts = 0
  if (row.points != null) {
    pts = row.points
  }
  let max: number | null = null
  if (rows.length > 0) {
    max = rows[0].factorMax
  }
  return {
    factor: MB_FACTOR.education, pts: pts, max: max,
    matched: row.label,
  }
}

/**
 * 曼省适应性那一块:关系分(可叠、自己封顶)+ 需求分 + 区域分,再按组封顶。
 *
 * 官方语义是 **max(关系 + 区域, 需求)**,不是三者相加封顶。但关系上限 200 + 区域上限 50 = 250
 * 恒小于组上限 500,而需求只有 0 / 500 两档 —— 于是**先加后封顶**与 max(…) 在这个数值结构下
 * **代数等价**(需求 500 时和必被封到 500;需求 0 时和 ≤250 本就摸不到 500)。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbAdaptPart(input: MbPartIn): MbPartOut {
  const adapt = input.profile.adapt
  const connRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.adaptConnection, kind: KIND.row })
  let connPts = 0
  const connHits: string[] = []
  for (const one of mbConnectionPicks({ adapt: adapt })) {
    const r = needRow({ rows: connRows, re: one.re, ctx: one.ctx })
    if (r.points != null) {
      connPts += r.points
    }
    connHits.push(r.label)
  }
  let connMax: number | null = null
  if (connRows.length > 0) {
    connMax = connRows[0].factorMax
  }
  if (connMax != null) {
    connPts = Math.min(connPts, connMax)
  }

  const demandRows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.adaptDemand, kind: KIND.row })
  let demandPts = 0
  if (adapt.demand) {
    demandPts = mbMaxPoints({ rows: demandRows })
  }
  const regionalRows = mbRowsOf({
    rows: input.rows, factor: MB_FACTOR.adaptRegional, kind: KIND.row,
  })
  let regionalPts = 0
  if (adapt.regionalOutsideWinnipeg && regionalRows.length > 0 && regionalRows[0].points != null) {
    regionalPts = regionalRows[0].points
  }

  let groupMax: number | null = null
  if (connRows.length > 0 && connRows[0].groupMax != null) {
    groupMax = connRows[0].groupMax
  } else if (demandRows.length > 0 && demandRows[0].groupMax != null) {
    groupMax = demandRows[0].groupMax
  } else if (regionalRows.length > 0 && regionalRows[0].groupMax != null) {
    groupMax = regionalRows[0].groupMax
  }
  const sum = connPts + demandPts + regionalPts
  const notes: string[] = []
  let demandNote = MB_NOTE_NONE
  if (adapt.demand) {
    demandNote = MB_NOTE.demand
  }
  let regionalNote = MB_NOTE_NONE
  if (adapt.regionalOutsideWinnipeg && regionalRows.length > 0) {
    regionalNote = regionalRows[0].label
  }
  for (const one of [connHits.join(MB_JOIN.semi), demandNote, regionalNote]) {
    if (one) {
      notes.push(one)
    }
  }
  let capped = sum
  if (groupMax != null) {
    capped = Math.min(sum, groupMax)
  }
  return {
    factor: MB_FACTOR.adaptability, pts: capped,
    max: groupMax, matched: notes.join(MB_JOIN.plus),
  }
}

/**
 * 关系分要挑哪几条 —— 按档案逐条勾。
 *
 * 在曼省读书那一格是**互斥的两档**(两年及以上 / 一年),不是可叠加的两条。
 *
 * @param input 适应性那几格。
 * @returns 要挑的那几条。
 */
function mbConnectionPicks(input: MbConnectionPicksIn): MbConnectionPicksOut {
  const a = input.adapt
  const out: MbPick[] = []
  const head = MB_FACTOR.adaptConnection + MB_CTX_SEP
  if (a.closeRelative) {
    out.push({ re: MB_ADAPT_RE.closeRelative, ctx: head + MB_CTX.closeRelative })
  }
  if (a.priorMbWork6moPlus) {
    out.push({ re: MB_ADAPT_RE.priorWork, ctx: head + MB_CTX.priorWork })
  }
  if (a.mbEduYears === MB_EDU_TWO_YEARS) {
    out.push({ re: MB_ADAPT_RE.edu2y, ctx: head + MB_CTX.edu2y })
  } else if (a.mbEduYears === MB_EDU_ONE_YEAR) {
    out.push({ re: MB_ADAPT_RE.edu1y, ctx: head + MB_CTX.edu1y })
  }
  if (a.closeFriendOrDistantRelative) {
    out.push({ re: MB_ADAPT_RE.friend, ctx: head + MB_CTX.friend })
  }
  return out
}

/**
 * 这几行里最高的那个分。
 *
 * @param input 那几行。
 * @returns 最高分;一行都没有则负无穷(与老件同口径,调用方已保证非空)。
 */
function mbMaxPoints(input: MbMaxPointsIn): MbMaxPointsOut {
  let top = -Infinity
  for (const r of input.rows) {
    let p = 0
    if (r.points != null) {
      p = r.points
    }
    if (p > top) {
      top = p
    }
  }
  return top
}

/**
 * 曼省风险扣分那一块。
 *
 * 🔴 两条都是**负分**,互不排斥按加总计;`factorMax` 是 -200,那是**下限(floor)不是上限** ——
 * 所以这里封顶用 `Math.max` 不是 `Math.min`。这是曼省单写一套的第三条理由。
 *
 * @param input 曼省全部行与档案。
 * @returns 那一块分。
 */
function mbRiskPart(input: MbPartIn): MbPartOut {
  const rows = mbRowsOf({ rows: input.rows, factor: MB_FACTOR.risk, kind: KIND.bonus })
  const prefix = `${MB}${TICK_SEP}${MB_FACTOR.risk}`
  let pts = bonusPoints({
    list: rows, prefix: prefix, ticks: mbRiskTicks({ rows: rows, profile: input.profile }),
  })
  let floor: number | null = null
  if (rows.length > 0) {
    floor = rows[0].factorMax
  }
  if (floor != null) {
    pts = Math.max(pts, floor)
  }
  const notes: string[] = []
  if (input.profile.riskForeignWork) {
    notes.push(MB_NOTE.foreignWork)
  }
  if (input.profile.riskForeignStudy) {
    notes.push(MB_NOTE.foreignStudy)
  }
  return {
    factor: MB_FACTOR.risk, pts: pts, max: floor, matched: notes.join(MB_JOIN.plus),
  }
}

/**
 * 风险那两条按档案勾上。
 *
 * @param input 风险那几行与档案。
 * @returns 勾选状态。
 */
function mbRiskTicks(input: MbRiskTicksIn): MbRiskTicksOut {
  const ticks: Record<string, boolean> = {}
  const prefix = `${MB}${TICK_SEP}${MB_FACTOR.risk}${TICK_SEP}`
  for (let i = 0; i < input.rows.length; i += 1) {
    const label = input.rows[i].label
    if (MB_RISK_RE.foreignWork.test(label) && input.profile.riskForeignWork) {
      ticks[`${prefix}${i}`] = true
    }
    if (MB_RISK_RE.foreignStudy.test(label) && input.profile.riskForeignStudy) {
      ticks[`${prefix}${i}`] = true
    }
  }
  return ticks
}

/**
 * 档案 → 曼省 EOI 估分。
 *
 * 🔴 曼省**单写一套**,不复用查表估分:语言按每项计分、标签用拼写数字与计数短语、
 * 风险因子的 `factorMax` 是下限 —— 三处都要真改通用引擎,回归面盖到别的省。
 * 完整论证见 `docs/implementation/C5-判定层pathVerdict-20260805.md` §三。
 *
 * **分值一分都不许在这里编**,全部来自官方分值表。
 *
 * @param input 官方分值表全部行与档案。
 * @returns 曼省估分。
 */
export function estimateMbEoi(input: EstimateMbEoiIn): EstimateMbEoiOut {
  const rows: ScoreFactor[] = []
  for (const f of input.factors) {
    if (f.province === MB) {
      rows.push(f)
    }
  }
  if (rows.length === 0) {
    throw fail({ name: POINTS_ERR.name, msg: POINTS_ERR.noMbRows, code: null })
  }
  const head = rows[0]
  const one: MbPartIn = { rows: rows, profile: input.profile }
  const parts: MbScorePart[] = [
    mbLanguagePart(one), mbAgePart(one), mbWorkPart(one), mbEduPart(one),
    mbAdaptPart(one), mbRiskPart(one),
  ]
  let raw = 0
  for (const p of parts) {
    raw += p.pts
  }
  let maxTotal = 0
  let capped = raw
  if (head.maxTotal != null) {
    maxTotal = head.maxTotal
    capped = Math.min(raw, head.maxTotal)
  }
  return {
    province: MB, system: head.system, maxTotal: maxTotal, url: head.url,
    guideEffective: head.guideEffective, fetched: head.fetched, parts: parts,
    total: capped,
  }
}

// =========================================================================
// 10. 决策页官方表包（取数 + 单件缓存；2026-08-22 自 lib/score 并入）
// =========================================================================

/**
 * 一行难度事实 → 名额竞争基础行(flow/series 由 `attachExtras` 再挂)。这里只剩业务取舍:
 * 比值缺位(官方没这格)或省码不在 13 省区名单(FED 是 EE 不是省提名)→ 不出行,
 * 纯事实零解释;值级清洗都在 rows(2026-08-22 Frank:functions 入参保证有效)。
 *
 * @param fact 难度事实一行。
 * @returns 竞争行;不入选是 null。
 */
function competitionRowOf(fact: DifficultyFact): MaybeCompetition {
  if (PNP_PROV_CODES.includes(fact.province) === false || fact.ratio == null) {
    return null
  }
  return {
    province: fact.province, ratio: fact.ratio, tier: fact.tier,
    pool: fact.pool, quota: fact.quota,
    poolStudy: fact.poolStudy, poolWork: fact.poolWork,
    poolYear: fact.poolYear, quotaYear: fact.quotaYear,
    generated: fact.generated, source: fact.source,
    series: null, flow: null,
  }
}

/**
 * 省份维度事实 → 省码 → 增补(增补的拼装在 rows;这里只按省码归集)。
 *
 * @param rows 省份维度事实行。
 * @returns 省码 → 增补。
 */
function infoExtrasOf(rows: ProvInfoFacts): ExtrasMap {
  const out: ExtrasMap = {}
  for (const r of rows) {
    if (r.code !== '') {
      out[r.code] = r.extra
    }
  }
  return out
}

/**
 * 把 flow/series 挂回竞争行(没有增补的省保持 null)。
 *
 * @param input 竞争行与省码增补表。
 * @returns 无(就地挂)。
 */
function attachExtras(input: CompetitionExtrasIn): void {
  for (const row of input.rows) {
    const extra = input.extras[row.province]
    if (extra == null) {
      continue
    }
    row.flow = extra.flow
    row.series = extra.series
  }
}

/**
 * 抽选事实 → 展示行(`DrawRow`;invitations 不进 —— 它只在 overview 出)。
 *
 * @param f 抽选事实。
 * @returns 展示行。
 */
function drawOf(f: DrawFact): DrawRow {
  const row: DrawRow = { province: f.province, kind: f.kind, drawDate: f.drawDate, stream: f.stream, score: f.score }
  if (f.streamZh !== '') {
    row.streamZh = f.streamZh
  }
  return row
}

/**
 * 每省最近一轮有分数线**或**邀请数的抽选(行序已按抽选日倒序;查不到的省不出行,
 * 纯事实零解释;联邦轮不进,见 `PNP_PROV_CODES`)。
 *
 * @param facts 抽选事实(按抽选日倒序)。
 * @returns SSR 事实区行。
 */
function overviewOf(facts: DrawFacts): OverviewDraws {
  const seen = new Set<string>()
  const out: OverviewDraws = []
  for (const f of facts) {
    if (f.province === '' || PNP_PROV_CODES.includes(f.province) === false || seen.has(f.province)) {
      continue
    }
    if (f.score == null && f.invitations == null) {
      continue
    }
    seen.add(f.province)
    out.push({ province: f.province, drawDate: f.drawDate, stream: f.stream, score: f.score, invitations: f.invitations })
  }
  return out
}

/**
 * 每省近 6 轮**有分数**的抽选(没分数的轮次不进 —— 拿它跟估分比就是编)。
 * 2026-08-16:估分卡的空态诱饵,必须随 SSR 下发 —— 先前它取自 `/api/points/factors`,
 * 而那个请求只在**答满全卷**后才发,于是「选了省却看不到线」(实撞)。线是免费硬事实。
 *
 * @param facts 抽选事实(按抽选日倒序)。
 * @returns 每省近 6 轮有分数的展示行。
 */
function recentOf(facts: DrawFacts): DrawRows {
  const perProv = new Map<string, number>()
  const out: DrawRows = []
  for (const f of facts) {
    if (f.province === '' || f.score == null) {
      continue
    }
    let n = perProv.get(f.province)
    if (n == null) {
      n = 0
    }
    if (n >= RECENT_ROUNDS) {
      continue
    }
    perProv.set(f.province, n + 1)
    out.push(drawOf(f))
  }
  return out
}

/**
 * 已收录官方分值表的省清单(决策页据此把「本站没有表」的省单列出来)。
 *
 * @param factors 分值表全表。
 * @returns 去重后的省码清单。
 */
function factorProvincesOf(factors: ScoreFactors): StrList {
  const seen = new Set<string>()
  for (const f of factors) {
    if (f.province !== '') {
      seen.add(f.province)
    }
  }
  return Array.from(seen)
}

/**
 * 真去库里取一版表包(缓存判断在 `getScoreTables`):四条查询并行 ——
 * 抽选近 200 轮、分值表全表、各省难度、省份维度 info。
 *
 * @param db 能打 SQL 的东西(池由调用方注进来)。
 * @returns 组装好的表包。
 */
async function loadScoreTables(db: Db): ScoreTablesOut {
  const [facts, factors, diffRows, infoRows] = await Promise.all([
    queryRowsOrEmpty({ db: db, sql: SQL.DIMS_PNP_DRAWS, params: [], map: toDrawFact }),
    queryRowsOrEmpty({ db: db, sql: SQL.PNP_SCORE_FACTORS, params: [], map: toScoreFactor }),
    queryRowsOrEmpty({ db: db, sql: SQL.PROV_DIFFICULTY_FETCHED, params: [], map: toDifficultyFact }),
    queryRowsOrEmpty({ db: db, sql: SQL.PROVINCES_INFO, params: [], map: toProvInfoFact }),
  ])
  const competition: ProvCompetitions = []
  for (const r of diffRows) {
    const row = competitionRowOf(r)
    if (row != null) {
      competition.push(row)
    }
  }
  attachExtras({ rows: competition, extras: infoExtrasOf(infoRows) })
  competition.sort(byRatioAsc)
  return {
    overview: overviewOf(facts), drawsRecent: recentOf(facts), competition: competition,
    draws: facts.map(drawOf), factors: factors, factorProvinces: factorProvincesOf(factors),
  }
}

/**
 * 决策页首屏的官方表包(进程内单件缓存;2026-08-12 立,2026-08-22 自 lib/score 并入本域)。
 * 抽选表(overview)留在 SSR:它是这页唯一的免费硬事实,要被爬到,不能等水合;
 * 分值表由 `/api/points/factors` 按省懒取,不再随页面下发。
 * topNocs 2026-08-22 起不进包 —— 那是 jobs 的题材,页面另取 `getTopNocs`(同 TTL)。
 * 两张主表都空 = 多半是查挂了,不把一次抖动钉死 10 分钟。
 *
 * @param db 能打 SQL 的东西(池由调用方注进来)。
 * @returns 表包(TTL 内直接给缓存那一份)。
 */
export async function getScoreTables(db: Db): ScoreTablesOut {
  if (CACHE.scoreTables != null && Date.now() - CACHE.scoreTables.at <= SCORE_TTL_MS) {
    return CACHE.scoreTables.data
  }
  const data = await loadScoreTables(db)
  if (data.draws.length > 0 || data.factors.length > 0) {
    CACHE.scoreTables = { at: Date.now(), data: data }
  }
  return data
}

// =========================================================================
// 11. 省过滤小件（/api/points/factors 用）
// =========================================================================


/**
 * 「行的省在想要的集合里吗」过滤器工厂（factors 与 draws 都按 province 格判 ——
 * 分值卡拿抽选做对照锚点时也只按省取；filter 传具名函数）。
 *
 * @param want 想要的省码集。
 * @returns 判定函数。
 */
export function makeProvHit(want: ProvSet): ProvHitFn {
  return function provHit(row: ProvKeyed): boolean {
    return want.has(row.province)
  }
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * 一行抽选(SQL.DIMS_PNP_DRAWS,列已按 camelCase 起别名)→ 抽选事实。
 * invitations 必须带出来 —— 理由见 `DrawFact` 上那条 2026-08-12 红线。
 *
 * @param r 库里的一行。
 * @returns 洗净的抽选事实。
 */
export function toDrawFact(r: Row): DrawFact {
  return {
    province: text(r.province), kind: text(r.kind), drawDate: text(r.drawDate),
    stream: text(r.stream), streamZh: text(r.streamZh),
    score: numOrNull(r.score), invitations: numOrNull(r.invitations),
  }
}

/**
 * 一行官方分值表(SQL.PNP_SCORE_FACTORS)→ `ScoreFactor`。
 * 档位顺序由 SQL 的 `ORDER BY province, factor, seq` 定死 —— 只按 province 排的话,
 * 同一道题的官方档位顺序随 DB 返回(2026-08-16 Frank 实拍:BC 工作地区出成
 * 「Area 3 / Area 1 / Area 2」),并入时把这条红线从 payload.find 的 sort 参数搬进 SQL 消费侧。
 *
 * @param r 库里的一行。
 * @returns 评分域认的形状。
 */
export function toScoreFactor(r: Row): ScoreFactor {
  return {
    province: text(r.province), system: text(r.system), factor: text(r.factor),
    kind: text(r.kind), seq: count(r.seq), label: text(r.label),
    points: numOrNull(r.points), xorPrev: Boolean(r.xor_prev), rule: text(r.rule),
    factorMax: numOrNull(r.factor_max), factorGroup: text(r.factor_group), groupMax: numOrNull(r.group_max),
    passMark: numOrNull(r.pass_mark), maxTotal: numOrNull(r.max_total),
    guideEffective: text(r.guide_effective), fetched: text(r.fetched), url: text(r.url),
  }
}

/**
 * 词汇:解析好的难度 json 里名额竞争那个因子(key='comp')。
 *
 * @param d 解析好的 difficulty json。
 * @returns 因子;没有则 null。
 */
function compFactorOf(d: MaybeDifficulty): MaybeCompFactor {
  if (d == null || d.factors == null) {
    return null
  }
  for (const f of d.factors) {
    if (f != null && f.key === COMP_KEY) {
      return f
    }
  }
  return null
}

/**
 * 词汇:数字格 → 数,缺位折 0(pool/quota/quotaYear 合计列,并入前就是 `|| 0` 的口径)。
 *
 * @param x json 里的数字格。
 * @returns 数;缺位是 0。
 */
function numOrZero(x: NumCell): number {
  const n = numOrNull(x)
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 词汇:上一年流量格 —— 官方缺位或 0 都落 null,0 在这一格的历史含义是「没取到」
 * (IRCC 月度表上一年缺位时源数据是 0),照旧不展示。
 *
 * @param x json 里的上一年格。
 * @returns 上一年数;没有则 null。
 */
function prevYearOf(x: NumCell): MaybeNum {
  const n = numOrNull(x)
  if (n == null || n === 0) {
    return null
  }
  return n
}

/**
 * 词汇:英文月份缩写 → 两位月数;认不出空串(口径期就不带月)。
 *
 * @param name 英文月份缩写(如 'May')。
 * @returns 两位月数或空串。
 */
function monthNumOf(name: string): string {
  const mm = MONTH_NUM[name]
  if (mm == null) {
    return ''
  }
  return mm
}

/**
 * 词汇:流量进行年 complete=false → 口径期带「至几月」;整年空串。
 *
 * @param v 某年的流量格。
 * @returns 两位月数或空串。
 */
function flowMonthOf(v: FlowSeriesEntryJson): string {
  if (v.complete === false) {
    return monthNumOf(text(v.throughMonth))
  }
  return ''
}

/**
 * studyFlow 格 → 新发学签流量(口径红线见 `ProvFlow`)。
 *
 * @param info 解析好的 info json。
 * @returns 流量;缺年份或缺数是 null。
 */
function flowOf(info: ProvInfoJson): MaybeFlow {
  const f = info.studyFlow
  if (f == null) {
    return null
  }
  const n = numOrNull(f.n)
  const year = text(f.year)
  if (year === '' || n == null) {
    return null
  }
  const mm = monthNumOf(text(f.throughMonth))
  let period = year
  if (mm !== '') {
    period = year + PERIOD_SEP + mm
  }
  return { period: period, n: n, prevYear: prevYearOf(f.prev) }
}

/**
 * info json → 年份筛选序列(2026-08-14:存量近 3 年、流量近 5 年、名额 2024–2026)。
 * 流量进行年带「至几月」;缺位一律 null,前端显「—」。三格全缺 = 没有序列。
 *
 * @param info 解析好的 info json。
 * @returns 序列;三格全缺是 null。
 */
function seriesOf(info: ProvInfoJson): MaybeSeries {
  if (info.trSeries == null && info.flowSeries == null && info.alloc == null) {
    return null
  }
  const stocks: Record<string, ProvStockYear> = {}
  if (info.trSeries != null) {
    for (const [y, v] of Object.entries(info.trSeries)) {
      if (v == null) {
        continue
      }
      stocks[y] = { study: numOrNull(v.study), work: numOrNull(v.work), asOf: text(v.asOf) }
    }
  }
  const flow: Record<string, ProvFlowYear> = {}
  if (info.flowSeries != null) {
    for (const [y, v] of Object.entries(info.flowSeries)) {
      if (v == null) {
        continue
      }
      const n = numOrNull(v.n)
      if (n == null) {
        continue
      }
      let period = y
      const mm = flowMonthOf(v)
      if (mm !== '') {
        period = y + PERIOD_SEP + mm
      }
      flow[y] = { n: n, period: period }
    }
  }
  let quota: ProvQuotaYears = { y2024: null, y2025: null, y2026: null }
  if (info.alloc != null) {
    quota = { y2024: numOrNull(info.alloc.y2024), y2025: numOrNull(info.alloc.y2025), y2026: numOrNull(info.alloc.y2026) }
  }
  return { stocks: stocks, flow: flow, quota: quota }
}

/**
 * 词汇:解析好的 info json → flow/series 两格增补(没有 json 就是两格 null)。
 *
 * @param info 解析好的 info json。
 * @returns 两格增补。
 */
function infoExtraOf(info: MaybeProvInfo): ProvInfoExtra {
  if (info == null) {
    return { flow: null, series: null }
  }
  return { flow: flowOf(info), series: seriesOf(info) }
}

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY_FETCHED)→ 难度事实。json 解析(词汇 `jsonOrNull`)
 * 与逐格拆解都在这里做完 —— functions 拿到的每格即有效,那边只剩「这行入不入选」的业务取舍
 * (2026-08-22 Frank:值级清洗不进 functions)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toDifficultyFact(r: DifficultyDbRow): DifficultyFact {
  const d = jsonOrNull(r.difficulty)
  const f = compFactorOf(d)
  let tier = ''
  let generated = ''
  if (d != null) {
    tier = text(d.tier)
    generated = text(d.generated)
  }
  if (generated === '') {
    generated = text(r.fetched)
  }
  let ratio: MaybeNum = null
  let pool = 0
  let quota = 0
  let poolStudy: MaybeNum = null
  let poolWork: MaybeNum = null
  let poolYear = ''
  let quotaYear = 0
  let source = ''
  if (f != null) {
    ratio = numOrNull(f.value)
    pool = numOrZero(f.pool)
    quota = numOrZero(f.quota)
    poolStudy = numOrNull(f.poolStudy)
    poolWork = numOrNull(f.poolWork)
    poolYear = text(f.asOf)
    quotaYear = numOrZero(f.quotaYear)
    source = text(f.source)
  }
  return {
    province: text(r.province), ratio: ratio, tier: tier,
    pool: pool, quota: quota, poolStudy: poolStudy, poolWork: poolWork,
    poolYear: poolYear, quotaYear: quotaYear, generated: generated, source: source,
  }
}

/**
 * 一行省份维度(SQL.PROVINCES_INFO)→ 省份维度事实(json 解析与增补拼装同上口径)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
export function toProvInfoFact(r: ProvInfoDbRow): ProvInfoFact {
  return { code: text(r.code), extra: infoExtraOf(jsonOrNull(r.info)) }
}

// =========================================================================
// 回调(callbacks 抽屉 2026-08-23 撤编后的固定尾段;签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * 各省名额竞争按比值升序 —— 松 → 紧,决策页第二条免费硬事实的展示序。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 比较值。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byRatioAsc(a: ProvCompetition, b: ProvCompetition): number {
  return a.ratio - b.ratio
}
