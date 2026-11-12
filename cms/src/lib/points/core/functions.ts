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

import {
  AGE_AND_OLDER, AGE_LESS_THAN, AGE_MAX, AGE_MORE_THAN, AGE_ONE, AGE_RANGE, AT_LEAST, AUTO_FACTOR, CLB_ANY, CLB_ZERO,
  DEFAULT_SELF, EDU_LADDER, EDU_RANK, GRID_STREAM, GROUP_NONE, KIND, LESS_THAN_ANY, LESS_THAN_HEAD, LINE, MATCHED_NONE,
  MONTHS_ANY, MONTHS_PER_YEAR, NON_ALPHA, NO_EXPERIENCE, SEP, SOURCE, STREAM_NONE, STREAM_STOP, STREAM_WORD_MIN,
  SYSTEM_TAIL, SYSTEM_TAIL_CUT, TICK_SEP, YEARS_ANY,
} from './constants'
import type {
  AgeRangeOut, AutoPickIn, BonusPointsIn, BonusPointsOut, DefaultProfileOut, FactorPartIn, FactorPartOut, GroupCapIn,
  GroupCapOut, HasAutoPickOut, LabelIn, LabelNumOut, LineSideOut, LineStateOut, MarginOut, MatchIn, OneGroup,
  OneGroupOut, PickByAgeIn, PickByThresholdIn, PickOut, RangeGroup, RangeGroupOut, RowsOfIn, RowsOfOut, ScoreFactor,
  ScoreLineIn, ScorePart, ScoreProvinceIn, ScoreProvinceOut, ScoreSource, StreamMatchesIn, StreamMatchesOut,
  StreamWordsIn, StreamWordsOut, SystemIn, SystemOut, ThresholdRow, TotalOfIn, TotalOfOut,
} from './types'

// =========================================================================
// 1. 正则的具名捕获组
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
export function oneGroupOf(input: MatchIn): OneGroupOut {
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
export function rangeGroupOf(input: MatchIn): RangeGroupOut {
  const m = input.re.exec(input.text)
  if (m == null || m.groups == null) {
    return null
  }
  return m.groups as RangeGroup
}

// =========================================================================
// 2. 通道名匹配
// =========================================================================

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
// 3. 从官方标签里解析可比较的数字
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
// 4. 挑档
// =========================================================================

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
// 5. 算一个省的分
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
  const head = all[0]
  if (head == null) {
    return null
  }

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
  const mineFirst = mine[0]
  if (mineFirst != null) {
    group = mineFirst.factorGroup || GROUP_NONE
    if (mineFirst.factorMax != null) {
      max = mineFirst.factorMax
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
  for (const [i, b] of list.entries()) {
    const on = Boolean(input.ticks[`${input.prefix}${TICK_SEP}${i}`])
    let bPts = 0
    if (b.points != null) {
      bPts = b.points
    }
    let mine = 0
    if (on) {
      mine = bPts
    }
    const nextB = list[i + 1]
    if (nextB != null && nextB.xorPrev) {
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
// 6. 估分 × 抽选线
// =========================================================================

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
