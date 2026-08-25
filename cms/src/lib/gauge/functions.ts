/**
 * 量尺:把**官方门槛**与**用户情况**对照,输出可核验的逐条判定。
 *
 * 纯函数、无 IO、前后端同构;**阈值一个都不许写在这里** —— 全部来自 `pnp_requirements`
 * (官方页抓取入库)。加省 = 数据层加一个 `build_<省>_req.py`;加因素 = 这里加一个函数。
 *
 * 三条铁律:
 *   ① `unknown` 是一等公民 —— 门槛没收录、或答案不足以判定,一律 unknown,**不猜、不按别省推**;
 *   ② 只说「达标 / 差 N」,不说「你能移民 / 不能移民」;
 *   ③ 判定不确定时宁可 unknown:能确定的那一半照说(见 `incomeVerdict` 的下界推理)。
 *
 * @author Frank
 * @time 2026-08-20 21:35:00
 */

import {
  AREA, AREA_PROV, BASIS, COND_NONE, DEFAULT_FAMILY_SIZE, EMP_TIERED, FACTOR, GTA, ITEM, LIST_NONE, LIST_SEP,
  METRO_VAN, MONTHS_PER_YEAR, NAME_NONE, NOC_GENERIC, NOC_MISS, NON_LETTERS, NON_LETTERS_REPL, ON_LISTED, OP,
  ST_JOHNS, SUBJECT, UNIT,
} from './constants'
import type {
  AreaOfPlaceIn, AreaOfPlaceOut, AreasForIn, AreasForOut, BarRowIn, BarRowOut, EmployerBarIn, EmployerBarOut,
  EvaluateRequirementsIn, EvaluateRequirementsOut, EvidenceOfIn, EvidenceOfOut, ExpMonthsIn, ExpMonthsOut,
  ExperienceVerdictIn, ExperienceVerdictOut, FactorIn, FactorManyOut, FactorOneOut, IncomeVerdictIn,
  IncomeVerdictOut, MatchesAnyIn, MatchesAnyOut, NocScoreIn, NocScoreOut, NormalizeNameIn, NormalizeNameOut,
  PickIncomeRowIn, PickIncomeRowOut, PickLanguageRowIn, PickLanguageRowOut, PlaceNamesIn, PlaceNamesOut,
  PrefixListIn, PrefixListOut, Requirement, RowsOfFactorIn, AreaTier, PushOneIn, PushOneOut, RowsOfFactorOut,
  RuleResult, ScoredRow, TeerHitIn, TeerHitOut, NoExperienceBarIn, NoExperienceBarOut, TiersOfIn, TiersOfOut,
  YearsOfIn, YearsOfOut,
} from './types'
// =========================================================================
// 1. 地点 → 官方分档区域
// =========================================================================

/**
 * 地名规范化:小写、只留字母与空格、去掉首尾空白。
 *
 * 官方枚举表里的条目写的就是这个形态,两边同一把尺才比得上。
 *
 * @param s 原始地名。
 * @returns 规范化后的地名。
 */
function normalizeName(s: NormalizeNameIn): NormalizeNameOut {
  return (s || NAME_NONE).toLowerCase().replace(NON_LETTERS, NON_LETTERS_REPL).trim()
}

/**
 * 岗位地点 → 该省官方分档区域键(与 `pnp_requirements.appliesArea` 同一套值)。
 *
 * 🔴 **认不出返回空**,不硬塞档位 —— 上游据此只摆能确定的那半
 * (如 ON 认不出普查区时只说雇员数,不说营业额)。档位说低了比不说更糟。
 *
 * ON 那一支的兜底是 `outside-gta`:境内、认得出地名、但不在上面两张表里 —— 那就是 GTA 外
 * (营业额档另说,见 `revenueAreas`)。BC / NL 同理。
 *
 * @param input 省码、城市与区名。
 * @returns 区域键;认不出则空。
 */
export function areaOfPlace(input: AreaOfPlaceIn): AreaOfPlaceOut {
  const names = placeNames({ city: input.city, district: input.district })
  if (input.province === AREA_PROV.on) {
    if (matchesAny({ names: names, list: GTA })) {
      return AREA.gta
    }
    if (matchesAny({ names: names, list: ON_LISTED })) {
      return AREA.onListedCd
    }
    if (names.length > 0) {
      return AREA.outsideGta
    }
    return AREA.unknown
  }
  if (input.province === AREA_PROV.bc) {
    if (matchesAny({ names: names, list: METRO_VAN })) {
      return AREA.metroVancouver
    }
    if (names.length > 0) {
      return AREA.restOfBc
    }
    return AREA.unknown
  }
  if (input.province === AREA_PROV.nl) {
    if (matchesAny({ names: names, list: ST_JOHNS })) {
      return AREA.stJohns
    }
    if (names.length > 0) {
      return AREA.restOfNl
    }
    return AREA.unknown
  }
  return AREA.unknown
}

/**
 * 候选地名:规范化并去空,**区名在前** —— 区比城市具体。
 *
 * @param input 城市与区名。
 * @returns 候选地名。
 */
function placeNames(input: PlaceNamesIn): PlaceNamesOut {
  const out: string[] = []
  for (const one of [normalizeName(input.district), normalizeName(input.city)]) {
    if (one) {
      out.push(one)
    }
  }
  return out
}

/**
 * 候选地名里有没有落在那张官方名单上的。
 *
 * @param input 候选地名与官方名单。
 * @returns 有则 true。
 */
function matchesAny(input: MatchesAnyIn): MatchesAnyOut {
  for (const one of input.names) {
    if (input.list.includes(one)) {
      return true
    }
  }
  return false
}

// =========================================================================
// 2. 雇主侧门槛值
// =========================================================================

/**
 * 该省雇主侧门槛:经营年限(全省一档)+ 该区域的营业额与全职雇员数。
 *
 * 分档省(BC / ON / NL)认不出区域时雇员 / 营业额留空 —— **宁缺不猜**;
 * 不分区省(AB 三项 `appliesArea` 全空)区档落空后回落通用行 —— 全省一档没有可猜的。
 *
 * @param input 门槛行、省码与区域键。
 * @returns 三个门槛值;取不到的留 null。
 */
export function employerBar(input: EmployerBarIn): EmployerBarOut {
  const rows: Requirement[] = []
  for (const r of input.reqs) {
    if (r.province === input.province && r.subject === SUBJECT.employer) {
      rows.push(r)
    }
  }
  const revenueRow = barRow({
    rows: rows, factor: FACTOR.empRevenue, areas: revenueAreas({ area: input.area }),
  })
  let revenue: number | null = null
  if (revenueRow != null) {
    revenue = revenueRow.value
  }
  const staffRow = barRow({
    rows: rows, factor: FACTOR.empStaff, areas: staffAreas({ area: input.area }),
  })
  let staff: number | null = null
  if (staffRow != null) {
    staff = staffRow.value
  }
  return {
    years: yearsOf({
      row: barRow({ rows: rows, factor: FACTOR.empYears, areas: [AREA.unknown] }),
    }),
    revenue: revenue,
    staff: staff,
  }
}

/**
 * 挑一行:先按区域挑,挑不到再回落 `appliesArea` 为空的通用行。
 *
 * 分档省没有通用行(回落自然落空,宁缺不猜不破);AB 这类全省一档的省靠它取到数 ——
 * 原先 `area` 恒空(`areaOfPlace` 只判 ON / BC / NL)导致 AB 三项永远取不到。
 *
 * @param input 该省的雇主侧门槛行、因素与要挑的区域。
 * @returns 挑中的那一行;没有则 null。
 */
function barRow(input: BarRowIn): BarRowOut {
  const rs: Requirement[] = []
  for (const r of input.rows) {
    if (r.factor === input.factor) {
      rs.push(r)
    }
  }
  for (const r of rs) {
    if (input.areas.includes(r.appliesArea)) {
      return r
    }
  }
  for (const r of rs) {
    if (r.appliesArea === AREA.unknown) {
      return r
    }
  }
  return null
}

/**
 * 雇员数按哪几个区域挑行。
 *
 * ON 点名普查区的雇员档併回 GTA 外 —— **官方雇员数只分 GTA 内外**;
 * BC / NL 的区键与行一一对应。
 *
 * @param input 区域键。
 * @returns 要挑的区域。
 */
function staffAreas(input: AreasForIn): AreasForOut {
  if (input.area === AREA.onListedCd) {
    return [AREA.outsideGta]
  }
  if (input.area !== '') {
    return [input.area]
  }
  return []
}

/**
 * 营业额按哪几个区域挑行。
 *
 * ON 分三档:GTA / 官方点名普查区 / 其余。认不出普查区(`outside-gta`)时**不给数** ——
 * 那一档的阈值取决于是不是那 14 个普查区之一,认不出就没法定。
 *
 * @param input 区域键。
 * @returns 要挑的区域;不给数则空。
 */
function revenueAreas(input: AreasForIn): AreasForOut {
  if (input.area === AREA.onListedCd) {
    return [AREA.onListedCd]
  }
  if (input.area === AREA.gta) {
    return [AREA.gta]
  }
  if (input.area === AREA.outsideGta) {
    return []
  }
  if (input.area !== '') {
    return [input.area]
  }
  return []
}

/**
 * 经营年限:官方原文用月的(SK)统一换算成年,与雇主判定同口径。
 *
 * @param input 经营年限那一行。
 * @returns 年;没有则 null。
 */
function yearsOf(input: YearsOfIn): YearsOfOut {
  const row = input.row
  if (row == null || row.value == null) {
    return null
  }
  if (row.unit === UNIT.months) {
    return row.value / MONTHS_PER_YEAR
  }
  return row.value
}

// =========================================================================
// 3. 挑行的两把尺:TEER 与 NOC
// =========================================================================

/**
 * 这一行适用于他的 TEER 吗。
 *
 * 不分 TEER 的行对谁都适用;分 TEER 但不知道 TEER → 挑不出行(上游落成 unknown)。
 *
 * @param input 门槛行与他的 TEER。
 * @returns 适用则 true。
 */
export function teerHit(input: TeerHitIn): TeerHitOut {
  if (input.r.appliesTeer === '') {
    return true
  }
  if (input.teer == null) {
    return false
  }
  for (const one of input.r.appliesTeer.split(LIST_SEP)) {
    if (Number(one.trim()) === input.teer) {
      return true
    }
  }
  return false
}

/**
 * NOC 前缀匹配,返回「有多具体」。
 *
 * ON 的技工白名单存的是官方大组码(72 / 6320 / 62200…)。命中长度即具体程度 ——
 * 同一因素有多行都适用时取最具体的那一行:**官方就是这么读的**(技工那条是通用条款的例外,
 * 不是并列条款)。
 *
 * @param input 门槛行与他的职业码。
 * @returns 命中长度;不适用则 `NOC_MISS`。
 */
function nocScore(input: NocScoreIn): NocScoreOut {
  const noc = input.noc
  const ex = prefixList({ text: input.r.excludesNoc || LIST_NONE })
  for (const p of ex) {
    if (noc && noc.startsWith(p)) {
      return NOC_MISS
    }
  }
  const inc = prefixList({ text: input.r.appliesNoc || LIST_NONE })
  if (inc.length === 0) {
    return NOC_GENERIC
  }
  if (noc == null || noc === '') {
    return NOC_MISS
  }
  const hits: string[] = []
  for (const p of inc) {
    if (noc.startsWith(p)) {
      hits.push(p)
    }
  }
  hits.sort(byLengthDesc)
  if (hits.length === 0) {
    return NOC_MISS
  }
  return hits[0].length
}

/**
 * 逗号分隔的 NOC 码前缀清单 → 去空的数组。
 *
 * @param input 清单原文。
 * @returns 前缀。
 */
function prefixList(input: PrefixListIn): PrefixListOut {
  const out: string[] = []
  for (const one of input.text.split(LIST_SEP)) {
    const t = one.trim()
    if (t) {
      out.push(t)
    }
  }
  return out
}

/**
 * 一行门槛的出处。
 *
 * @param input 门槛行。
 * @returns 出处。
 */
function evidenceOf(input: EvidenceOfIn): EvidenceOfOut {
  const r = input.r
  return {
    label: r.label, url: r.url, fetched: r.fetched, section: r.section, effective: r.effective,
  }
}

/**
 * 按因素与主体挑出那几行。
 *
 * @param input 门槛行、因素与主体。
 * @returns 那几行,保持原序。
 */
function rowsOfFactor(input: RowsOfFactorIn): RowsOfFactorOut {
  const out: Requirement[] = []
  for (const r of input.reqs) {
    if (r.factor === input.factor && r.subject === input.subject) {
      out.push(r)
    }
  }
  return out
}

// =========================================================================
// 4. 逐因素判定
// =========================================================================

/**
 * 一个省的门槛 → 一组判定。
 *
 * 入参 `reqs` **已按省筛过**(引擎不查库、不认省名)。
 * 输出顺序固定:语言 → 收入 → 经验 → 语言免考 → 工资 → 雇主侧 ——
 * 报告里的行序不随数据库行序漂。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 一组判定。
 */
export function evaluateRequirements(input: EvaluateRequirementsIn): EvaluateRequirementsOut {
  const out: RuleResult[] = []
  const one: FactorIn = { reqs: input.reqs, profile: input.profile }
  pushOne({ out: out, row: languageResult(one) })
  pushOne({ out: out, row: incomeResult(one) })
  pushOne({ out: out, row: tenureResult(one) })
  pushOne({ out: out, row: experienceResult(one) })
  pushOne({ out: out, row: languageExemptResult(one) })
  pushOne({ out: out, row: wageResult(one) })
  pushOne({ out: out, row: employerYearsResult(one) })
  for (const row of employerTieredResults(one)) {
    out.push(row)
  }
  return out
}

/**
 * 有这一行就收进来。
 *
 * @param input 收集器与那一行。
 * @returns 没有返回值。
 */
function pushOne(input: PushOneIn): PushOneOut {
  if (input.row) {
    input.out.push(input.row)
  }
}

/**
 * 语言:先按 TEER 挑行,再按职业挑**最具体**的那行(ON:技工 CLB 5 是通用 CLB 6 的例外)。
 *
 * 官方对 BC TEER 0/1 写的是「注册时不强制交成绩」(`op='none'`),那不等于「没有语言要求」——
 * 措辞照官方,判定给 pass 但句子里说清是「这档不设注册门槛」。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那一行;挑不出行则 null。
 */
function languageResult(input: FactorIn): FactorOneOut {
  const lang = pickLanguageRow({
    rows: rowsOfFactor({ reqs: input.reqs, factor: FACTOR.language, subject: SUBJECT.applicant }),
    profile: input.profile,
  })
  if (lang == null) {
    return null
  }
  const clb = input.profile.clb
  if (lang.op === OP.none) {
    return {
      factor: FACTOR.language, subject: SUBJECT.applicant, verdict: ITEM.pass, need: null,
      needLow: null, have: clb, short: null, unit: lang.unit, basis: null, tiers: null, evidence: evidenceOf({ r: lang }),
    }
  }
  if (clb == null || lang.value == null) {
    return {
      factor: FACTOR.language, subject: SUBJECT.applicant, verdict: ITEM.unknown, need: lang.value,
      needLow: null, have: clb, short: null, unit: lang.unit, basis: null, tiers: null, evidence: evidenceOf({ r: lang }),
    }
  }
  const ok = clb >= lang.value
  let verdict: RuleResult['verdict'] = ITEM.fail
  let short: number | null = lang.value - clb
  if (ok) {
    verdict = ITEM.pass
    short = null
  }
  return {
    factor: FACTOR.language, subject: SUBJECT.applicant, verdict: verdict,
    need: lang.value, needLow: null, have: clb, short: short,
    unit: lang.unit, basis: null, tiers: null, evidence: evidenceOf({ r: lang }),
  }
}

/**
 * 语言那几行里最具体的一行:先按 TEER 筛,再按 NOC 具体度排。
 *
 * @param input 语言那几行与他的情况。
 * @returns 那一行;一行都不适用则 null。
 */
function pickLanguageRow(input: PickLanguageRowIn): PickLanguageRowOut {
  const scored: ScoredRow[] = []
  for (const r of input.rows) {
    if (teerHit({ r: r, teer: input.profile.teer }) === false) {
      continue
    }
    const s = nocScore({ r: r, noc: input.profile.noc })
    if (s >= 0) {
      scored.push({ r: r, s: s })
    }
  }
  scored.sort(byScoreDesc)
  if (scored.length === 0) {
    return null
  }
  return scored[0].r
}

/**
 * 最低家庭收入:二维表(家庭人数 × 区域)。
 *
 * 两处不知道就用**下界推理**,能定的那一半照定:
 *   · 家庭人数不知道 → 用 1 人档(官方表里最低的一档)。低于它 = 任何家庭人数都低于 → fail 是确定的;
 *     高于它只能说「1 人家庭达标」,人多了门槛更高 → unknown。
 *   · 区域不知道 → 高于大温档(高档)= 住哪都达标;低于 BC 其余档(低档)= 住哪都不达标;中间 unknown。
 *
 * `need` 取哪一档:**区域已知 = 该区域那一档;未知 = 高档**(高档都够 = 住哪都够),
 * 低档只在区域未知时才有值,它是 `incomeVerdict` 判 fail 的那条下界。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那一行;这个省没有收入表则 null。
 */
function incomeResult(input: FactorIn): FactorOneOut {
  const rows = rowsOfFactor({ reqs: input.reqs, factor: FACTOR.income, subject: SUBJECT.applicant })
  if (rows.length === 0) {
    return null
  }
  const p = input.profile
  let size: number = DEFAULT_FAMILY_SIZE
  if (p.familySize != null) {
    size = p.familySize
  }
  const metro = pickIncomeRow({ rows: rows, area: AREA.metroVancouver, size: size })
  const rest = pickIncomeRow({ rows: rows, area: AREA.restOfBc, size: size })
  const areaKnown = p.area != null && p.area !== ''
  let row = metro
  if (row == null) {
    row = rest
  }
  if (areaKnown) {
    const byArea = pickIncomeRow({ rows: rows, area: p.area as string, size: size })
    if (byArea != null) {
      row = byArea
    }
  }
  if (row == null) {
    return null
  }
  let hi = row.value
  if (areaKnown === false && metro != null && metro.value != null) {
    hi = metro.value
  }
  let lo: number | null = null
  if (areaKnown === false && rest != null) {
    lo = rest.value
  }
  const judged = incomeVerdict({
    have: p.annualIncome, hi: hi, lo: lo, sizeKnown: p.familySize != null,
  })
  return {
    factor: FACTOR.income, subject: SUBJECT.applicant, verdict: judged.verdict, need: hi,
    needLow: lo, have: p.annualIncome, short: judged.short, unit: row.unit,
    basis: null, tiers: null, evidence: evidenceOf({ r: row }),
  }
}

/**
 * 收入表挑行:先按「该区域 + 该家庭人数」挑,挑不到退回该区域的 1 人档。
 *
 * @param input 收入表那几行、区域与家庭人数。
 * @returns 那一行;没有则 null。
 */
function pickIncomeRow(input: PickIncomeRowIn): PickIncomeRowOut {
  for (const r of input.rows) {
    if (r.appliesArea === input.area && r.familySize === input.size) {
      return r
    }
  }
  for (const r of input.rows) {
    if (r.appliesArea === input.area && r.familySize === DEFAULT_FAMILY_SIZE) {
      return r
    }
  }
  return null
}

/**
 * 收入的下界推理:只有**两头**是硬结论,中间地带如实留白。
 *
 * 判 fail 看的是**最低那一档**(`lo ?? hi`):最低的一档都够不到 = 住哪、几口人都不达标,
 * 这句是确定的。判 pass 要**最高那一档也够 + 人数已知**,两个条件缺一不可 ——
 * 人数未知时门槛只会更高。其余一律 unknown:只摆门槛,不下判定。
 *
 * @param input 他的收入、高低两档与家庭人数答没答。
 * @returns 判定与差额。
 */
function incomeVerdict(input: IncomeVerdictIn): IncomeVerdictOut {
  const have = input.have
  const hi = input.hi
  if (have == null || hi == null) {
    return { verdict: ITEM.unknown, short: null }
  }
  let floor = hi
  if (input.lo != null) {
    floor = input.lo
  }
  if (have < floor) {
    return { verdict: ITEM.fail, short: floor - have }
  }
  if (have >= hi && input.sizeKnown) {
    return { verdict: ITEM.pass, short: null }
  }
  return { verdict: ITEM.unknown, short: null }
}

/**
 * 「在这家雇主连续全职干了多久」那一档(MB SWM 6 个月 / 外省毕业 1 年)。
 *
 * 🔴 **口径隔离**:它量的**不是**本站问的同职业总经验。拿总经验去判它,「海外干过 5 年」
 * 会被判成达标 —— 那是假话;判 fail 也是假话(本站根本没问过在职时长)。
 * 所以这类行**只摆门槛不判定**,而且必须摆:那句话正是「外省毕业生怎么走曼省」的答案,
 * 藏起来等于告诉用户曼省没这条路。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那一行;没有这类行则 null。
 */
function tenureResult(input: FactorIn): FactorOneOut {
  const rows: Requirement[] = []
  for (const r of experienceRows(input)) {
    if (r.basis === BASIS.employerTenure && r.value != null) {
      rows.push(r)
    }
  }
  if (rows.length === 0) {
    return null
  }
  rows.sort(byValueAsc)
  let tiers: RuleResult['tiers'] = tiersOfCondition({ rows: rows })
  if (rows.length <= 1) {
    tiers = null
  }
  return {
    factor: FACTOR.experience, subject: SUBJECT.applicant, basis: BASIS.employerTenure,
    verdict: ITEM.unknown, need: rows[0].value, needLow: null, have: null, short: null,
    unit: rows[0].unit,
    tiers: tiers,
    evidence: evidenceOf({ r: rows[0] }),
  }
}

/**
 * 两档并列时的档位:档名用 `appliesCondition`,每档挂**自己那一行**的原文。
 *
 * @param input 那几行。
 * @returns 档位。
 */
function tiersOfCondition(input: TiersOfIn): TiersOfOut {
  const out: AreaTier[] = []
  for (const r of input.rows) {
    out.push({ area: r.appliesCondition || COND_NONE, value: r.value })
  }
  return out
}

/**
 * 工作经验:官方要的是「境内外都算」的技术工作经验。
 *
 * 口径:两个都答就取大的(加拿大经验是总经验的子集);只答了加拿大经验且不够 → 仍是 unknown
 * (海外那截没问,不能判 fail);总经验答了且不够 → fail。
 *
 * 分 TEER 的经验门槛按 TEER 挑行(PE:Skilled Worker 通道 24 个月只对 TEER 0-3 ——
 * TEER 4/5 的 Critical Worker 官方给了「2 年经验**或**相关学历」的替代路径,当硬门槛会误判)。
 * 差额里的 `as number` 是既有断言原样保留:判 fail 的前提就是 have 非空(experienceVerdict 的判据)。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那一行;没有可判的经验行则 null。
 */
function experienceResult(input: FactorIn): FactorOneOut {
  let exp: Requirement | null = null
  for (const r of experienceRows(input)) {
    if (r.basis !== BASIS.employerTenure) {
      exp = r; break 
    }
  }
  if (exp == null) {
    return null
  }
  const p = input.profile
  if (exp.op === OP.none) {
    return noExperienceBar({ row: exp, profile: p })
  }
  if (exp.value == null) {
    return null
  }
  const have = expMonths({ profile: p })
  const verdict = experienceVerdict({
    have: have, need: exp.value, totalAnswered: p.totalExpMonths != null,
  })
  let short: number | null = null
  if (verdict === ITEM.fail) {
    short = exp.value - (have as number)
  }
  return {
    factor: FACTOR.experience, subject: SUBJECT.applicant, verdict: verdict, need: exp.value,
    needLow: null, have: have,
    short: short,
    unit: exp.unit, basis: null, tiers: null, evidence: evidenceOf({ r: exp }),
  }
}

/**
 * 「这条通道**官方明说不设经验门槛**」那一行(`op='none'`,照 language 那支的先例)。
 *
 * 🔴 **「没有门槛」和「没查到门槛」是两件事**,前者是这条通道最值钱的性质,不能因为它
 * 没有数字就当不存在。2026-08-05 之前这里只认 `value != null`,于是这类行在三层里被静默丢掉,
 * 结果「0 经验去哪个省」永远得到「各省都要求经验」—— 而 NL International Graduate 的
 * 官方资格清单里根本没有经验这一项。
 *
 * @param input 那一行与他的情况。
 * @returns 那一行判定。
 */
function noExperienceBar(input: NoExperienceBarIn): NoExperienceBarOut {
  const p = input.profile
  let have: number | null = null
  if (p.totalExpMonths != null) {
    have = p.totalExpMonths
  } else if (p.canadianExpMonths != null) {
    have = p.canadianExpMonths
  }
  return {
    factor: FACTOR.experience, subject: SUBJECT.applicant, verdict: ITEM.pass, need: null,
    needLow: null, have: have, short: null,
    unit: input.row.unit, basis: null, tiers: null, evidence: evidenceOf({ r: input.row }),
  }
}

/**
 * 经验那几行,已按 TEER 筛过。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那几行。
 */
function experienceRows(input: FactorIn): RowsOfFactorOut {
  const out: Requirement[] = []
  const rows = rowsOfFactor({
    reqs: input.reqs, factor: FACTOR.experience, subject: SUBJECT.applicant,
  })
  for (const r of rows) {
    if (teerHit({ r: r, teer: input.profile.teer })) {
      out.push(r)
    }
  }
  return out
}

/**
 * 取到的经验月数:两个都答就取大的(加拿大经验是总经验的子集)。
 *
 * @param input 他的情况。
 * @returns 月数;都没答则 null。
 */
function expMonths(input: ExpMonthsIn): ExpMonthsOut {
  let out: number | null = null
  for (const v of [input.profile.totalExpMonths, input.profile.canadianExpMonths]) {
    if (v == null) {
      continue
    }
    if (out == null || v > out) {
      out = v
    }
  }
  return out
}

/**
 * 经验判定:**只答了加拿大经验且不够,仍是判不了** —— 海外那截没问,不能判 fail。
 *
 * @param input 取到的月数、官方阈值与总经验答没答。
 * @returns 判定。
 */
function experienceVerdict(input: ExperienceVerdictIn): ExperienceVerdictOut {
  if (input.have == null) {
    return ITEM.unknown
  }
  if (input.have >= input.need) {
    return ITEM.pass
  }
  if (input.totalAnswered) {
    return ITEM.fail
  }
  return ITEM.unknown
}

/**
 * 语言免考条款(ON):官方允许指定安省学历免考。
 *
 * 本站没问学历 → **只陈述,不拿它改语言判定**。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那一行;没有这条则 null。
 */
function languageExemptResult(input: FactorIn): FactorOneOut {
  const rows = rowsOfFactor({
    reqs: input.reqs, factor: FACTOR.languageExempt, subject: SUBJECT.applicant,
  })
  for (const r of rows) {
    if (teerHit({ r: r, teer: input.profile.teer }) === false) {
      continue
    }
    return {
      factor: FACTOR.languageExempt, subject: SUBJECT.applicant, verdict: ITEM.unknown,
      need: r.value, needLow: null, have: null, short: null, unit: r.unit,
      basis: null, tiers: null, evidence: evidenceOf({ r: r }),
    }
  }
  return null
}

/**
 * 工资档(ON):阈值不是绝对数,而是「该职业该地区的中位」(`basis='occMedian'`)。
 *
 * 所以 `need` 取该职业该省的官方中位年薪,而 `have` 只有逐岗才有(报告层没有具体岗位)→ unknown。
 * 这条的价值不在判定,在于把「拿到 offer 该对着哪个数看」写清楚。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那一行;没有工资档则 null。
 */
function wageResult(input: FactorIn): FactorOneOut {
  const rows = rowsOfFactor({ reqs: input.reqs, factor: FACTOR.wage, subject: SUBJECT.applicant })
  if (rows.length === 0) {
    return null
  }
  const wage = rows[0]
  let need = wage.value
  if (wage.basis === BASIS.occMedian) {
    need = input.profile.annualIncome
  }
  return {
    factor: FACTOR.wage, subject: SUBJECT.applicant, verdict: ITEM.unknown,
    need: need,
    needLow: null, have: null, short: null, unit: wage.unit, basis: null, tiers: null, evidence: evidenceOf({ r: wage }),
  }
}

/**
 * 雇主经营年限。
 *
 * 雇主侧这类事实**本站没有**,一律 unknown 并说明要雇主出材料 ——
 * 照实说比不说强,用户至少知道去问雇主什么。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那一行;没有这条则 null。
 */
function employerYearsResult(input: FactorIn): FactorOneOut {
  const rows = rowsOfFactor({
    reqs: input.reqs, factor: FACTOR.empYears, subject: SUBJECT.employer,
  })
  if (rows.length === 0) {
    return null
  }
  const row = rows[0]
  return {
    factor: FACTOR.empYears, subject: SUBJECT.employer, verdict: ITEM.unknown, need: row.value,
    needLow: null, have: null, short: null, unit: row.unit, basis: null, tiers: null, evidence: evidenceOf({ r: row }),
  }
}

/**
 * 雇主侧分档的两条(雇员数两档、ON 营业额三档)。
 *
 * 按**阈值大小**取高低档,**不认省专有的区域名** —— 加省时区域名各叫各的
 * (metro-vancouver / gta / …),按名字挑行等于每加一个省改一次引擎。
 *
 * @param input 该省的门槛行与他的情况。
 * @returns 那几行。
 */
function employerTieredResults(input: FactorIn): FactorManyOut {
  const out: RuleResult[] = []
  for (const factor of EMP_TIERED) {
    const rows: Requirement[] = []
    const all = rowsOfFactor({ reqs: input.reqs, factor: factor, subject: SUBJECT.employer })
    for (const r of all) {
      if (r.value != null) {
        rows.push(r)
      }
    }
    if (rows.length === 0) {
      continue
    }
    rows.sort(byValueDesc)
    let needLow: number | null = null
    if (rows.length > 1) {
      needLow = rows[rows.length - 1].value
    }
    out.push({
      factor: factor, subject: SUBJECT.employer, verdict: ITEM.unknown, need: rows[0].value,
      needLow: needLow,
      have: null, short: null, unit: rows[0].unit, basis: null, evidence: evidenceOf({ r: rows[0] }),
      tiers: tiersOfArea({ rows: rows }),
    })
  }
  return out
}

/**
 * 按区域的档位。
 *
 * @param input 那几行。
 * @returns 档位。
 */
function tiersOfArea(input: TiersOfIn): TiersOfOut {
  const out: AreaTier[] = []
  for (const r of input.rows) {
    out.push({ area: r.appliesArea, value: r.value })
  }
  return out
}

// =========================================================================
// 回调(callbacks 抽屉 2026-08-23 撤编后的固定尾段;签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * 按字符串长度降序 —— NOC 前缀里最长的那个最具体。
 *
 * @param a 前一个。
 * @param b 后一个。
 * @returns 负数 = a 排在前面。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byLengthDesc(a: string, b: string): number {
  return b.length - a.length
}

/**
 * 按「有多具体」降序 —— 最具体的那一行排最前。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byScoreDesc(a: ScoredRow, b: ScoredRow): number {
  return b.s - a.s
}

/**
 * 按阈值升序。调用方已滤掉 `value` 为空的行,所以这里的 `?? 0` 永远走不到。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byValueAsc(a: Requirement, b: Requirement): number {
  let av = 0
  if (a.value != null) {
    av = a.value
  }
  let bv = 0
  if (b.value != null) {
    bv = b.value
  }
  return av - bv
}

/**
 * 按阈值降序。调用方已滤掉 `value` 为空的行,所以这里的 `?? 0` 永远走不到。
 *
 * @param a 前一行。
 * @param b 后一行。
 * @returns 负数 = a 排在前面。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byValueDesc(a: Requirement, b: Requirement): number {
  let av = 0
  if (a.value != null) {
    av = a.value
  }
  let bv = 0
  if (b.value != null) {
    bv = b.value
  }
  return bv - av
}
