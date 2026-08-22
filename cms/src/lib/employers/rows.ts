/**
 * SQL 原始行 → 本域形状的构造器,一条 SQL 一个;体内只许词汇表 + 纯拼装,不许业务判断。
 * 每格空值决策见 `lib/db` 的词汇表(text/count/numOrNull)—— 收窄只在这里做一次,
 * 循环与调用处不再出现兜底运算。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

import { count, numOrNull, text, textOrNull } from '../db'
import type { Requirement } from '../gauge'
import { EMP_LOG, log } from '../log'
import type { EmployerFacts } from '../ruling'
import { DATE8_RE, DATE_LEN, NOC_RE, NOC_SPLIT_RE } from './constants'
import type {
  ColumnDbRow, CompanyBriefDbRow, CompareCompanyDbRow, CompareJob, CompareJobDbRow, CompareRow, DesignatedDbRow,
  DesignatedRow, DifficultyDbRow, DifficultyObj, DifficultyPair, EmployerRow, HiringDbRow, HiringRow, NocTitleDbRow,
  IdCell, NocTitlePair, OccDbRow, OccRow, ReqDbRow, SponsorDbRow, SponsorEmployerRow, StrList, StrListCell,
  ToCompareRowIn, ToSponsorRowIn,
} from './types'

/**
 * 数组格的词汇:pg 的 array_agg 列,null 收成空数组,元素逐个过 text。
 *
 * @param x 库回的数组格。
 * @returns 干净的字符串数组。
 */
export function strList(x: StrListCell): StrList {
  if (x == null) {
    return []
  }
  const out: string[] = []
  for (const v of x) {
    out.push(text(v))
  }
  return out
}

/**
 * 名录抓取日:库里两种写法(20260419 / 2026-04-19),归一在数据层做,展示层只显示。
 *
 * @param v 库里的原值。
 * @returns YYYY-MM-DD;识别不了就截前十位原样给。
 */
export function fmtFetched(v: string): string {
  const s = v.trim()
  if (DATE8_RE.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }
  return s.slice(0, DATE_LEN)
}

/**
 * 名录 nocs 串 → 5 位码数组(逗号/空格/顿号混排都吃;非 5 位的碎片丢弃,不瞎猜)。
 *
 * @param nocs 名录原文。
 * @returns 去重后的 5 位码。
 */
export function nocList(nocs: string): StrList {
  const seen = new Set<string>()
  for (const piece of nocs.split(NOC_SPLIT_RE)) {
    if (NOC_RE.test(piece)) {
      seen.add(piece)
    }
  }
  return Array.from(seen)
}

/**
 * `DESIGNATED_ALL` 一行 → 干净的名录行。
 *
 * @param r 原始行。
 * @returns 收窄后的名录行。
 */
export function toDesignatedRow(r: DesignatedDbRow): DesignatedRow {
  return {
    name: text(r.name), province: text(r.province), location: text(r.location),
    source: text(r.source), nocs: text(r.nocs), url: text(r.url), fetched: fmtFetched(text(r.fetched)),
  }
}

/**
 * `HIRING_EMPLOYERS` 一行 → 干净的在招雇主行。open 是计数,0 无害。
 *
 * @param r 原始行。
 * @returns 收窄后的在招行。
 */
export function toHiringRow(r: HiringDbRow): HiringRow {
  return { name: text(r.name), province: text(r.province), location: text(r.location), openJobs: count(r.n) }
}

/**
 * 名录一行 → 板上一行(designated 口径:出制度+职业,在招数恒 null —— 名录不含在招信息)。
 *
 * @param r 干净的名录行。
 * @returns 板上一行。
 */
export function toEmployerRow(r: DesignatedRow): EmployerRow {
  return {
    name: r.name, province: r.province, where: r.location,
    program: r.source, nocs: nocList(r.nocs), openJobs: null, url: r.url,
  }
}

/**
 * 在招一行 → 板上一行(hiring 口径:出在招岗数,制度/职业/URL 恒空 —— 不是名录数据)。
 *
 * @param r 干净的在招行。
 * @returns 板上一行。
 */
export function hiringToEmployerRow(r: HiringRow): EmployerRow {
  return { name: r.name, province: r.province, where: r.location, program: '', nocs: [], openJobs: r.openJobs, url: '' }
}

/**
 * `NOC_TITLES_FOR_EMPLOYERS` 一行 → 码与三语名(折成 Record 在调用处)。
 *
 * @param r 原始行。
 * @returns 码与三语名。
 */
export function toNocTitlePair(r: NocTitleDbRow): NocTitlePair {
  return { noc: text(r.noc), title: { en: text(r.en), zh: text(r.zh), ko: text(r.ko) } }
}

/**
 * `PNP_OCCUPATIONS_ALL` 一行 → 职业目录行。
 *
 * @param r 原始行。
 * @returns 收窄后的目录行。
 */
export function toOccRow(r: OccDbRow): OccRow {
  return {
    province: text(r.province), stream: text(r.stream), label: text(r.label), type: text(r.type),
    noc: text(r.noc), name: text(r.name), url: text(r.url), fetched: text(r.fetched).slice(0, DATE_LEN),
  }
}

/**
 * `COMPANIES_HAS_COLUMNS` 一行 → 列名。
 *
 * @param r 原始行。
 * @returns 列名。
 */
export function toColumnName(r: ColumnDbRow): string {
  return text(r.column_name)
}

/**
 * `PNP_REQ_EMPLOYER` 一行 → 判定引擎认的门槛行。只取判定用得到的列;其余字段判定不读,
 * 给空值占位(与 R() 测试 fixture 同一惯例)。🔴 阈值官方可空,`numOrNull` 保 null。
 *
 * @param r 原始行。
 * @returns 判定引擎认的门槛行。
 */
export function toEmployerReq(r: ReqDbRow): Requirement {
  let op = text(r.op)
  if (op === '') {
    op = '>='
  }
  return {
    province: text(r.province), program: 'PNP', stream: '', subject: 'employer', factor: text(r.factor),
    op: op, value: numOrNull(r.value), valueText: '', unit: text(r.unit),
    appliesTeer: '', appliesNoc: '', excludesNoc: '', appliesArea: text(r.applies_area), appliesCondition: '',
    familySize: null, basis: '', label: '', section: '', effective: '', url: '', pageUrl: '', fetched: '',
  }
}

/**
 * `sponsorEmployers` 一行 → 判定要吃的公司事实。探测列缺席时值是 undefined,
 * `numOrNull`/`textOrNull` 用 `== null` 一网兜住,落成 null → 判定自然全落 unknown。
 *
 * @param r 原始行。
 * @returns 公司事实。
 */
export function employerFactsOf(r: SponsorDbRow): EmployerFacts {
  return {
    foundedYear: numOrNull(r.founded_year),
    registryStatus: textOrNull(r.registry_status),
    staffEst: numOrNull(r.staff_est),
    staffEstSrc: textOrNull(r.staff_est_src),
    sector: textOrNull(r.sector),
  }
}

/**
 * `sponsorEmployers` 一行 + 已算好的判定 → 在招担保雇主行。
 * 🔴 lmia_positions_skilled 官方可空必须保 null(折 0 = 替官方编数);时间窗三列拍板折 0(列未回填当 0)。
 *
 * @param input 原始行与判定。
 * @returns 收窄后的担保行。
 */
export function toSponsorRow(input: ToSponsorRowIn): SponsorEmployerRow {
  const r = input.row
  return {
    name: text(r.name), slug: text(r.slug), industry: text(r.industry),
    aliasZh: text(r.alias_zh), aliasKo: text(r.alias_ko),
    sponsorGrade: numOrNull(r.sponsor_grade),
    openJobs: count(r.open_jobs), city: text(r.city),
    provs: strList(r.provs), nocs: strList(r.nocs), cities: strList(r.cities),
    aip: r.aip === true, named: r.named === true,
    openJobsAip: count(r.open_jobs_aip), provsAip: strList(r.provs_aip),
    lmiaPositions: count(r.lmia_positions),
    lmiaPositionsSkilled: numOrNull(r.lmia_positions_skilled),
    lmiaLastQuarter: text(r.lmia_last_quarter),
    lmia4q: count(r.lmia_positions_4q), lmia2q: count(r.lmia_positions_2q), lmia1q: count(r.lmia_positions_1q),
    streams: strList(r.streams),
    verdict: input.verdict,
  }
}

/**
 * 橱窗瘦身:同一行换掉 cities(表格不渲不筛,置空省 payload)。缓存行全站共享,
 * 必须产新对象 —— 逐字段抄是拍板(禁对象展开),也是「绝不动缓存」的保证。
 *
 * @param r 缓存里的担保行。
 * @returns 瘦身后的新行。
 */
export function toSlimSponsorRow(r: SponsorEmployerRow): SponsorEmployerRow {
  return {
    name: r.name, slug: r.slug, industry: r.industry, aliasZh: r.aliasZh, aliasKo: r.aliasKo,
    sponsorGrade: r.sponsorGrade,
    openJobs: r.openJobs, city: r.city, provs: r.provs, nocs: r.nocs, cities: [],
    aip: r.aip, named: r.named,
    openJobsAip: r.openJobsAip, provsAip: r.provsAip,
    lmiaPositions: r.lmiaPositions, lmiaPositionsSkilled: r.lmiaPositionsSkilled,
    lmiaLastQuarter: r.lmiaLastQuarter,
    lmia4q: r.lmia4q, lmia2q: r.lmia2q, lmia1q: r.lmia1q,
    streams: r.streams, verdict: r.verdict,
  }
}

/**
 * `sponsorEmployers` 的原样透传(判定要吃整行事实,收窄延后到 `toSponsorRow`;照 ruling `passRow` 先例)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passSponsorRow(r: SponsorDbRow): SponsorDbRow {
  return r
}

/**
 * `COMPANIES_FOR_COMPARE` 的原样透传(对照要先按名认行、再拿主键二查,收窄延后到 `toCompareRow`)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passCompareCompany(r: CompareCompanyDbRow): CompareCompanyDbRow {
  return r
}

/**
 * `COMPANY_AI_BRIEF` / `COMPANY_INSERT_LAZY` 的原样透传(缓存判定要看四列原值)。
 *
 * @param r 原始行。
 * @returns 同一行。
 */
export function passCompanyBrief(r: CompanyBriefDbRow): CompanyBriefDbRow {
  return r
}

/**
 * 带 companies 主键的任意行(`COMPANY_AI_BRIEF` / `COMPANIES_FOR_COMPARE` 都够格)。
 *
 * @param r 有 id 格的行。
 * @returns companies 主键;没有像样的主键则 0。
 */
export function companyIdOf(r: IdCell): number {
  return count(r.id)
}

/**
 * `COMPANY_JOBS_FOR_COMPARE` 一行 → 干净的对照岗行。年薪/中位/分数官方可空,保 null。
 *
 * @param r 原始行。
 * @returns 收窄后的岗行。
 */
export function toCompareJob(r: CompareJobDbRow): CompareJob {
  return {
    noc: text(r.noc), province: text(r.province),
    pnpEligible: r.pnp_eligible === true, pnpStream: text(r.pnp_stream), eeCategory: text(r.ee_category),
    salaryAnnual: numOrNull(r.salary_annual), wageMedAnnual: numOrNull(r.wage_med_annual),
    score: numOrNull(r.score), aip: r.aip === true,
  }
}

/**
 * `PROV_DIFFICULTY_ANY` 一行 → 省与难度档。难度列两种形态(json 已解析成对象 / jsonb 文本),
 * 两头都在这儿收;解析不出落 null,不瞎猜。
 *
 * @param r 原始行。
 * @returns 省与难度档。
 */
export function toDifficultyPair(r: DifficultyDbRow): DifficultyPair {
  const d = r.difficulty
  if (d == null) {
    return { province: text(r.province), tier: null }
  }
  if (typeof d === 'string') {
    try {
      const parsed: DifficultyObj = JSON.parse(d)
      if (parsed != null && typeof parsed.tier === 'string') {
        return { province: text(r.province), tier: parsed.tier }
      }
      return { province: text(r.province), tier: null }
    } catch {
      log({ tag: EMP_LOG.tag, text: `${EMP_LOG.difficultyParseFailed}${text(r.province)}` })
      return { province: text(r.province), tier: null }
    }
  }
  if (typeof d.tier === 'string') {
    return { province: text(r.province), tier: d.tier }
  }
  return { province: text(r.province), tier: null }
}

/**
 * `COMPANIES_FOR_COMPARE` 一行 + 岗位聚合 → 对照行。官网两列取序:人工/ETL 列优先,K 调查列兜。
 *
 * @param input 公司行与聚合。
 * @returns 对照行。
 */
export function toCompareRow(input: ToCompareRowIn): CompareRow {
  const c = input.company
  let website = text(c.website)
  if (website === '') {
    website = text(c.ai_website)
  }
  return {
    name: text(c.name), industry: text(c.industry), aliasZh: text(c.alias_zh), aliasKo: text(c.alias_ko),
    wiki: text(c.wiki_url), website: website, aiBrief: text(c.ai_brief),
    lmiaPositions: numOrNull(c.lmia_positions),
    lmiaPositionsSkilled: numOrNull(c.lmia_positions_skilled),
    lmiaLastQuarter: text(c.lmia_last_quarter),
    aip: input.agg.aip,
    openJobs: input.agg.openJobs, avgScore: input.agg.avgScore,
    namedJobs: input.agg.namedJobs, medSalary: input.agg.medSalary,
    mainProvince: input.agg.mainProvince, diffTier: null,
    matchHigh: input.agg.matchHigh, matchMid: input.agg.matchMid,
  }
}
