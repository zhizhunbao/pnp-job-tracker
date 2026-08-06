// C5a-1 · 联邦 CRS(排名分)与 FSW67(资格分)估分器。
// docs/implementation/C5-判定层pathVerdict-20260805.md §三/§四 C5a-1;金标见 §二/配偶因素节
// docs/design/案例C01-马龙木匠路径-路径分析-20260805.md。
//
// 铁律(与 pnpSelfScore.ts / mbEoiEstimate.ts 同一条):**分值一分都不许在这里编**,
// 全部来自 ee_points_grid 的 `points` 字段;这里只负责「你的档案对应官方表哪一行」。
// 档位匹配从官方标签自身解析数字/区间(照 pnpSelfScore 的 yearsOf/clbOf/ageRangeOf 手法),
// 不写死表内容 —— 官方改版加一档,这里自动跟着走。
//
// 纯函数 + rows 入参(不连库),消费方(pathVerdict.ts / lookupCrs 的 SQL 结果)自己喂真实行进来。
//
// ⚠️ 与设计文档的一处已知偏差(2026-08-05 核对,写在这里别再踩):
// 案例文档写「已婚 40 岁 CRS ≈ 185(年龄 47 + 学历 91 + CLB6 32 + 加拿大学习 15)」。
// 但 ee_points_grid 里 CRS 官方表 "40 years of age" × "With a spouse" 一行的 points 是 **45**,不是 47
// (this repo's own scraped grid — 40 岁单身档是 50,与文档"配偶不随行 199 = 50+98+36+15"逐项对得上,
// 说明文档作者单身档算对了、已婚档抄错了一格:45+91+32+15 = **183**,不是 185)。
// 本文件按 ee_points_grid 的真实行走(不许为了凑 185 而硬编 47),married 金标断言的是 **183**,
// 并在测试里把这处偏差写清楚,不是本文件的 bug。single/199 完全吻合,原样保留为硬断言。

export type EduKeyLite =
  | 'doctorate' | 'master' | 'bachelor' | 'tradeCert' | 'diploma2y' | 'cert1y' | 'highschool'

/** VerdictProfile(C5 契约,lib/pathVerdict.ts)的子集 —— 本文件只消费这几个字段,类型在这里自己声明。 */
export type CrsEstimateProfile = {
  age: number | null
  married: boolean | null        // 配偶是否随行申请(C5 口径);null/false 都走 without-spouse 表
  clb: number | null             // 四项最低(首官方语言)
  edu: EduKeyLite | null
  eduYears: number | null        // 学制年数
  canadaStudy: boolean | null    // 有无加拿大学历
  expCanadaMonths: number | null
  expForeignMonths: number | null
}

/** ee_points_grid 一行(data/mart/ee_points_grid.json 的实况字段,camelCase 与 lookupCrs 的 SQL 映射同名)。 */
export type EeGridRow = {
  grid: string
  section: string
  sectionLabel: string
  kind: string
  tableNo: number | null
  heading: string
  factor: string
  criterion: string
  columnLabel: string
  points: number | null          // 官方 n/a 时为 null,不折成 0(见 pointsText)
  pointsText: string
  seq: number | null
  url: string
  fetched: string
}

export type Evidence = { url: string; fetched: string; label?: string }

export type EstimateItem = {
  factor: string                 // 内部键,如 'age' / 'edu' / 'lang1'
  label: string                  // 人话短名
  points: number                 // 官方行抄来的分(needs-info/未命中档时为 0)
  matched: string                // 命中的官方 criterion/columnLabel(核对用),未命中为空串
  evidence: Evidence | null
  status: 'matched' | 'zero' | 'needs-info'   // matched=命中且>0;zero=命中但官方档=0或确定不适用;needs-info=缺输入/查不到能用的行
}

export type EstimateResult = {
  total: number
  breakdown: EstimateItem[]
  withSpouse: boolean
  needsInfo: string[]            // breakdown 里 status='needs-info' 的 factor 键,供上游反问用
}

// ── 从官方标签解析可比较的数字(通用于 CRS 与 FSW67)──────────────────────────

/** 年龄区间:兼容 CRS「40 years of age」「45 years of age or more」「20 to 29 years of age」
 * 与 FSW67「Under 18」「18-35」「47 and older」「36」这几种写法。 */
function ageRangeOf(label: string): [number, number] | null {
  const s = label.trim()
  let m = /^under\s+(\d+)/i.exec(s)
  if (m) return [0, Number(m[1]) - 1]
  m = /^(\d+)\s*years of age or less$/i.exec(s)
  if (m) return [0, Number(m[1])]
  m = /^(\d+)\s*years of age or more$/i.exec(s)
  if (m) return [Number(m[1]), 200]
  m = /^(\d+)\s*and older$/i.exec(s)
  if (m) return [Number(m[1]), 200]
  m = /^(\d+)\s*(?:to|[-–—])\s*(\d+)/i.exec(s)
  if (m) return [Number(m[1]), Number(m[2])]
  m = /^(\d+)\s*years of age$/i.exec(s)
  if (m) return [Number(m[1]), Number(m[1])]
  m = /^(\d+)$/.exec(s)
  if (m) return [Number(m[1]), Number(m[1])]
  return null
}

/** CLB 区间:兼容 CRS「CLB 6」「CLB 4 or 5」「Less than CLB 4」「CLB 10 or more」
 * 与 FSW67「CLB level 9 or higher」「Below CLB level 7」「At least CLB 5 in all of the 4 abilities」。 */
function clbRangeOf(label: string): [number, number] | null {
  const s = label.trim()
  let m = /(?:less than|below)\s*clb\s*(?:level\s*)?(\d+)/i.exec(s)
  if (m) return [0, Number(m[1]) - 1]
  m = /(?:at least\s*)?clb\s*(?:level\s*)?(\d+)\s*or\s*(?:more|higher)/i.exec(s)
  if (m) return [Number(m[1]), 99]
  m = /^at least clb\s*(\d+)/i.exec(s)
  if (m) return [Number(m[1]), 99]
  m = /clb\s*(\d+)\s*or less/i.exec(s)
  if (m) return [0, Number(m[1])]
  m = /clb\s*(?:level\s*)?(\d+)\s*(?:to|or|[-–—])\s*(\d+)/i.exec(s)
  if (m) return [Number(m[1]), Number(m[2])]
  m = /clb\s*(?:level\s*)?(\d+)/i.exec(s)
  if (m) return [Number(m[1]), Number(m[1])]
  return null
}

/** 年数(整年档):CRS 用「None or less than a year」「1 year」「5 years or more」;
 * FSW67 用「1 year」「2-3 years」「6 or more years」。返回区间以便做「落在哪一档」判定。 */
function yearsRangeOf(label: string): [number, number] | null {
  const s = label.trim()
  if (/no(?:ne)? (?:foreign work experience|or less than a year)/i.test(s)) return [0, 0]
  let m = /^(\d+)\s*(?:to|[-–—])\s*(\d+)\s*years?/i.exec(s)
  if (m) return [Number(m[1]), Number(m[2])]
  m = /^(\d+)\s*or\s*(\d+)\s*years?/i.exec(s)
  if (m) return [Number(m[1]), Number(m[2])]
  m = /^(\d+)\s*years?\s*or more/i.exec(s)
  if (m) return [Number(m[1]), 999]
  m = /^(\d+)\s*years?$/i.exec(s)
  if (m) return [Number(m[1]), Number(m[1])]
  return null
}

const monthsToYears = (months: number | null): number | null => (months == null ? null : Math.floor(months / 12))

/** 在候选行里挑「区间包含 want」的那一条;找不到返回 null(不猜)。 */
function pickByRange(rows: EeGridRow[], want: number, rangeOf: (label: string) => [number, number] | null): EeGridRow | null {
  for (const r of rows) {
    const rg = rangeOf(r.criterion)
    if (rg && want >= rg[0] && want <= rg[1]) return r
  }
  return null
}

function item(factor: string, label: string, points: number, matched: string, evidence: Evidence | null, status: EstimateItem['status']): EstimateItem {
  return { factor, label, points, matched, evidence, status }
}

function evidenceOf(r: EeGridRow): Evidence {
  return { url: r.url, fetched: r.fetched, label: `${r.criterion} — ${r.pointsText}` }
}

function needsInfoItem(factor: string, label: string, needsInfo: string[]): EstimateItem {
  needsInfo.push(factor)
  return item(factor, label, 0, '', null, 'needs-info')
}

// ── CRS(Comprehensive Ranking System)──────────────────────────────────────

/** CRS 教育档「年数」标签解析:仅覆盖不带 doctorate/master/secondary 的「N-year program」系列。 */
function crsEduYearsOf(criterion: string): number | null {
  if (/^one-year degree/i.test(criterion)) return 1
  if (/^two-year program/i.test(criterion)) return 2
  if (/bachelor's degree or a three or more year program/i.test(criterion)) return 3
  return null
}
const CRS_EDU_SPECIAL: Partial<Record<EduKeyLite, RegExp>> = {
  doctorate: /^doctoral level/i,
  master: /^master's degree/i,
  highschool: /^secondary diploma/i,
}

function pickAgeCrs(rows: EeGridRow[], age: number | null, spouseCol: RegExp, needsInfo: string[]): EstimateItem {
  if (age == null) return needsInfoItem('age', '年龄', needsInfo)
  const cand = rows.filter((r) => r.section === 'A' && r.factor === 'Age' && r.kind === 'detail' && spouseCol.test(r.columnLabel))
  const hit = pickByRange(cand, age, ageRangeOf)
  if (!hit) return needsInfoItem('age', '年龄', needsInfo)
  const pts = hit.points ?? 0
  return item('age', '年龄', pts, `${hit.criterion} / ${hit.columnLabel}`, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

function pickEduCrs(rows: EeGridRow[], edu: EduKeyLite | null, eduYears: number | null, spouseCol: RegExp, needsInfo: string[]): EstimateItem {
  if (!edu) return needsInfoItem('edu', '学历', needsInfo)
  const cand = rows.filter((r) => r.section === 'A' && r.factor === 'Level of Education' && r.kind === 'detail' && spouseCol.test(r.columnLabel))
  let hit: EeGridRow | undefined
  const special = CRS_EDU_SPECIAL[edu]
  if (special) {
    hit = cand.find((r) => special.test(r.criterion))
  } else if (eduYears != null) {
    const scored = cand.map((r) => ({ r, y: crsEduYearsOf(r.criterion) })).filter((x): x is { r: EeGridRow; y: number } => x.y != null)
    const ok = scored.filter((x) => x.y <= eduYears)
    hit = ok.length ? ok.reduce((a, b) => (b.y > a.y ? b : a)).r : undefined
  }
  if (!hit) return needsInfoItem('edu', '学历', needsInfo)
  const pts = hit.points ?? 0
  return item('edu', '学历', pts, `${hit.criterion} / ${hit.columnLabel}`, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

/** 首官方语言,单项 CLB 命中一行 × 4(四项同档口径;二语没有对应档案字段,恒 needs-info)。 */
function pickLang1Crs(rows: EeGridRow[], clb: number | null, spouseCol: RegExp, needsInfo: string[]): EstimateItem {
  if (clb == null) return needsInfoItem('clb', '语言(CLB,四项合成)', needsInfo)
  const cand = rows.filter((r) => r.section === 'A' && r.factor === 'Canadian Language Benchmark (CLB) level per ability'
    && r.kind === 'detail' && /first official language/i.test(r.heading) && spouseCol.test(r.columnLabel))
  const hit = pickByRange(cand, clb, clbRangeOf)
  if (!hit) return needsInfoItem('clb', '语言(CLB,四项合成)', needsInfo)
  const per = hit.points ?? 0
  return item('clb', '语言(CLB,四项合成)', per * 4, `${hit.criterion} × 4 abilities / ${hit.columnLabel}`, evidenceOf(hit), per > 0 ? 'matched' : 'zero')
}

function pickCanadaExpCrs(rows: EeGridRow[], expCanadaMonths: number | null, spouseCol: RegExp, needsInfo: string[]): EstimateItem {
  if (expCanadaMonths == null) return needsInfoItem('expCanada', '加拿大工作经验', needsInfo)
  const years = monthsToYears(expCanadaMonths)!
  const cand = rows.filter((r) => r.section === 'A' && r.factor === 'Canadian work experience' && r.kind === 'detail' && spouseCol.test(r.columnLabel))
  const hit = pickByRange(cand, years, yearsRangeOf)
  if (!hit) return needsInfoItem('expCanada', '加拿大工作经验', needsInfo)
  const pts = hit.points ?? 0
  return item('expCanada', '加拿大工作经验', pts, `${hit.criterion} / ${hit.columnLabel}`, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

/** Section D:加拿大学习加分(不分已婚/单身表)。1-2 年学制 15 分 / 3 年以上学制 30 分。 */
function pickCanadaStudyBonus(rows: EeGridRow[], canadaStudy: boolean | null, eduYears: number | null, needsInfo: string[]): EstimateItem {
  if (canadaStudy == null) return needsInfoItem('canadaStudyBonus', '加拿大学习加分', needsInfo)
  if (!canadaStudy) return item('canadaStudyBonus', '加拿大学习加分', 0, '(无加拿大学历)', null, 'zero')
  if (eduYears == null) return needsInfoItem('canadaStudyBonus', '加拿大学习加分', needsInfo)
  const cand = rows.filter((r) => r.section === 'D' && r.kind === 'detail' && /post-secondary education in canada/i.test(r.criterion))
  const hit = eduYears >= 3
    ? cand.find((r) => /three years or longer/i.test(r.criterion))
    : eduYears >= 1
      ? cand.find((r) => /one or two years/i.test(r.criterion))
      : undefined
  if (!hit) return needsInfoItem('canadaStudyBonus', '加拿大学习加分', needsInfo)
  const pts = hit.points ?? 0
  return item('canadaStudyBonus', '加拿大学习加分', pts, hit.criterion, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

/** Section C(技能可转移性)子档门槛:列名里带 CLB9/CLB7/2 years or more/1 year。 */
function comboSubTier(columnLabel: string): number | null {
  if (/clb\s*9/i.test(columnLabel)) return 9
  if (/clb\s*7/i.test(columnLabel)) return 7
  if (/2\s*years?\s*or more/i.test(columnLabel)) return 2
  if (/\b1\s*year\b/i.test(columnLabel)) return 1
  return null
}

/** Section C 教育×(语言或加拿大经验)组合:want=null→needs-info;want 给了但够不到任何门槛→确定的 0(zero)。 */
function pickEduComboCrs(
  rows: EeGridRow[], edu: EduKeyLite | null, factor: string, want: number | null, key: string, label: string, needsInfo: string[],
): EstimateItem {
  if (!edu) return needsInfoItem(key, label, needsInfo)
  if (want == null) return needsInfoItem(key, label, needsInfo)
  const tierRe = edu === 'doctorate' ? /doctoral level/i
    : edu === 'master' ? /master's level/i
      : edu === 'highschool' ? /secondary school \(high school\) credential or less/i
        : /^post-secondary program credential of one year or longer$/i
  const cand = rows.filter((r) => r.section === 'C' && r.kind === 'detail' && r.factor === factor && tierRe.test(r.criterion))
  const scored = cand.map((r) => ({ r, th: comboSubTier(r.columnLabel) })).filter((x): x is { r: EeGridRow; th: number } => x.th != null)
  const ok = scored.filter((x) => x.th <= want)
  const hit = ok.length ? ok.reduce((a, b) => (b.th > a.th ? b : a)).r : null
  if (!hit) return item(key, label, 0, '(门槛未达标)', null, 'zero')
  const pts = hit.points ?? 0
  return item(key, label, pts, `${hit.criterion} / ${hit.columnLabel}`, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

/** Section C 海外经验×(语言或加拿大经验)组合。 */
function pickForeignComboCrs(
  rows: EeGridRow[], headingHas: string, expForeignMonths: number | null, want: number | null, key: string, label: string, needsInfo: string[],
): EstimateItem {
  if (expForeignMonths == null) return needsInfoItem(key, label, needsInfo)
  if (want == null) return needsInfoItem(key, label, needsInfo)
  const years = monthsToYears(expForeignMonths)!
  const cand = rows.filter((r) => r.section === 'C' && r.kind === 'detail'
    && r.heading.toLowerCase().includes('foreign work experience') && r.heading.toLowerCase().includes(headingHas))
  const yearHit = cand.filter((r) => {
    const rg = yearsRangeOf(r.criterion)
    return rg && years >= rg[0] && years <= rg[1]
  })
  const scored = yearHit.map((r) => ({ r, th: comboSubTier(r.columnLabel) })).filter((x): x is { r: EeGridRow; th: number } => x.th != null)
  const ok = scored.filter((x) => x.th <= want)
  const hit = ok.length ? ok.reduce((a, b) => (b.th > a.th ? b : a)).r : null
  if (!hit) return item(key, label, 0, '(门槛未达标)', null, 'zero')
  const pts = hit.points ?? 0
  return item(key, label, pts, `${hit.criterion} / ${hit.columnLabel}`, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

/**
 * 档案 → CRS 估分(已婚配偶随行 with-spouse 档 / 单身或配偶不随行 without-spouse 档)。
 * @param profile 见 CrsEstimateProfile;`married` 就是 C5 契约里的「配偶是否随行申请」。
 * @param rows    ee_points_grid 全部行(不预先按 grid 过滤,本函数自己只挑 grid==='CRS')。
 */
export function estimateCrs(profile: CrsEstimateProfile, rows: EeGridRow[]): EstimateResult {
  const withSpouse = profile.married === true
  const spouseCol = withSpouse ? /^with a spouse/i : /^without a spouse/i
  const crsRows = rows.filter((r) => r.grid === 'CRS')
  const needsInfo: string[] = []

  const breakdown: EstimateItem[] = [
    pickAgeCrs(crsRows, profile.age, spouseCol, needsInfo),
    pickEduCrs(crsRows, profile.edu, profile.eduYears, spouseCol, needsInfo),
    pickLang1Crs(crsRows, profile.clb, spouseCol, needsInfo),
    needsInfoItem('clb2', '第二官方语言(档案未提供)', needsInfo),
    pickCanadaExpCrs(crsRows, profile.expCanadaMonths, spouseCol, needsInfo),
    pickCanadaStudyBonus(crsRows, profile.canadaStudy, profile.eduYears, needsInfo),
    pickEduComboCrs(crsRows, profile.edu, 'With good official language proficiency (Canadian Language Benchmark Level [CLB] 7 or higher) and a post-secondary degree', profile.clb, 'eduLangCombo', '技能可转移:学历×语言', needsInfo),
    pickEduComboCrs(crsRows, profile.edu, 'With Canadian work experience and a post-secondary degree', monthsToYears(profile.expCanadaMonths), 'eduExpCombo', '技能可转移:学历×加拿大经验', needsInfo),
    pickForeignComboCrs(crsRows, 'good official language', profile.expForeignMonths, profile.clb, 'foreignLangCombo', '技能可转移:海外经验×语言', needsInfo),
    pickForeignComboCrs(crsRows, 'canadian work experience', profile.expForeignMonths, monthsToYears(profile.expCanadaMonths), 'foreignExpCombo', '技能可转移:海外经验×加拿大经验', needsInfo),
  ]
  const total = breakdown.reduce((s, b) => s + b.points, 0)
  return { total, breakdown, withSpouse, needsInfo }
}

// ── FSW67(Federal Skilled Worker,67/100 资格分)────────────────────────────

/** FSW67 教育档「年数」标签解析:排除「... plus a ...」双证书组合行(档案没有「第二证书」字段,不猜那一档)。 */
function fswEduYearsOf(criterion: string): number | null {
  if (/plus a/i.test(criterion)) return null
  if (/^one-year/i.test(criterion)) return 1
  if (/^two-year/i.test(criterion)) return 2
  if (/^three-year/i.test(criterion)) return 3
  if (/^four-year/i.test(criterion)) return 4
  return null
}
const FSW_EDU_SPECIAL: Partial<Record<EduKeyLite, RegExp>> = {
  doctorate: /^doctorate \(ph\.?d\.?\)$/i,
  master: /^master's degree$/i,
  highschool: /^secondary school diploma$/i,
}

function pickAgeFsw(rows: EeGridRow[], age: number | null, needsInfo: string[]): EstimateItem {
  if (age == null) return needsInfoItem('age', '年龄', needsInfo)
  const cand = rows.filter((r) => r.factor === 'Age')
  const hit = pickByRange(cand, age, ageRangeOf)
  if (!hit) return needsInfoItem('age', '年龄', needsInfo)
  const pts = hit.points ?? 0
  return item('age', '年龄', pts, hit.criterion, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

function pickEduFsw(rows: EeGridRow[], edu: EduKeyLite | null, eduYears: number | null, needsInfo: string[]): EstimateItem {
  if (!edu) return needsInfoItem('edu', '学历', needsInfo)
  const cand = rows.filter((r) => r.factor === 'Education')
  let hit: EeGridRow | undefined
  const special = FSW_EDU_SPECIAL[edu]
  if (special) {
    hit = cand.find((r) => special.test(r.criterion.trim()))
  } else if (eduYears != null) {
    const scored = cand.map((r) => ({ r, y: fswEduYearsOf(r.criterion) })).filter((x): x is { r: EeGridRow; y: number } => x.y != null)
    const ok = scored.filter((x) => x.y <= eduYears)
    hit = ok.length ? ok.reduce((a, b) => (b.y > a.y ? b : a)).r : undefined
  }
  if (!hit) return needsInfoItem('edu', '学历', needsInfo)
  const pts = hit.points ?? 0
  return item('edu', '学历', pts, hit.criterion, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

function pickLang1Fsw(rows: EeGridRow[], clb: number | null, needsInfo: string[]): EstimateItem {
  if (clb == null) return needsInfoItem('clb', '语言(CLB,四项合成)', needsInfo)
  const cand = rows.filter((r) => r.factor === 'First official language' && r.columnLabel === 'Speaking')
  const hit = pickByRange(cand, clb, clbRangeOf)
  if (!hit) return needsInfoItem('clb', '语言(CLB,四项合成)', needsInfo)
  const per = hit.points ?? 0
  return item('clb', '语言(CLB,四项合成)', per * 4, `${hit.criterion} × 4 abilities`, evidenceOf(hit), per > 0 ? 'matched' : 'zero')
}

/** FSW67「Skilled work experience」不分境内境外,合计年数一次查表。 */
function pickExpFsw(rows: EeGridRow[], expCanadaMonths: number | null, expForeignMonths: number | null, needsInfo: string[]): EstimateItem {
  if (expCanadaMonths == null || expForeignMonths == null) return needsInfoItem('exp', '技术工作经验', needsInfo)
  const years = Math.floor((expCanadaMonths + expForeignMonths) / 12)
  const cand = rows.filter((r) => r.factor === 'Experience')
  const hit = pickByRange(cand, years, yearsRangeOf)
  if (!hit) return item('exp', '技术工作经验', 0, '(不足 1 年,未达最低档)', null, 'zero')
  const pts = hit.points ?? 0
  return item('exp', '技术工作经验', pts, hit.criterion, evidenceOf(hit), pts > 0 ? 'matched' : 'zero')
}

/** FSW67 Adaptability:档案只覆盖「加拿大学习」与「加拿大工作」两项;配偶语言/配偶学习/预安排就业/加拿大亲属
 * 档案没有对应字段,恒 needs-info(不猜)。 */
function pickAdaptabilityFsw(
  rows: EeGridRow[], canadaStudy: boolean | null, eduYears: number | null, expCanadaMonths: number | null, needsInfo: string[],
): EstimateItem[] {
  const cand = rows.filter((r) => r.factor === 'Adaptability')
  const studyRow = cand.find((r) => /^your past studies in canada/i.test(r.criterion.trim()))
  const workRow = cand.find((r) => /^your past work in canada/i.test(r.criterion.trim()))

  let studyItem: EstimateItem
  if (canadaStudy == null || eduYears == null) studyItem = needsInfoItem('adaptStudy', '适应性:加拿大学习经历', needsInfo)
  else if (!canadaStudy || eduYears < 2 || !studyRow) studyItem = item('adaptStudy', '适应性:加拿大学习经历', 0, studyRow ? '(未满 2 学年全日制)' : '', null, 'zero')
  else studyItem = item('adaptStudy', '适应性:加拿大学习经历', studyRow.points ?? 0, studyRow.criterion.slice(0, 40), evidenceOf(studyRow), (studyRow.points ?? 0) > 0 ? 'matched' : 'zero')

  let workItem: EstimateItem
  if (expCanadaMonths == null) workItem = needsInfoItem('adaptWork', '适应性:加拿大工作经历', needsInfo)
  else if (expCanadaMonths < 12 || !workRow) workItem = item('adaptWork', '适应性:加拿大工作经历', 0, workRow ? '(未满 1 年)' : '', null, 'zero')
  else workItem = item('adaptWork', '适应性:加拿大工作经历', workRow.points ?? 0, workRow.criterion.slice(0, 40), evidenceOf(workRow), (workRow.points ?? 0) > 0 ? 'matched' : 'zero')

  return [
    studyItem,
    workItem,
    needsInfoItem('adaptSpouseLang', '适应性:配偶语言(档案未提供)', needsInfo),
    needsInfoItem('adaptSpouseStudy', '适应性:配偶加拿大学习经历(档案未提供)', needsInfo),
    needsInfoItem('adaptArrangedEmployment', '适应性:预安排就业(档案未提供)', needsInfo),
    needsInfoItem('adaptRelatives', '适应性:加拿大亲属(档案未提供)', needsInfo),
  ]
}

/**
 * 档案 → FSW67 估分(联邦技术工人 67/100 资格分,与 CRS 排名分不可相加,见 lookupCrs 的 note)。
 * FSW67 官方表不分已婚/单身,`withSpouse` 字段仅回传 married 供上游标注用途,不参与查表。
 */
export function estimateFsw67(profile: CrsEstimateProfile, rows: EeGridRow[]): EstimateResult {
  const fswRows = rows.filter((r) => r.grid === 'FSW67')
  const needsInfo: string[] = []

  const breakdown: EstimateItem[] = [
    pickAgeFsw(fswRows, profile.age, needsInfo),
    pickEduFsw(fswRows, profile.edu, profile.eduYears, needsInfo),
    pickLang1Fsw(fswRows, profile.clb, needsInfo),
    needsInfoItem('clb2', '第二官方语言(档案未提供)', needsInfo),
    pickExpFsw(fswRows, profile.expCanadaMonths, profile.expForeignMonths, needsInfo),
    ...pickAdaptabilityFsw(fswRows, profile.canadaStudy, profile.eduYears, profile.expCanadaMonths, needsInfo),
  ]
  const total = breakdown.reduce((s, b) => s + b.points, 0)
  return { total, breakdown, withSpouse: profile.married === true, needsInfo }
}
