/**
 * SQL 原始行 → 本域形状的构造器 + 本域词汇(iso)。一条 SQL 一个映射,体内只许词汇表 + 纯拼装。
 * 🔴 数字一律走 db 的 `numOrNull`:库里 numeric 回来是**字符串**,Payload Local API 回来是数字 ——
 * 一套词汇两条路都对(老坑:`typeof x === 'number'` 换路后 teer/drawCrs 静默判 null)。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

import { count, jsonOrNull, numOrNull, text } from '../db'
import { COMP_KEY, UNCAT } from './constants'
import type {
  AlertHit, BroadCount, BroadNoc, Cell, CityAgg, CityDim, CompanyJobRow, DesigDim, DistrictDim, DistrictEmployerRow, DliTop, EeCatDim, EeOcc, FieldSource, JobDbRow, JobRow, JsonCell, JsonRow, MatchJob, MaybeNum, MaybeOccDiff, NewsSlim, NocCat, NocDescDim, NocHit, OccDiffDbRow, OccDiffFact, OccOpen, PnpDraw, PnpOcc, PnpOccDim, ProvCount, RelatedJob, Row, SimilarEmployer, TimeLike, ToJobRowIn, TopNoc,
} from './types'

/**
 * 时间格词汇:pg timestamp 回来是 Date、文本列是字符串、可空 —— 归一成 ISO 串(空落空串)。
 * 入参放宽到库标量:窄行(Row)的时间格在类型上是 Cell,运行时才是 Date,这里一网收干净。
 *
 * @param v 库回的时间格。
 * @returns ISO 串;没有则空串。
 */
export function iso(v: TimeLike): string {
  if (v instanceof Date) {
    return v.toISOString()
  }
  if (v == null) {
    return ''
  }
  return String(v)
}

/**
 * jobs 主表一行 → 板上一行(不含 match;match 由调用方按人/序算好传入)。
 * Pro 数据列 2026-07-25「先都显示出来」后暂不剥值(pro 参数保留,收费面回收时改回)。
 *
 * @param input 原始行、匹配档与付费态。
 * @returns 板上一行。
 */
// eslint-disable-next-line local/function-length -- 61 列的一次性拼装,拆开只会把一行搬成两处
export function toJobRow(input: ToJobRowIn): JobRow {
  const j = input.row
  let broad = text(j.broad)
  if (broad === '') {
    broad = UNCAT
  }
  let mid = text(j.mid)
  if (mid === '') {
    mid = UNCAT
  }
  let fine = text(j.fine)
  if (fine === '') {
    fine = UNCAT
  }
  let address = text(j.address)
  if (address === '') {
    address = text(j.company_address)
  }
  let officialUrl = text(j.official_url)
  if (officialUrl === '') {
    officialUrl = text(j.company_website)
  }
  let status = text(j.status)
  if (status === '') {
    status = 'open'
  }
  let certificates: string[] = []
  if (Array.isArray(j.certificates)) {
    certificates = j.certificates
  }
  return {
    match: input.matchLevel,
    id: j.id,
    title: text(j.title),
    company: text(j.company_name),
    companySlug: text(j.company_slug),
    companyDescription: text(j.company_description),
    companySectors: text(j.company_sectors),
    companyWebsiteSrc: text(j.website_source),
    lmiaPositions: numOrNull(j.lmia_positions),
    lmiaPositionsSkilled: numOrNull(j.lmia_positions_skilled),
    lmiaLastQuarter: text(j.lmia_last_quarter),
    lmiaStreams: text(j.lmia_streams),
    address: address,
    source: text(j.source),
    sourceLabel: text(j.source_label),
    origin: text(j.origin),
    country: text(j.country),
    province: text(j.province),
    city: text(j.city),
    district: text(j.district),
    noc: text(j.noc),
    category: text(j.category),
    teer: numOrNull(j.teer),
    broad: broad,
    mid: mid,
    fine: fine,
    accessibility: text(j.accessibility),
    score: numOrNull(j.score),
    gradeChannel: numOrNull(j.grade_channel),
    sponsorGrade: numOrNull(j.sponsor_grade),
    pnpEligible: j.pnp_eligible === true,
    pnpStream: text(j.pnp_stream),
    eeCategory: text(j.ee_category),
    aip: j.aip === true,
    pilot: text(j.pilot), pilotCommunity: text(j.pilot_community),
    pilotEmployer: j.pilot_employer === true, pilotOcc: text(j.pilot_occ),
    employmentTerm: text(j.employment_term),
    employmentHours: text(j.employment_hours),
    eligibilityFlag: text(j.eligibility_flag),
    eligibilityQuote: text(j.eligibility_quote),
    certificates: certificates,
    education: text(j.education),
    salary: text(j.salary),
    salaryAnnual: numOrNull(j.salary_annual),
    salaryText: text(j.salary_text),
    wageMedHourly: numOrNull(j.wage_med_hourly),
    wageMedAnnual: numOrNull(j.wage_med_annual),
    wageLowHourly: numOrNull(j.wage_low_hourly),
    wageLowAnnual: numOrNull(j.wage_low_annual),
    wageHighHourly: numOrNull(j.wage_high_hourly),
    wageHighAnnual: numOrNull(j.wage_high_annual),
    wageYear: text(j.wage_year),
    officialUrl: officialUrl,
    applyUrl: text(j.apply_url),
    datePosted: iso(j.date_posted),
    firstSeen: iso(j.first_seen),
    lastSeen: iso(j.last_seen),
    status: status,
    closedAt: iso(j.closed_at),
  }
}

/**
 * jobs 主表一行 → 匹配引擎只读的那几格(rowMatchLevel 与两个视图共用一份收窄)。
 *
 * @param j 原始行。
 * @returns 匹配侧字段。
 */
export function toMatchJob(j: JobDbRow): MatchJob {
  return {
    noc: text(j.noc), teer: numOrNull(j.teer), province: text(j.province), pnpEligible: j.pnp_eligible === true,
    pnpStream: text(j.pnp_stream), eeCategory: text(j.ee_category),
    salaryAnnual: numOrNull(j.salary_annual), wageMedAnnual: numOrNull(j.wage_med_annual),
    lmiaPositions: numOrNull(j.lmia_positions), lmiaPositionsSkilled: numOrNull(j.lmia_positions_skilled),
    lmiaLastQuarter: text(j.lmia_last_quarter),
  }
}

/**
 * 维度行 → 匹配引擎口径的省清单行(/api/jobs-data 自取维度时与 page.tsx 同一把尺;
 * program 空档落 'PNP')。
 *
 * @param r 原始行(SQL 别名 camelCase)。
 * @returns 省清单行。
 */
export function mapPnpOcc(r: Row): PnpOcc {
  let program = text(r.program)
  if (program === '') {
    program = 'PNP'
  }
  return {
    province: text(r.province), stream: text(r.stream), label: text(r.label), type: text(r.type),
    program: program, noc: text(r.noc), name: text(r.name),
    gtaRestricted: r.gtaRestricted === true, url: text(r.url), fetched: text(r.fetched),
  }
}

/**
 * 维度行 → 联邦 EE 类别行(numeric 三列走词汇,两条路都对)。
 *
 * @param r 原始行(SQL 别名 camelCase)。
 * @returns EE 类别行。
 */
export function mapEeCat(r: Row): EeOcc {
  return {
    category: text(r.category), label: text(r.label), noc: text(r.noc), teer: numOrNull(r.teer),
    title: text(r.title), url: text(r.url), fetched: text(r.fetched),
    drawCrs: numOrNull(r.drawCrs), drawDate: text(r.drawDate), drawSize: numOrNull(r.drawSize),
  }
}

/**
 * MATCH_PNP_OCCUPATIONS 一行 → 匹配维度省清单行(时间列是 timestamp,过 iso)。
 *
 * @param r 原始行。
 * @returns 匹配维度行。
 */
export function toPnpOccDim(r: Row): PnpOccDim {
  return {
    province: text(r.province), label: text(r.label), type: text(r.type), noc: text(r.noc),
    url: text(r.url), fetched: iso(r.fetched),
  }
}

/**
 * MATCH_EE_CATEGORIES 一行 → 匹配维度 EE 行(列名 snake_case —— 换路必须跟着换,
 * 否则 drawCrs/drawDate 静默变 undefined,match 只会少给一条理由不报错)。
 *
 * @param r 原始行。
 * @returns 匹配维度行。
 */
export function toEeCatDim(r: Row): EeCatDim {
  return {
    category: text(r.category), label: text(r.label), noc: text(r.noc),
    drawCrs: numOrNull(r.draw_crs), drawDate: iso(r.draw_date), url: text(r.url), fetched: iso(r.fetched),
  }
}

/**
 * DIMS_PNP_DRAWS 一行 → 省抽选事实行。
 *
 * @param r 原始行。
 * @returns 抽选行。
 */
export function toPnpDraw(r: Row): PnpDraw {
  return {
    province: text(r.province), kind: text(r.kind), drawDate: text(r.drawDate), stream: text(r.stream),
    streamZh: text(r.streamZh), score: numOrNull(r.score), scale: text(r.scale),
    invitations: numOrNull(r.invitations), note: text(r.note), label: text(r.label),
    url: text(r.url), fetched: text(r.fetched),
  }
}

/**
 * DIMS_NOC_CATEGORIES 一行 → 分类树行。
 *
 * @param r 原始行。
 * @returns 分类树行。
 */
export function toNocCat(r: Row): NocCat {
  return {
    broad: text(r.broad), mid: text(r.mid), fine: text(r.fine), teer: numOrNull(r.teer),
    broadEn: text(r.broadEn), broadKo: text(r.broadKo),
    midEn: text(r.midEn), midKo: text(r.midKo), fineEn: text(r.fineEn), fineKo: text(r.fineKo),
  }
}

/**
 * DIMS_FIELD_SOURCES 一行 → 字段出处行。
 *
 * @param r 原始行。
 * @returns 字段出处行。
 */
export function toFieldSource(r: Row): FieldSource {
  return {
    field: text(r.field), kind: text(r.kind), publisher: text(r.publisher), url: text(r.url),
    title: text(r.title), description: text(r.description), status: text(r.status),
    fetched: text(r.fetched), note: text(r.note),
  }
}

/**
 * NEWS_SLIM_60 一行 → 新闻瘦行。
 *
 * @param r 原始行。
 * @returns 新闻瘦行。
 */
export function toNewsSlim(r: Row): NewsSlim {
  return { region: text(r.region), title: text(r.title), date: text(r.date), slug: text(r.slug) }
}

/**
 * 相关职位一行 → 瘦行(salary_text 空时用 salary 兜底)。
 *
 * @param r 原始行。
 * @returns 瘦行。
 */
export function toRelated(r: Row): RelatedJob {
  let salaryText = text(r.salary_text)
  if (salaryText === '') {
    salaryText = text(r.salary)
  }
  return {
    id: count(r.id), title: text(r.title), company: text(r.company_name),
    city: text(r.city), province: text(r.province), salaryText: salaryText,
  }
}

/**
 * 公司详情页在招岗一行 → 干净行(salary_text 空时用 salary 兜底;时间过 iso)。
 *
 * @param j 原始行。
 * @returns 在招岗行。
 */
export function toCompanyJob(j: Row): CompanyJobRow {
  let salaryText = text(j.salary_text)
  if (salaryText === '') {
    salaryText = text(j.salary)
  }
  const datePosted = iso(j.date_posted)
  return {
    id: count(j.id), title: text(j.title), city: text(j.city), province: text(j.province),
    gradeChannel: numOrNull(j.grade_channel), noc: text(j.noc), nocTitle: text(j.noc_title),
    nocTitleZh: text(j.noc_title_zh), nocTitleKo: text(j.noc_title_ko),
    teer: numOrNull(j.teer), salaryText: salaryText, datePosted: datePosted,
  }
}

/**
 * SIMILAR_EMPLOYERS 一行 → 相似雇主行。
 *
 * @param r 原始行。
 * @returns 相似雇主行。
 */
export function toSimilar(r: Row): SimilarEmployer {
  return {
    slug: text(r.slug), name: text(r.name), industry: text(r.industry),
    sponsorGrade: numOrNull(r.sponsor_grade), openCount: count(r.open_count),
  }
}

/**
 * 提醒命中一行 → AlertHit(列名保持 snake_case,邮件模板按它渲)。
 *
 * @param r 原始行。
 * @returns 命中行。
 */
export function toAlertHit(r: Row): AlertHit {
  return {
    id: count(r.id), title: text(r.title), city: text(r.city), province: text(r.province),
    salary_text: text(r.salary_text), company_name: text(r.company_name),
  }
}

/**
 * 热门职业一行 → TopNoc(主路 noc_openings 与回退现算两条路同一映射;med 列名两路各异由 SQL 对齐)。
 *
 * @param r 原始行。
 * @returns 热门职业行。
 */
export function toTopNoc(r: Row): TopNoc {
  let median: number | null = numOrNull(r.median_salary)
  if (median == null) {
    median = numOrNull(r.med)
  }
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleZhShort: text(r.title_zh_short),
    titleKoShort: text(r.title_ko_short), titleEnShort: text(r.title_en_short), broad: text(r.broad),
    open: count(r.open), eligible: count(r.eligible), medianSalary: median,
  }
}

/**
 * 按大类浏览一行 → BroadNoc。
 *
 * @param r 原始行。
 * @returns 大类浏览行。
 */
export function toBroadNoc(r: Row): BroadNoc {
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleZhShort: text(r.title_zh_short),
    titleKoShort: text(r.title_ko_short), titleEnShort: text(r.title_en_short), broad: text(r.broad),
    open: count(r.open), eligible: count(r.eligible),
  }
}

/**
 * 职业名搜索一行 → NocHit。
 *
 * @param r 原始行。
 * @returns 命中行。
 */
export function toNocHit(r: Row): NocHit {
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleZhShort: text(r.title_zh_short),
    titleKoShort: text(r.title_ko_short), titleEnShort: text(r.title_en_short),
  }
}

/**
 * jobs 主表原始行的原样透传(match 计算与 toJobRow 要吃整行;照 ruling `passRow` 先例)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passJobRow(r: JobDbRow): JobDbRow {
  return r
}

/**
 * 窄行原样透传(count/heartbeat/探测这类单格行,取值在调用处收窄)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passRow(r: Row): Row {
  return r
}

/**
 * 带 JSON 列的行原样透传(公司详情 score_detail / lmia_nocs 这类 json 列,取值在调用处收窄)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passJsonRow(r: JsonRow): JsonRow {
  return r
}

/**
 * 一行实时在招聚合(SQL.OCC_COMPETITION_BY_PROV)→ `OccOpen`。
 * avg_days_open 是 ROUND 过的 numeric,pg 交回字符串 —— numOrNull 一网收。
 *
 * @param r 原始行。
 * @returns 洗净的一行。
 */
export function toOccOpen(r: Row): OccOpen {
  return {
    province: text(r.province), openJobs: count(r.open_jobs),
    new30d: numOrNull(r.new30d), avgDaysOpen: numOrNull(r.avg_days_open),
  }
}

/**
 * 一行按省计数(AIP/RCIP/FCIP 三条 COUNT 共用)→ `ProvCount`。
 *
 * @param r 原始行。
 * @returns 洗净的一行。
 */
export function toProvCount(r: Row): ProvCount {
  return { province: text(r.province), n: count(r.n) }
}

/**
 * 词汇:解析好的难度 json → key='comp' 因子的比值;没有保 null。
 *
 * @param d 解析好的难度 json。
 * @returns 比值;没有则 null。
 */
function compRatioOf(d: MaybeOccDiff): MaybeNum {
  if (d == null || d.factors == null) {
    return null
  }
  for (const f of d.factors) {
    if (f != null && f.key === COMP_KEY) {
      return numOrNull(f.value)
    }
  }
  return null
}

/**
 * 一行各省难度(SQL.PROV_DIFFICULTY)→ 难度事实。json 解析(词汇 `jsonOrNull`)与
 * comp 因子提取都在这里做完 —— functions 拿到的 ratio 即有效(2026-08-22 Frank:
 * 值级清洗不进 functions)。
 *
 * @param r 原始行。
 * @returns 洗净的一行。
 */
export function toOccDiffFact(r: OccDiffDbRow): OccDiffFact {
  return { province: text(r.province), ratio: compRatioOf(jsonOrNull(r.difficulty)) }
}

/**
 * 词汇:数字格 → 取整;缺位 null(市/区帖面中位年薪的口径,并入前就是 Math.round)。
 *
 * @param x 库里的数字格。
 * @returns 取整后的数;缺位 null。
 */
function roundOrNull(x: Cell): MaybeNum {
  const n = numOrNull(x)
  if (n == null) {
    return null
  }
  return Math.round(n)
}

/**
 * 一行市/区聚合(SQL.cityTotals / districtTotals)→ 三件套。
 *
 * @param r 库里的一行。
 * @returns 洗净的聚合。
 */
export function toCityAgg(r: Row): CityAgg {
  return { openJobs: count(r.open_jobs), new7d: count(r.new7d), medSalary: roundOrNull(r.med_salary) }
}

/**
 * 一行大类计数(SQL.cityByBroad / districtByBroad)。
 *
 * @param r 库里的一行。
 * @returns 大类 + 计数。
 */
export function toBroadCount(r: Row): BroadCount {
  return { broad: text(r.broad), n: count(r.n) }
}

/**
 * 一行院校(SQL.CITY_DLI)。
 *
 * @param r 库里的一行。
 * @returns 院校名 + 公立与否。
 */
export function toDliTop(r: Row): DliTop {
  return { name: text(r.name), isPublic: r.is_public === true }
}

/**
 * 一行计数(SQL.CITY_DLI_COUNT / CITY_DESIGNATED_COUNT 这类单数查询)。
 *
 * @param r 库里的一行。
 * @returns 计数(缺位 0)。
 */
export function toCountN(r: Row): number {
  return count(r.n)
}

/**
 * 一行区主要雇主(SQL.districtEmployers)。
 *
 * @param r 库里的一行。
 * @returns 雇主名 + slug + 在招数。
 */
export function toDistrictEmployer(r: Row): DistrictEmployerRow {
  return { name: text(r.name), slug: text(r.slug), n: count(r.n) }
}

/**
 * 单列 json 透传(SQL.PROVINCE_INFO_ONE 的 info 格):jsonb 驱动给对象、文本列绕行给
 * 字符串,消费端自己认 —— 与 stats 的 StatDifficulty 同一口径,这里只把缺位收成 null。
 *
 * @param r 库里的一行。
 * @returns 格值;缺位 null。
 */
export function toInfoCell(r: JsonRow): JsonCell {
  if (r.info == null) {
    return null
  }
  return r.info
}

/**
 * 单列 json 透传(SQL.PROV_DIFFICULTY_ONE 的 difficulty 格;口径同上)。
 *
 * @param r 库里的一行。
 * @returns 格值;缺位 null。
 */
export function toDiffCell(r: JsonRow): JsonCell {
  if (r.difficulty == null) {
    return null
  }
  return r.difficulty
}

/**
 * 一行城市维度(SQL.DIMS_CITIES)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toCityDim(r: Row): CityDim {
  return { name: text(r.name), province: text(r.province) }
}

/**
 * 一行区维度(SQL.DIMS_DISTRICTS)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toDistrictDim(r: Row): DistrictDim {
  return { name: text(r.name), city: text(r.city), province: text(r.province) }
}

/**
 * 一行 AIP 指定雇主维度(SQL.DIMS_DESIGNATED)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toDesigDim(r: Row): DesigDim {
  return { name: text(r.name), province: text(r.province), location: text(r.location), isTech: r.is_tech === true }
}

/**
 * 一行 NOC 描述维度(SQL.DIMS_NOC_DESCRIPTIONS)。
 *
 * @param r 库里的一行。
 * @returns 维度行。
 */
export function toNocDescDim(r: Row): NocDescDim {
  return {
    noc: text(r.noc), title: text(r.title), titleZh: text(r.title_zh), titleKo: text(r.title_ko),
    duties: text(r.duties), requirements: text(r.requirements), fetched: text(r.fetched),
  }
}
