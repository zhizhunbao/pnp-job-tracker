// 职位数据访问层(DAL)—— 一领域一文件:职位相关的**所有 SQL + 行映射 + match** 都在这里,
// 路由/页面/提醒只调函数、不写裸 SQL(E10-01 收拢;Frank「所有职位 SQL 拆一个文件」)。
// 列名是 Payload snake_case(老坑 5):改 Jobs schema 只动这里。
import { match, matchRank, type MatchDims, type MatchJob, type MatchProfile, NO_LIST_PROVINCES } from './match'
import type { JobRow } from './types'
import * as SQL from '../db/sql'   // SQL 文本全在那儿,本文件只管取数与映射   // 形状住类型文件,不再反向依赖 'use client' 组件

// 库里的 timestamp 回来是 Date、numeric 回来是字符串 —— 两个都得归一(dims.ts 走同一对,别各写一份)
export const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? ''))
export const num = (v: any) => (v == null ? null : Number(v)) // pg numeric 返回字符串,转回数字

// ═══════════════════════════════════════════════════════════════════════════
// 1) 筛选/排序 → SQL 片段(E5-03 邮件提醒 + E10-01 列表 共用的单一 WHERE 真相)
//    键名 = /jobs 前端筛选 state 原样(fProv/fCity/q/directOnly…);阈值逐字对齐旧前端谓词。
// ═══════════════════════════════════════════════════════════════════════════

const PROV_CODE: Record<string, string> = {
  'Ontario': 'ON', 'British Columbia': 'BC', 'Alberta': 'AB', 'Quebec': 'QC', 'Manitoba': 'MB',
  'Saskatchewan': 'SK', 'Nova Scotia': 'NS', 'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL',
  'Prince Edward Island': 'PE',
}
// #168:反向表 —— 喂给模型的事实**必须用省全名**。实测 NS(Nova Scotia)的岗被顾问说成
// 「符合新不伦瑞克省提名」:两字母省码对模型有歧义,它猜错了。同类前科:NL 在地图里被当成荷兰国家码。
// 规矩:**对外部消费者(模型、地图、搜索引擎)一律给全名,省码只在库内与筛选参数里用。**
export const PROV_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(PROV_CODE).map(([name, code]) => [code, name]),
)

// 搜索覆盖面:核心列(E10-01 拍板)——职位/公司/省市区/NOC 码/来源标签;分类中文标签后续 query→码补。
// 2026-07-19 搜索提速(Frank「搜索要 7-8 秒」,API 实测 3-5s):
// ① c.name 从 OR 里挪出改 company_id IN 子查询——跨表 OR 谓词让 planner 只能全表扫;
// ② province 存 2 字码,q>2 时 '%q%' 不可能命中,砍掉该分支(不可索引的死分支会毁位图 OR 计划);
// ③ 剩余分支配 pg_trgm GIN(docs/sql/search-trgm-indexes.sql,生产 DDL)→ 位图 OR 走索引。
const SEARCH_COLS = ['j.title', 'j.city', 'j.district', 'j.noc', 'j.source_label']

type JobsWhere = { sql: string; params: unknown[]; skipped: string[] }

/**
 * 搜索词拆分(2026-08-16 Frank「文本框可以搜索多个条件 用空格隔开可以吗」)。
 * 先前整串 `%q%` 只能在**同一列**里命中 —— 本地实测 q="line cook" 432 条,而 q="cook toronto" 0 条:
 * 用户一打空格就归零,而「木匠 多伦多」正是人本能会打的。改成按空格拆词、**词间 AND**(每词自己跨列 OR)。
 * 封顶 4 词:再多是滥用,每多一词就多一组位图 OR,平白拖慢(词数上限不报错,截断即可——搜索不是表单)。
 */
/** 省全名 → 省码(小写索引):库里 province 存 2 字码,搜「carpenter ontario」若不翻译必然 0 条 */
const PROV_BY_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(PROV_CODE).map(([name, code]) => [name.toLowerCase(), code]),
)
/** 省名最长几个词:Newfoundland and Labrador / Prince Edward Island = 3 */
const PROV_MAX_WORDS = Math.max(...Object.keys(PROV_BY_LOWER).map((n) => n.split(' ').length))

export const splitQ = (q: string): string[] => {
  const raw = q.trim().split(/\s+/).filter(Boolean)
  const out: string[] = []
  // 省全名先粘回去:「nova scotia」拆成两个词后哪个都不是省,只能靠公司名瞎撞
  for (let i = 0; i < raw.length;) {
    let take = 1
    for (let n = Math.min(PROV_MAX_WORDS, raw.length - i); n >= 2; n--) {
      if (PROV_BY_LOWER[raw.slice(i, i + n).join(' ').toLowerCase()]) { take = n; break }
    }
    out.push(raw.slice(i, i + take).join(' '))
    i += take
  }
  return out.slice(0, 4)
}

/** q 搜索公司名分支预解析:不限 LIMIT 保语义等价(全量 2 万公司的极端泛词也就 ~2 万 int,ANY 哈希扛得住)。
 *  多词:**逐词各查一组**(与 jobs 侧一样词间 AND),返回 number[][],下标与 splitQ 对齐 */
async function resolveQCompanyIds(pool: any, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
  const terms = splitQ(typeof filters.q === 'string' ? filters.q : '')
  if (!terms.length) return filters
  const ids = await Promise.all(terms.map(async (t) => {
    const { rows } = await pool.query(SQL.COMPANY_IDS_BY_NAME, [`%${t}%`])   // 不转义:与 jobs 侧 ILIKE 分支同口径
    return rows.map((r: any) => Number(r.id))
  }))
  return { ...filters, qCompanyIds: ids }
}

// 契约:返回 { sql(条件串,无 WHERE 前缀,空=TRUE), params, skipped };startIndex=占位符起始($N)。
export function buildJobsWhere(filters: Record<string, unknown>, startIndex = 1): JobsWhere {
  const conds: string[] = []
  const params: unknown[] = []
  const skipped: string[] = []
  const param = (v: unknown) => { params.push(v); return `$${startIndex + params.length - 1}` }
  const s = (k: string) => (typeof filters[k] === 'string' ? (filters[k] as string).trim() : '')
  const isOn = (k: string) => filters[k] === true || filters[k] === 'true' || filters[k] === '1'

  // 每词一组「跨列 OR」,词与词之间 AND(见 splitQ)。单词时与旧写法逐字等价。
  for (const [i, term] of splitQ(s('q')).entries()) {
    const ph = param(`%${term}%`)
    const cols = term.length <= 2 ? [...SEARCH_COLS, 'j.province'] : SEARCH_COLS
    const branches = cols.map((c) => `${c} ILIKE ${ph}`)
    // 省全名单独翻成省码:2026-08-16 实测 q="carpenter ontario" 0 条 —— province 列存 'ON',
    // 'ontario' 在任何一列里都不存在。整串搜索时代这条不明显(整串本来就 0),分词之后它就成了主路。
    const pc = PROV_BY_LOWER[term.toLowerCase()]
    if (pc) branches.push(`j.province = ${param(pc)}`)
    // 公司名分支:qCompanyIds=调用方经 resolveQCompanyIds 预查(companies trgm 索引,ms 级)——
    // `= ANY(数组)` 才能与 trgm 分支一起进位图 OR;IN(子查询) 计划期不可索引,整个 OR 退化全表扫(EXPLAIN 实锤)。
    const pre = Array.isArray(filters.qCompanyIds) ? (filters.qCompanyIds as unknown[]) : null
    const ids = pre ? (Array.isArray(pre[i]) ? pre[i] as number[] : []) : null
    if (ids) { if (ids.length) branches.push(`j.company_id = ANY(${param(ids)})`) }
    else branches.push(SQL.companyIdInByName(ph))   // 未预查回退(语义同,慢)
    conds.push(`(${branches.join(' OR ')})`)
  }

  if (s('company')) conds.push(`c.name = ${param(s('company'))}`)   // 精确公司名(advisor「同公司在榜岗」用)
  if (s('fCountry')) conds.push(`j.country = ${param(s('fCountry'))}`)
  if (s('fProv')) conds.push(`j.province = ${param(PROV_CODE[s('fProv')] || s('fProv'))}`)
  if (s('fCity')) conds.push(`j.city = ${param(s('fCity'))}`)
  if (s('fDistrict')) conds.push(`j.district = ${param(s('fDistrict'))}`)

  // 职业多值(2026-08-16):逗号分隔 NOC 码,档案里选了几个职业就查几个 —— 与初评表「在招」同一把尺
  if (s('fNoc')) {
    const codes = s('fNoc').split(',').map((x) => x.trim()).filter((x) => /^\d{5}$/.test(x))
    if (codes.length) conds.push(`j.noc = ANY(${param(codes)})`)
  }
  if (s('fBroad')) conds.push(`j.broad = ${param(s('fBroad'))}`)
  if (s('fMid')) conds.push(`j.mid = ${param(s('fMid'))}`)
  if (s('fFine')) conds.push(`j.fine = ${param(s('fFine'))}`)
  if (s('fTeer')) {
    if (s('fTeer') === '未分类') conds.push(`j.teer IS NULL`)
    else { const m = /(\d)/.exec(s('fTeer')); if (m) conds.push(`j.teer = ${param(Number(m[1]))}`) }
  }

  if (s('fSource')) conds.push(`j.source_label = ${param(s('fSource'))}`)
  if (s('fAcc')) conds.push(`j.accessibility = ${param(s('fAcc'))}`)

  if (s('fPnp') === 'yes') conds.push(`COALESCE(j.pnp_eligible,false) = true`)
  else if (s('fPnp') === 'no') conds.push(`COALESCE(j.pnp_eligible,false) = false AND COALESCE(j.province,'') <> 'QC'`)
  if (s('fAip') === 'yes') conds.push(`COALESCE(j.aip,false) = true`)
  else if (s('fAip') === 'no') conds.push(`COALESCE(j.aip,false) = false`)
  // RCIP/FCIP 试点社区(E6-11):yes=任一试点命中;RCIP/FCIP=指定类型(含同城双试点 'RCIP+FCIP')
  if (s('fPilot') === 'yes') conds.push(`COALESCE(j.pilot,'') <> ''`)
  else if (s('fPilot') === 'no') conds.push(`COALESCE(j.pilot,'') = ''`)
  else if (s('fPilot') === 'RCIP' || s('fPilot') === 'FCIP') conds.push(`COALESCE(j.pilot,'') LIKE ${param('%' + s('fPilot') + '%')}`)

  // #136(批A):默认排除已下架——status 列默认藏,closed 行混在列表里无标记;显式选「已下架」仍可看
  if (s('fStatus')) conds.push(`COALESCE(j.status,'open') = ${param(s('fStatus'))}`)
  else conds.push(`COALESCE(j.status,'open') <> 'closed'`)
  if (s('fOrigin')) conds.push(`j.origin = ${param(s('fOrigin'))}`)

  // E12-08 尾巴:fScore 谓词随评分制切 1-5 通道档(高=4-5/中=3/低=1-2);下拉已下架,只剩 URL/老保存筛选触发
  if (s('fScore') === 'high') conds.push(`j.grade_channel >= 4`)
  else if (s('fScore') === 'mid') conds.push(`j.grade_channel = 3`)
  else if (s('fScore') === 'low') conds.push(`j.grade_channel <= 2`)

  if (s('fSal') === 'ge100') conds.push(`j.salary_annual >= 100000`)
  else if (s('fSal') === '80') conds.push(`j.salary_annual >= 80000 AND j.salary_annual < 100000`)
  else if (s('fSal') === '60') conds.push(`j.salary_annual >= 60000 AND j.salary_annual < 80000`)
  else if (s('fSal') === 'u60') conds.push(`j.salary_annual < 60000`)

  if (s('fVs') === 'above' || s('fVs') === 'above20' || s('fVs') === 'below') {
    const guard = `j.salary_annual IS NOT NULL AND j.wage_med_annual IS NOT NULL AND j.wage_med_annual <> 0`
    const cmp = s('fVs') === 'above' ? `j.salary_annual >= j.wage_med_annual`
      : s('fVs') === 'above20' ? `j.salary_annual >= 1.2 * j.wage_med_annual`
        : `j.salary_annual < j.wage_med_annual`
    conds.push(`(${guard} AND ${cmp})`)
  }

  if (s('fEmp') === 'full' || s('fEmp') === 'part') conds.push(`j.employment_hours = ${param(s('fEmp'))}`)
  else if (s('fEmp') === 'gig') conds.push(`(j.employment_hours = 'part' OR j.employment_term IN ('casual','seasonal'))`)

  if (isOn('directOnly')) conds.push(`(COALESCE(j.apply_url,'') NOT ILIKE '%jobbank.gc.ca%' OR COALESCE(j.source,'') = 'Job Bank')`)

  // GAP1③:排除 JD 明确不担保/须 PR 的岗(红旗=数据层 visa_flag 检测;未检出=通过,宁可漏不误伤)
  if (s('fElig') === 'ok') conds.push(`COALESCE(j.eligibility_flag,'') = ''`)

  return { sql: conds.length ? conds.join(' AND ') : 'TRUE', params, skipped }
}

// 排序白名单(列 key → SQL 列/表达式):防注入,未知 key 回退发布时间。默认序=发布时间↓,同序评分↓、id↓ 兜底唯一。
// 2026-07-18 Frank 报「字段排序不好使」修:E10 服务端化时这里只搬了 9 个 key,前端表头却全列可点,
// 白名单外的列静默回退发布时间序=看着像坏了——按前端 COLUMNS 补齐;match 列无 SQL 语义不进白名单。
const SORT_COLUMNS: Record<string, string> = {
  // E12-08:评分列改「通道」——排序主键=通道档,orderBy tail 的 j.score DESC 兜底同档内次序
  datePosted: 'j.date_posted', score: 'j.grade_channel', salary: 'j.salary_annual', salaryYr: 'j.salary_annual',
  lastSeen: 'j.last_seen', title: 'j.title', company: 'c.name', province: 'j.province', city: 'j.city',
  broad: 'j.broad', mid: 'j.mid', fine: 'j.fine', teer: 'j.teer', noc: 'j.noc',
  accessibility: 'j.accessibility', country: 'j.country', district: 'j.district', address: 'j.address',
  source: 'j.source_label', origin: 'j.origin',
  direct: `(COALESCE(j.apply_url,'') NOT ILIKE '%jobbank.gc.ca%' OR COALESCE(j.source,'') = 'Job Bank')`,   // 与 directOnly 筛选同一谓词
  pnp: 'j.pnp_eligible', ee: 'j.ee_category', aip: 'j.aip', pilot: 'j.pilot', lmia: 'c.lmia_positions',
  eligibility: `COALESCE(j.eligibility_flag,'')`,   // GAP1③:红旗岗聚一起看

  status: 'j.status', closedAt: 'j.closed_at',
  empHours: `COALESCE(j.employment_hours,'')`, empTerm: `COALESCE(j.employment_term,'')`,   // J1 两列(#73 教训:前端可点列必须进白名单)
  wageMedHr: 'j.wage_med_hourly', wageMedYr: 'j.wage_med_annual',
  vsMedian: '(j.salary_annual::float / NULLIF(j.wage_med_annual, 0))',
}
// Pro 数据列排序回退(#73 防行序泄露):2026-07-25「先都显示出来」中位三件套数据已放开,
// 泄露前提不存在 → 回退集清空(集合保留,收费面回收时把列名加回来即可)
const PRO_SORTS = new Set<string>([])
// #127:旧 0-100 分从所有排序兜底退役(不按分数重排,与 JB 一致)。
// #159(Frank 报障「昨晚榜首和今天 11 点还是同一个岗」):#127 的同日兜底用 j.id ASC 有致命副作用——
// date_posted 只有日期没时间,于是**当天最早抓到的那批一整天钉在榜首**,晚上新抓的岗反沉到当天最底
// (实测:榜首是 08:31 那批,19:31 的新岗在后面)。改用 first_seen DESC=最新发现的在前:
// 仍是纯时间序不掺分数(#127 意图不变),但榜单随每小时抓取真正滚动起来。
function orderByClause(sortKey?: string, dir?: string, pro = true): string {
  const key = sortKey && (pro || !PRO_SORTS.has(sortKey)) ? sortKey : undefined
  const col = (key && SORT_COLUMNS[key]) || 'j.date_posted'
  const d = dir === 'asc' ? 'ASC' : 'DESC'
  const fresh = 'j.first_seen DESC NULLS LAST, j.id DESC'
  const tail = col === 'j.date_posted' ? fresh : `j.date_posted DESC NULLS LAST, ${fresh}`
  return SQL.orderBy(col, d, tail)
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) 列集 / FROM / 行映射 / match(读库口径,列表与首屏共用)
// ═══════════════════════════════════════════════════════════════════════════

// 维度行映射(match 引擎口径;/api/jobs-data 自取维度时与 page.tsx 同一把尺)
export const mapPnpOcc = (r: any) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, program: r.program || 'PNP', noc: r.noc, name: r.name, gtaRestricted: !!r.gtaRestricted, url: r.url, fetched: r.fetched })
// 省提名匹配只吃 program=PNP 的清单:AIP 背书是另一条路,混进来会让「命中/被排除」判在错的项目上(E6-09)
export const pnpOnly = <T extends { program?: string }>(rows: T[]): T[] => rows.filter((r) => (r.program || 'PNP') === 'PNP')
export const mapEeCat = (r: any) => ({ category: r.category, label: r.label, noc: r.noc, teer: typeof r.teer === 'number' ? r.teer : null, title: r.title, url: r.url, fetched: r.fetched, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', drawSize: typeof r.drawSize === 'number' ? r.drawSize : null })

const JOB_COLUMNS = SQL.JOB_COLUMNS
const JOB_FROM = SQL.JOB_FROM
const DEDUPE_COND = SQL.DEDUPE_COND

// 行映射(不含 match;match 由调用方按人/序算好传入)。Pro 列(工资中位三件套)免费用户置空 —— 不进浏览器。
function mapJobRow(j: any, pro: boolean, matchLevel: JobRow['match']): JobRow {
  return {
    match: matchLevel,
    id: j.id,
    title: j.title ?? '',
    company: j.company_name ?? '',
    companySlug: j.company_slug ?? '',
    companyDescription: j.company_description ?? '',
    companySectors: j.company_sectors ?? '',
    companyWebsiteSrc: j.website_source ?? '',
    lmiaPositions: num(j.lmia_positions),
    lmiaPositionsSkilled: num(j.lmia_positions_skilled),
    lmiaLastQuarter: j.lmia_last_quarter ?? '',
    lmiaStreams: j.lmia_streams ?? '',
    address: j.address ?? j.company_address ?? '',
    source: j.source ?? '',
    sourceLabel: j.source_label ?? '',
    origin: j.origin ?? '',
    country: j.country ?? '',
    province: j.province ?? '',
    city: j.city ?? '',
    district: j.district ?? '',
    noc: j.noc ?? '',
    category: j.category ?? '',
    teer: num(j.teer),
    broad: j.broad ?? '未分类',
    mid: j.mid ?? '未分类',
    fine: j.fine ?? '未分类',
    accessibility: j.accessibility ?? '',
    score: num(j.score),
    // E12-08:通道档(1-5,主表「通道」列免费展示)+ 公司担保档(药丸);三维明细不进列表行(额度 API 专供)
    gradeChannel: num(j.grade_channel),
    sponsorGrade: num(j.sponsor_grade),
    pnpEligible: !!j.pnp_eligible,
    pnpStream: j.pnp_stream ?? '',
    eeCategory: j.ee_category ?? '',
    aip: !!j.aip,
    pilot: j.pilot ?? '', pilotCommunity: j.pilot_community ?? '', pilotEmployer: !!j.pilot_employer, pilotOcc: j.pilot_occ ?? '',
    employmentTerm: j.employment_term ?? '',
    employmentHours: j.employment_hours ?? '',
    eligibilityFlag: j.eligibility_flag ?? '',
    eligibilityQuote: j.eligibility_quote ?? '',
    certificates: Array.isArray(j.certificates) ? j.certificates : [],
    education: j.education ?? '',
    salary: j.salary ?? '',
    salaryAnnual: num(j.salary_annual),
    salaryText: j.salary_text ?? '',
    // 2026-07-25 Frank「先都显示出来」:中位/band 七字段随 PRO_COLUMNS 放开(此处原 pro 裁剪是
    // 与前端 PRO_COLS 同款的第三处暗雷——改闸必须三处同步的教训,收费面回收时一并改回)
    wageMedHourly: num(j.wage_med_hourly),
    wageMedAnnual: num(j.wage_med_annual),
    wageLowHourly: num(j.wage_low_hourly),
    wageLowAnnual: num(j.wage_low_annual),
    wageHighHourly: num(j.wage_high_hourly),
    wageHighAnnual: num(j.wage_high_annual),
    wageYear: j.wage_year ?? '',
    officialUrl: j.official_url ?? j.company_website ?? '',
    applyUrl: j.apply_url ?? '',
    datePosted: iso(j.date_posted),
    firstSeen: iso(j.first_seen),
    lastSeen: iso(j.last_seen),
    status: j.status ?? 'open',
    closedAt: iso(j.closed_at),
  }
}

// match 计算器(规则在 lib/match.ts 一处):按人逐行算 level;未建档/未登录返回 null。
// 匹配全放开(Frank 2026-07-21:匹配=免费获客钩子,收费只留 Pro 数据列打码)——不再按下标截断,
// 每一行都返回真实档位;付费墙只剩 vs中位/工资中位这些 Pro 数据列(mapJobRow 里按 pro 剥值)。
type Matcher = { of: (j: any) => JobRow['match']; high: () => number; mid: () => number }
function makeMatcher(profile: MatchProfile, profileOk: boolean, matchDims: MatchDims): Matcher {
  let high = 0, mid = 0
  return {
    of: (j) => {
      if (!profileOk) return null
      const mj: MatchJob = {
        noc: j.noc ?? '', teer: num(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible,
        pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: num(j.salary_annual), wageMedAnnual: num(j.wage_med_annual),
        lmiaPositions: num(j.lmia_positions), lmiaPositionsSkilled: num(j.lmia_positions_skilled), lmiaLastQuarter: j.lmia_last_quarter ?? '',
      }
      const level = match(profile, mj, matchDims).level
      if (level === 'high') high++
      else if (level === 'mid') mid++
      return level
    },
    high: () => high, mid: () => mid,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) 查询函数(路由/页面/提醒只调这些,不写裸 SQL)
// ═══════════════════════════════════════════════════════════════════════════

type JobsListOpts = { pro: boolean; profile: MatchProfile; profileOk: boolean; matchDims: MatchDims; limit: number }

/** 一次性取前 limit 行:page.tsx SSR 首屏 50 行用(筛选/翻页走 /api/jobs 分页;E10-01 P5 已删旧 /api/jobs-data blob 端点)。 */
export async function fetchJobRows(pool: any, { pro, profile, profileOk, matchDims, limit }: JobsListOpts): Promise<{ jobs: JobRow[]; updatedAt: string; matchHigh: number; matchMid: number }> {
  const { rows } = await pool.query(
    SQL.JOB_ROWS_LATEST, [limit])
  const m = makeMatcher(profile, profileOk, matchDims)
  const jobs = rows.map((j: any) => mapJobRow(j, pro, m.of(j)))
  // 原来取「前 50 行的最大 last_seen」→ 比全站还旧(首屏行未必是最近被确认的那批),与 /api/jobs 口径也不一致
  const updatedAt = await checkedAt(pool)
  return { jobs, updatedAt, matchHigh: m.high(), matchMid: m.mid() }
}

type JobsPageOpts = {
  pro: boolean; profile: MatchProfile; profileOk: boolean; matchDims: MatchDims
  filters: Record<string, unknown>; sort?: { key?: string; dir?: string }; page: number; pageSize: number
}

// count/updatedAt 微缓存(2026-07-19「排序 3-4 秒」第二刀):换排序/翻页时 WHERE 不变,总数与全局
// 新鲜度没必要每次全表扫重算——按 WHERE 签名缓存 30s(数据小时级更新,30s 陈旧无感;Render 单实例)。
const countCache = new Map<string, { n: number; ts: number }>()
const COUNT_TTL = 30_000
let updCache: { v: string; ts: number } | null = null

/** 页面上那个时间 =「最近核对」:最近一轮 seed 成功完成的时刻(etl_heartbeat,每小时一轮)。
 * 2026-07-26 Frank「前端数据时间怎么没更新」→ 原口径是 max(last_seen)=「数据最后真的变了」,
 * 午夜后 Job Bank 当天还没发岗(00:30 那轮实测 0 行)→ 数据确实没变,时间冻在昨晚,读起来像站死了。
 * 心跳表未落地(部署时序)→ 退回 max(last_seen),列到位自动恢复。30s 缓存(与 count 同档)。 */
export async function checkedAt(pool: any): Promise<string> {
  const now = Date.now()
  if (updCache && now - updCache.ts < COUNT_TTL) return updCache.v
  let v = ''
  try {
    const r = await pool.query(SQL.ETL_HEARTBEAT)
    v = iso(r.rows[0]?.last_seed)
  } catch (e: any) {
    if (e?.code !== '42P01') throw e
  }
  if (!v) v = iso((await pool.query(SQL.JOBS_MAX_LAST_SEEN)).rows[0]?.upd)
  updCache = { v, ts: now }
  return v
}

/** E10-01:服务端筛选+排序+分页。返回当前页行 + 同 WHERE 总数(count)+ 全局 updatedAt(max last_seen)。 */
// #125(批C,Frank「不要有重复」):同 公司×岗名×城市 多帖(多源聚合/同岗重发,open 里 ~1900 行)只显最新。
// 判定在 ETL(09_build_mart 标 isDup,行保留仅展示隐藏,统计/榜单口径不动);此处只剩布尔过滤——
// 请求路径反连接实测 5.8s(0.1 vCPU)不可用,预计算是唯一出路。列未落地期(部署时序)42703 由调用方降级兜底

export async function fetchJobsPage(
  pool: any, { pro, profile, profileOk, matchDims, filters, sort, page, pageSize }: JobsPageOpts,
): Promise<{ jobs: JobRow[]; total: number; updatedAt: string }> {
  const w = buildJobsWhere(await resolveQCompanyIds(pool, filters), 1)
  const order = orderByClause(sort?.key, sort?.dir, pro)
  const limPh = `$${w.params.length + 1}`, offPh = `$${w.params.length + 2}`
  const now = Date.now()
  const cntKey = w.sql + '|' + JSON.stringify(w.params)
  const cachedCnt = countCache.get(cntKey)
  const run = async (cond: string) => Promise.all([
    pool.query(SQL.jobsPage(w.sql, cond, order, limPh, offPh), [...w.params, pageSize, page * pageSize]),
    cachedCnt && now - cachedCnt.ts < COUNT_TTL ? null : pool.query(SQL.jobsPageCount(w.sql, cond), w.params),
    checkedAt(pool),   // 全局新鲜度(与筛选无关;自带 30s 缓存)
  ])
  let listRes, cntRes, upd
  try {
    ;[listRes, cntRes, upd] = await run(DEDUPE_COND)
  } catch (e: any) {
    if (e?.code !== '42703') throw e   // is_dup 列未落地(部署时序)→ 不去重降级,列到位自动恢复
    ;[listRes, cntRes, upd] = await run('TRUE')
  }
  let total: number
  if (cntRes) {
    total = cntRes.rows[0]?.n ?? 0
    if (countCache.size > 300) countCache.clear()   // 粗暴防涨,300 组筛选签名足够日常
    countCache.set(cntKey, { n: total, ts: now })
  } else total = cachedCnt!.n
  const updatedAt = upd as string
  const m = makeMatcher(profile, profileOk, matchDims)
  const jobs = listRes.rows.map((j: any) => mapJobRow(j, pro, m.of(j)))
  return { jobs, total, updatedAt }
}

type MatchPageOpts = {
  pro: boolean; profile: MatchProfile; matchDims: MatchDims; page: number; pageSize: number
  sort?: { key?: string; dir?: string }
}

// 匹配视图列排序取值器(第 21 轮续,Frank「排序点了 table 没变化」二报:普通视图 #73 已修,
// 匹配视图 fetchMatchPage 一直无视 sort——命中集在 TS 内存里,这里按列取原始行值排)
const MATCH_SORT_VAL: Record<string, (j: any) => unknown> = {
  datePosted: (j) => iso(j.date_posted), score: (j) => num(j.grade_channel), salary: (j) => num(j.salary_annual), salaryYr: (j) => num(j.salary_annual),
  lastSeen: (j) => iso(j.last_seen), title: (j) => j.title ?? '', company: (j) => j.company_name ?? '', province: (j) => j.province ?? '', city: (j) => j.city ?? '',
  broad: (j) => j.broad ?? '', mid: (j) => j.mid ?? '', fine: (j) => j.fine ?? '', teer: (j) => num(j.teer), noc: (j) => j.noc ?? '',
  accessibility: (j) => j.accessibility ?? '', country: (j) => j.country ?? '', district: (j) => j.district ?? '', address: (j) => j.address ?? '',
  source: (j) => j.source_label ?? '', origin: (j) => j.origin ?? '',
  pnp: (j) => (j.pnp_eligible ? 1 : 0), ee: (j) => j.ee_category ?? '', aip: (j) => (j.aip ? 1 : 0), pilot: (j) => j.pilot ?? '', lmia: (j) => num(j.lmia_positions),
  status: (j) => j.status ?? '', closedAt: (j) => iso(j.closed_at),
  wageMedHr: (j) => num(j.wage_med_hourly), wageMedYr: (j) => num(j.wage_med_annual),
  vsMedian: (j) => { const s = num(j.salary_annual); const m = num(j.wage_med_annual); return s != null && m ? s / m : null },
}

/**
 * E10-01 P3:「我的匹配」视图服务端化(替代旧 blob 客户端筛)。
 * 候选预筛(SQL 把 3 万压到只可能命中 high/mid 的:pnpEligible∪有EE类别∪NOC对口∪同小类)→ TS 跑 match() 留 high/mid
 * → 免费用户仅前 N 个可见(cap;FOMO 计数仍返全量 high/mid)→ 按 match 等级+日期序分页。
 * 预筛用并集从宽,宁可多算不漏(named-list 命中的岗基本都 pnpEligible,已被并集覆盖)。候选封顶防失控。
 */
export async function fetchMatchPage(
  pool: any, { pro, profile, matchDims, page, pageSize, sort }: MatchPageOpts,
): Promise<{ jobs: JobRow[]; total: number; matchHigh: number; matchMid: number; updatedAt: string }> {
  const nocs = profile.nocCodes || []
  const noc4 = Array.from(new Set(nocs.filter((c) => c.length === 5).map((c) => c.slice(0, 4))))
  const noc3 = Array.from(new Set(nocs.filter((c) => c.length === 5).map((c) => c.slice(0, 3))))   // 同族档(match.ts 三档制)
  const CAND_CAP = 12000  // 候选封顶:按新鲜度取最近 N 个候选,防全表 TS 计算失控(足够覆盖真实匹配)
  const [candRes, updRes] = await Promise.all([
    pool.query(
      SQL.MATCH_PAGE,
      [nocs, noc4, noc3, CAND_CAP]),
    pool.query(SQL.JOBS_MAX_LAST_SEEN),
  ])
  let matchHigh = 0, matchMid = 0
  const hits: { j: any; level: 'high' | 'mid' }[] = []
  for (const j of candRes.rows) {
    const mj: MatchJob = {
      noc: j.noc ?? '', teer: num(j.teer), province: j.province ?? '', pnpEligible: !!j.pnp_eligible,
      pnpStream: j.pnp_stream ?? '', eeCategory: j.ee_category ?? '', salaryAnnual: num(j.salary_annual), wageMedAnnual: num(j.wage_med_annual),
      lmiaPositions: num(j.lmia_positions), lmiaPositionsSkilled: num(j.lmia_positions_skilled), lmiaLastQuarter: j.lmia_last_quarter ?? '',
    }
    const level = match(profile, mj, matchDims).level
    if (level === 'high') { matchHigh++; hits.push({ j, level }) }
    else if (level === 'mid') { matchMid++; hits.push({ j, level }) }
  }
  // 默认排序:match 等级↓(候选已按日期↓,stable sort 保同级内日期序)
  hits.sort((a, b) => matchRank(b.level) - matchRank(a.level))
  // 匹配全放开(Frank 2026-07-21):免费用户也看全部匹配岗,不再截断——收费只剩 Pro 数据列打码。
  const visible = hits
  // 列排序(表头点击):在可见集内重排;Pro 数据列(vs中位/工资)非 Pro 仍不响应;同值按匹配度次序兜底
  const getter = sort?.key && sort.key !== 'match' && (pro || !PRO_SORTS.has(sort.key)) ? MATCH_SORT_VAL[sort.key] : null
  if (getter) {
    const d = sort!.dir === 'asc' ? 1 : -1
    visible.sort((a, b) => {
      const va = getter(a.j) as any, vb = getter(b.j) as any
      const na = va == null || va === '', nb = vb == null || vb === ''
      if (na || nb) return na && nb ? 0 : na ? 1 : -1     // 空值恒沉底
      if (va < vb) return -d
      if (va > vb) return d
      return matchRank(b.level) - matchRank(a.level)
    })
  }
  const pageItems = visible.slice(page * pageSize, page * pageSize + pageSize)
  const jobs = pageItems.map(({ j, level }) => mapJobRow(j, pro, level))
  return { jobs, total: visible.length, matchHigh, matchMid, updatedAt: iso(updRes.rows[0]?.upd) }
}

/** E8-07 详情页:按 id 取单岗(与列表同一列集/映射/Pro 剥离口径;closed 岗也返回——详情页保留可访问)。 */
export async function fetchJobById(
  pool: any, id: number, { pro, profile, profileOk, matchDims }: Omit<JobsListOpts, 'limit'>,
): Promise<JobRow | null> {
  if (!Number.isFinite(id)) return null
  const { rows } = await pool.query(SQL.JOB_BY_ID, [id])
  if (!rows.length) return null
  const m = makeMatcher(profile, profileOk, matchDims)
  // 详情页单岗:免费 cap 以 0 号位判(建档免费用户在详情页能看本岗匹配级——单岗不构成枚举面)
  return mapJobRow(rows[0], pro, m.of(rows[0]))
}

export type RelatedJob = { id: number; title: string; company: string; city: string; province: string; salaryText: string }
const mapRelated = (r: any): RelatedJob => ({ id: Number(r.id), title: r.title ?? '', company: r.company_name ?? '', city: r.city ?? '', province: r.province ?? '', salaryText: r.salary_text ?? r.salary ?? '' })

/** E8-07 详情页「相关职位」:同公司在招 ≤3 + 同省同 NOC 小类在招 ≤3(都排除本岗;瘦行,不过 Pro 剥离——无 Pro 列)。
 *  2026-08-11:两组都空时还要给一条兜底链接(下架页不能是死路),于是顺带探一下本省该分类**有没有**在招岗 ——
 *  用 EXISTS(命中一行即停,不 COUNT 全表:这是每请求现算,只在 closed 且零相关的页面上跑)。
 *  返回 fallbackLevel = 能筛出东西的最细一级;三级都空 = null(调用方退到只按省)。 */
export async function fetchRelatedJobs(
  pool: any,
  job: { id: string | number; company: string; province: string; noc: string; fine?: string; mid?: string; broad?: string },
): Promise<{ sameCompany: RelatedJob[]; sameOcc: RelatedJob[]; fallbackLevel: 'fine' | 'mid' | 'broad' | null }> {
  const [co, occ] = await Promise.all([
    job.company ? pool.query(
      SQL.RELATED_SAME_COMPANY, [job.company, job.id]) : { rows: [] },
    job.noc && job.province ? pool.query(
      SQL.RELATED_SAME_OCC, [job.province, job.noc, job.id, job.company || '']) : { rows: [] },
  ])
  const sameCompany = co.rows.map(mapRelated)
  const sameOcc = occ.rows.map(mapRelated)
  if (sameCompany.length || sameOcc.length || !job.province) return { sameCompany, sameOcc, fallbackLevel: null }

  // 兜底探测:三级分类各探一次「本省该级还有没有在招岗」。空分类(未分类)不探。
  const levels = ([['fine', job.fine], ['mid', job.mid], ['broad', job.broad]] as const)
    .filter(([, v]) => v && v !== '未分类')
  if (!levels.length) return { sameCompany, sameOcc, fallbackLevel: null }
  const { rows } = await pool.query(
    SQL.levelHasJobs(levels.map(([lv]) => lv)),
    [job.province, ...levels.map(([, v]) => v)],
  )
  const hit = levels.find(([lv]) => rows[0]?.[`${lv}_has`])
  return { sameCompany, sameOcc, fallbackLevel: hit ? hit[0] : null }
}

/** 头条总数 + 差异化证言数字(省提名清单命中岗 named + 有外劳记录雇主数 lmia)。原在 page.tsx 裸 SQL,收编于此。 */
// 2026-08-03 生产僵死事故:这三连 count 是全表扫,首页/start 每个请求都跑一遍,seed 后 DB 变慢时
// 单次涨到 ~10s → 默认 10 连接的应用池被排队打满,整站 DB 页超时。TTL 缓存(60s,countCache 同惯例):
// 这三个数是站级证言数字,分钟级新鲜度绰绰有余。
let tpCache: { v: { total: number; named: number; lmia: number }; ts: number } | null = null
const TP_TTL = 60_000
export async function fetchTotalAndProof(pool: any): Promise<{ total: number; named: number; lmia: number }> {
  if (tpCache && Date.now() - tpCache.ts < TP_TTL) return tpCache.v
  // 副标题总数与列表同口径(#125 后修+#136):去重+排除已下架,与默认列表 WHERE 一致
  const OPEN_COND = `COALESCE(j.status,'open') <> 'closed'`
  const q = (cond: string) => pool.query(SQL.totalAndProof(cond))
  let rows
  try {
    ;({ rows } = await q(`${DEDUPE_COND} AND ${OPEN_COND}`))
  } catch (e: any) {
    if (e?.code !== '42703') throw e   // is_dup 列未落地(部署时序)→ 降级不去重,列到位自动恢复
    ;({ rows } = await q(OPEN_COND))
  }
  tpCache = { v: { total: rows[0]?.n ?? 0, named: rows[0]?.named ?? 0, lmia: rows[0]?.lmia ?? 0 }, ts: Date.now() }
  return tpCache.v
}

// ── E8-09 B:公司详情页 /companies/[slug] 数据(零新抓取:companies 行 + 该司在招岗聚合) ──
type CompanyJobRow = { id: number; title: string; city: string; province: string; gradeChannel: number | null; noc: string; nocTitle: string; nocTitleZh: string; nocTitleKo: string; teer: number | null; salaryText: string; datePosted: string }
export type CompanyDetail = {
  name: string; slug: string; website: string; websiteSource: string; industry: string; sectors: string
  aliasZh: string; aliasKo: string; wikiUrl: string; sponsorGrade: number | null
  scoreDetail: any | null; aiBrief: string; aiWebsite: string; aiSources: string[]; aiFetched: string
  description: string; address: string; province: string
  // LMIA 担保明细(E8-09 深化:股别拆解字段);lmiaStreams=展示串「High Wage 58 · Low Wage 1008」
  lmiaPositions: number | null; lmiaLmias: number | null; lmiaLastQuarter: string; lmiaStreams: string; lmiaSkilled: number | null
  // #286 获批职业拆分(近两年,与 lmiaPositions 同窗口;raw lmia-employers.nocs 下沉):
  // 列没建/没灌时为空数组 → 弹框整块不渲(容缺自激活,#284 探列同款);名字缺时前端渲裸码
  lmiaNocs?: { noc: string; positions: number; title: string; titleZh: string; titleKo: string }[]
  openCount: number
  jobs: CompanyJobRow[]
}
/** slug → 公司行 + 在招岗(≤30,按发布时间,带 NOC 译名/薪资);查无返回 null(页面走 Notice 不 404)。全事实层免费,不走额度闸。 */
export async function fetchCompanyBySlug(pool: any, slug: string): Promise<CompanyDetail | null> {
  if (!slug) return null
  return fetchCompanyWhere(pool, 'c.slug = $1', slug)
}
/** E8-11 B1:job id → 同一份 CompanyDetail(公司弹框同源;按 jobs.company_id 解析,同名公司/无 slug 公司也不串)。 */
export async function fetchCompanyByJobId(pool: any, jobId: number): Promise<CompanyDetail | null> {
  const detail = await fetchCompanyWhere(pool, SQL.COMPANY_BY_JOB_ID_COND, jobId)
  // #199(Frank「有精确地址就优先显数据库的」):公司表 address 常空;从点进来的这条职位取精确地址(带街号/邮编)兜底
  if (detail && !detail.address) {
    const { rows } = await pool.query(SQL.JOB_ADDRESS_BY_ID, [jobId]).catch(() => ({ rows: [] }))
    if (rows[0]?.address) detail.address = String(rows[0].address)
  }
  return detail
}
async function fetchCompanyWhere(pool: any, where: string, param: unknown): Promise<CompanyDetail | null> {
  const { rows } = await pool.query(
    SQL.companyDetail(where), [param])
  const c = rows[0]
  if (!c) return null
  // NOC 译名 join(#151 口径,前端按界面语言取)——治「工作名不知道啥意思」,用官方职业名作对照
  const jr = await pool.query(
    SQL.COMPANY_OPEN_JOBS, [c.id])   // #198:上限 30→50,让「展开其余」内联展开(不再跳转搜索页)
  const cntRes = await pool.query(
    SQL.COMPANY_OPEN_COUNT, [c.id])
  let sources: string[] = []
  try { sources = JSON.parse(c.ai_sources || '[]') } catch { /* ignore */ }
  // #286 获批职业拆分:单独容缺查询(列没建/没灌 → 空数组,弹框整块不渲;不并主 SELECT 防 42703 掀整个弹框)
  let lmiaNocs: NonNullable<CompanyDetail['lmiaNocs']> = []
  try {
    const nr = await pool.query(SQL.COMPANY_LMIA_NOCS, [c.id])
    const raw = nr.rows[0]?.lmia_nocs
    const dict = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (dict && typeof dict === 'object') {
      const entries = Object.entries(dict).map(([noc, n]) => [noc, Number(n)] as [string, number])
        .filter(([noc, n]) => /^\d{5}$/.test(noc) && n > 0).sort((a, b) => b[1] - a[1])
      if (entries.length) {
        const nd = await pool.query(
          SQL.NOC_TITLES_BY_CODES,
          [entries.map(([noc]) => noc)]).then((r: any) => r.rows).catch(() => [])
        const nm = new Map<string, any>(nd.map((r: any) => [String(r.noc), r]))
        lmiaNocs = entries.map(([noc, positions]) => {
          const r = nm.get(noc) ?? {}
          return { noc, positions, title: r.title || '', titleZh: r.title_zh || '', titleKo: r.title_ko || '' }
        })
      }
    }
  } catch { /* 列未建=容缺,块不出 */ }
  return {
    name: c.name || '', slug: c.slug || '', website: c.website || '', websiteSource: c.website_source || '',
    industry: c.industry || '', sectors: c.sectors || '', aliasZh: c.alias_zh || '', aliasKo: c.alias_ko || '',
    wikiUrl: c.wiki_url || '', sponsorGrade: num(c.sponsor_grade),
    scoreDetail: c.score_detail ?? null, aiBrief: c.ai_brief || '', aiWebsite: c.ai_website || '',
    aiSources: Array.isArray(sources) ? sources : [], aiFetched: iso(c.ai_fetched).slice(0, 10),
    description: c.description || '', address: c.address || '', province: c.region || '',
    lmiaPositions: num(c.lmia_positions), lmiaLmias: num(c.lmia_lmias), lmiaLastQuarter: c.lmia_last_quarter || '',
    lmiaStreams: c.lmia_streams || '', lmiaSkilled: num(c.lmia_positions_skilled), lmiaNocs,
    openCount: cntRes.rows[0]?.n ?? jr.rows.length,
    jobs: jr.rows.map((j: any) => ({
      id: Number(j.id), title: j.title || '', city: j.city || '', province: j.province || '',
      gradeChannel: num(j.grade_channel), noc: j.noc || '', nocTitle: j.noc_title || '', nocTitleZh: j.noc_title_zh || '', nocTitleKo: j.noc_title_ko || '',
      teer: num(j.teer), salaryText: j.salary_text || j.salary || '', datePosted: iso(j.date_posted),
    })),
  }
}

export type SimilarEmployer = { slug: string; name: string; industry: string; sponsorGrade: number | null; openCount: number }
/** 相似雇主(E8-09:同省同行业、有在招岗,按担保档降序取 ≤6;排除自身)。SEO 内链 + 横向比较。 */
export async function fetchSimilarEmployers(pool: any, opts: { province: string; industry: string; excludeSlug: string }): Promise<SimilarEmployer[]> {
  if (!opts.province || !opts.industry) return []
  const { rows } = await pool.query(
    SQL.SIMILAR_EMPLOYERS,
    [opts.province, opts.industry, opts.excludeSlug])
  return rows.map((r: any) => ({ slug: r.slug, name: r.name || '', industry: r.industry || '', sponsorGrade: num(r.sponsor_grade), openCount: r.open_count ?? 0 }))
}

type AlertHit = { id: number; title: string; city: string; province: string; salary_text: string; company_name: string }

/** 邮件提醒命中查询(E5-03):某条保存筛选自 since 起的新岗(status=open ∩ first_seen>since ∩ filters)。原在 alerts/run 裸 SQL,收编于此。 */
export async function fetchAlertHits(pool: any, filters: Record<string, unknown>, since: string): Promise<{ rows: AlertHit[]; skipped: string[] }> {
  const w = buildJobsWhere(await resolveQCompanyIds(pool, filters), 2)   // $1 留给 since
  const { rows } = await pool.query(
    SQL.alertHits(w.sql), [since, ...w.params])
  return { rows, skipped: w.skipped }
}

// ═══════════════════════════════════════════════════════════════════════════
// 入口三问(付费漏斗重设计-20260726):答完立刻出的**免费结果**。
// 铁律:毫秒级、纯库内聚合、不碰 AI —— 用户答完三题不能盯着转圈。
// 口径与列表一致(status='open' + pnp_eligible + pnp_stream),不另起一套判定。
// ═══════════════════════════════════════════════════════════════════════════
type QuizFacts = {
  noc: string; teer: number | null; title: string
  titleZh: string
  titleZhShort: string   // 窄位显示名(ETL 04g 产出;「注册护士和注册精神科护士」→「注册护士」)
  titleKoShort: string
  titleEnShort: string   // 官方英文名一个字不动,这是**另一列**,只用于窄位
  open: number; eligible: number; named: number
  streams: { stream: string; n: number }[]
  byProv: { province: string; n: number; eligible: number }[]
  medianSalary: number | null
  sponsors: number      // 发过「能走省提名的岗」的雇主家数(**只给数,不给名单** —— 名单是锁区正文)
}

export async function fetchQuizFacts(pool: any, noc: string): Promise<QuizFacts | null> {
  if (!/^\d{5}$/.test(noc)) return null
  const [tot, prov, stream, desc, spon] = await Promise.all([
    pool.query(
      SQL.QUIZ_FACTS_TOTALS, [noc]),
    pool.query(
      SQL.QUIZ_FACTS_BY_PROV, [noc]),
    pool.query(
      SQL.QUIZ_FACTS_STREAMS, [noc]),
    // 职业名取 NOC 官方名(noc_descriptions),不能拿某个岗位的标题冒充职业名
    pool.query(SQL.NOC_TITLE_ONE, [noc]),
    // 雇主线索的**家数**(M1:把锁区铺到人真正落地的详情页)。
    // WHERE 必须与 reportFacts 的名单口径**逐字一致**:清单式省认具名通道,不公布清单的省(ON)认粗筛可提名 ——
    // 两处对不上,详情页说「有 23 家」、报告里名单却是另一批,用户第一眼就抓到我们数不准(2026-08-01 已撞过一次)。
    pool.query(
      SQL.NOC_EMPLOYER_COUNT,
      [noc, [...NO_LIST_PROVINCES]]).catch(() => ({ rows: [] })),
  ])
  const t = tot.rows[0] || {}
  if (!t.open) return null
  const d = desc.rows[0] || {}
  return {
    noc, teer: num(t.teer), title: d.title || noc, titleZh: d.title_zh || '', titleZhShort: d.title_zh_short || '',
    titleKoShort: d.title_ko_short || '', titleEnShort: d.title_en_short || '',
    open: t.open, eligible: t.eligible ?? 0, named: t.named ?? 0,
    streams: stream.rows.map((r: any) => ({ stream: r.stream, n: r.n })),
    byProv: prov.rows.map((r: any) => ({ province: r.province, n: r.n, eligible: r.eligible })),
    medianSalary: num(t.med),
    sponsors: Number(spon.rows[0]?.n ?? 0),
  }
}

/**
 * 入口三问第 2 题的热门职业在招数(Frank 2026-07-26「这个弹框看着还是太单薄了」)。
 * 光铺职业名的按钮既没信息也没说服力;挂上「在招 / 其中可提名」两个真数才是这个站的本事。
 * 一条 GROUP BY 出全部,不逐个查(懒查规矩是针对公司级数据,这里是聚合数)。
 */
export async function fetchNocOpenCounts(pool: any, nocs: string[]): Promise<Record<string, { open: number; eligible: number }>> {
  const list = nocs.filter((n) => /^\d{5}$/.test(n))
  if (!list.length) return {}
  const { rows } = await pool.query(
    SQL.NOC_OPEN_COUNTS, [list])
  const out: Record<string, { open: number; eligible: number }> = {}
  for (const r of rows) out[r.noc] = { open: r.n, eligible: r.eligible }
  return out
}

/**
 * 入口三问第 2 题的**热门职业清单**(Frank 2026-07-26「还能加一些常规热门的职业吗」「列表可以列得全一些」)。
 * 不手写清单 —— 按**库里在招量**取前 N,自己会随市场变;顺带回中英职业名与可提名数,前端不必二次查。
 * 只收 noc_descriptions 里有官方职业名的(没名字的码显示出来等于黑话)。
 */
export async function fetchTopNocs(pool: any, limit = 24): Promise<{ noc: string; title: string; titleZh: string; titleZhShort: string; titleKoShort: string; titleEnShort: string; broad: string; open: number; eligible: number; medianSalary: number | null }[]> {
  const n = Math.min(Math.max(limit, 1), 200)
  // 主路:读 ETL 聚合好的 noc_openings(2026-08-12 Frank「把这个数据现在数据库里聚合好」)——
  // 一次索引扫描,不再 GROUP BY、更不再 percentile_cont(旧实现带中位数的 200 行实测 3.2s,
  // 慢到只能靠缓存兜 + 前端分两次拉,用户看到的就是「一点一点刷出来」)。口径见 docs/sql/noc-openings.sql。
  const hit = await pool.query(
    SQL.BROAD_NOCS, [n],
  ).catch(() => null)
  if (hit?.rows?.length) {
    return hit.rows.map((r: any) => ({
      noc: r.noc, title: r.title ?? '', titleZh: r.title_zh ?? '', titleZhShort: r.title_zh_short ?? '',
      titleKoShort: r.title_ko_short ?? '', titleEnShort: r.title_en_short ?? '', broad: r.broad ?? '',
      open: r.open, eligible: r.eligible, medianSalary: num(r.median_salary),
    }))
  }
  // 回退:表还没建/还没灌(DDL 与部署有先后)→ 走老的现算,慢但不瞎。
  // 大清单(按大类浏览)不要中位薪资:percentile_cont 是这条查询的大头,控件里也用不到那个数。
  const withMed = n <= 24
  const { rows } = await pool.query(
    SQL.searchNocByTitle(withMed ? ', percentile_cont(0.5) WITHIN GROUP (ORDER BY j.salary_annual) med' : ''), [n])
  return rows.map((r: any) => ({ noc: r.noc, title: r.title, titleZh: r.title_zh, titleZhShort: r.title_zh_short, titleKoShort: r.title_ko_short, titleEnShort: r.title_en_short, broad: r.broad, open: r.open, eligible: r.eligible, medianSalary: num(r.med) }))
}

/** 选职业按大类浏览：只在用户点中某类后查该类，避免打开问卷就扫描完整 top=200。 */
export async function fetchBroadNocs(pool: any, broad: string, limit = 60): Promise<{ noc: string; title: string; titleZh: string; titleZhShort: string; titleKoShort: string; titleEnShort: string; broad: string; open: number; eligible: number }[]> {
  const n = Math.min(Math.max(limit, 1), 80)
  const { rows } = await pool.query(
    SQL.NOC_SEARCH_FALLBACK, [broad, n])
  return rows.map((r: any) => ({ noc: r.noc, title: r.title, titleZh: r.title_zh, titleZhShort: r.title_zh_short, titleKoShort: r.title_ko_short, titleEnShort: r.title_en_short, broad: r.broad, open: r.open, eligible: r.eligible }))
}

/** 入口三问第 2 题的职业搜索:按中/英职业名模糊找 NOC(noc_descriptions 维度表,≤8 条) */
export async function searchNocByTitle(pool: any, q: string): Promise<{ noc: string; title: string; titleZh: string; titleZhShort: string; titleKoShort: string; titleEnShort: string }[]> {
  const s = q.trim()
  if (s.length < 2) return []
  const { rows } = await pool.query(
    SQL.NOC_BY_TITLE_LIKE, [`%${s}%`])
  return rows.map((r: any) => ({ noc: r.noc, title: r.title, titleZh: r.title_zh, titleZhShort: r.title_zh_short, titleKoShort: r.title_ko_short, titleEnShort: r.title_en_short }))
}
