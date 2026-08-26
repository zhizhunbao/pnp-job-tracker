/**
 * 雇主域的行为:板取数与筛选、担保聚合、对照聚合、单公司背调、职业目录。
 * 🔴 本文件**不 import payload**(宪法:取数函数收一个能 query 的东西当参数,池由调用方注进来)——
 * 边缘入口(`loadEmployerPage` / `loadSponsorEmployers` / `compareEmployers` / `companyRow` /
 * `investigateCompany` / `loadOccupations` / `employersBoardProps`)收 `db`,内部纯函数吃数据。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

import { firstOf, queryRows, queryRowsOrEmpty, SQL, count, numOrNull, text, textOrNull } from '../db'
import type { Db } from '../db'
import { ERR_NAME, fail } from '../error'
import { hasProfile, match } from '../jobs'
import type { MatchJob } from '../jobs'
import { friendChat } from '../llm'
import { EMP_LOG, log } from '../log'
import {
  ALIAS_NONE, BRIEF_MAX, BRIEF_MIN, BRIEF_V2_MARK, CACHE_TTL_MS, CAP_MODE, CAP_NOC, CAP_PAGE, CAP_PROGRAM, CAP_PROV,
  CAP_TEXT, CMP_MAX, COL_PREFIX, CSV_BOM, CSV_EMPTY, CSV_HEAD, CSV_NL, CSV_QUOTE, CSV_QUOTE_ESC, CSV_QUOTE_G_RE,
  CSV_QUOTE_RE, CSV_SEP, CSV_YES, DATE8_RE, DATE_LEN, DIGIT_RE, EMP_PROGRAMS, EMP_SSR_ROWS, ENWIKI_BASE, FACT_COLS,
  FETCHED_NONE, FILTER_UNSET, FORMAT_JSON, FORMAT_KEY, HTTP_URL_RE, JOIN_COMMA, LEVEL, LMIA_QUARTER_NONE, MODE,
  NOC_RE, NOC_SPLIT_RE, NOC_TITLES_MAX, NOT_FOUND_RE, PAGE_MAX, PARAM, PIPE, PROVINCE_NONE, PROV_RE, PUNCT_RE,
  RESEARCH_TIMEOUT_MS, SITE_LINE_DROP, SITE_LINE_RE, SITE_PICK_RE, SORT_SKILLED, SPACE, SPACES_RE, SPACE_GLOBAL_RE,
  SQL_FRAG_NONE, SUFFIX_RE, UNDERSCORE, URL_QS, VERDICT_ORDER, VIEW, WD_ACTION_ENTITIES, WD_ACTION_SEARCH, WD_API,
  WD_LANGS, WD_LANG_EN, WD_LANG_KO, WD_LANG_ZH, WD_LANG_ZH_CN, WD_LANG_ZH_HANS, WD_LIMIT, WD_PROPS, WD_SITE_EN,
  WD_TIMEOUT_MS, WD_TYPE_ITEM, WD_UA, WEBSITE_NONE
} from './constants'
import { RESEARCH_PROMPT_HEAD, RESEARCH_PROMPT_TAIL, RESEARCH_SEARCH_TAIL, RESEARCH_SYSTEM } from './prompts'
import { CACHE } from './variables'
import type {
  ApplyEmployerFiltersIn, ApplySponsorFiltersIn, BoardPropsIn, BoardPropsOut, ClipIn, CompanyAggIn,
  CompanyBriefDbRow, CompanyBriefIn, CompanyResearch, CompanyRowIn, CompanyRowOut, CompareAgg, CompareCompanyDbRow,
  CompareIn, CompareOut, CompareRow, DesignatedRowsOut, EmployerFacets, EmployerFacetsIn, EmployerFilters,
  EmployerMode, EmployerPage, EmployerRow, EmployerRows, EmptyPageIn, EntityNameHitsIn, InvestigateIn,
  InvestigateOut, LoadEmployerPageIn, LoadEmployerPageOut, MaybeNum, MaybeStrOut, MaybeTeer, NocMatchesIn,
  NocTitleMap, NocTitlesIn, NocTitlesOut, NormalizeFiltersIn, OccRowsOut, PageSliceIn, ParamGetter, ProgramMatchesIn,
  ProvTally, RankedSponsor, SearchParams, SponsorBoardData, SponsorBoards, SponsorEmployerRow, SponsorRows,
  SponsorRowsOut, StrList, WdEntity, WdGetIn, WdGetOut, WikidataHitOrNull, WikidataOut, ColumnDbRow, CompareJob,
  CompareJobDbRow, DesignatedDbRow, DesignatedRow, DifficultyDbRow, DifficultyObj, DifficultyPair, EmployerFacts,
  HiringDbRow, HiringRow, IdCell, MaybeStr, NocTitleDbRow, NocTitlePair, OccDbRow, OccRow, ReqDbRow, ReqRow,
  SponsorDbRow, StrListCell, ToCompareRowIn, ToSponsorRowIn, SponsorsIn,
} from './types'
import { HDR_USER_AGENT } from '../http'
// =========================================================================
// 1. 雇主板:筛选口径(纯函数,int 测试直打这里)
// =========================================================================

/**
 * URL 参数 → 规范化筛选(SSR 与 API 共用一份,避免两端口径漂移)。
 * 不合法的值一律落空/落默认,不瞎猜。
 *
 * @param input 参数取值器与默认口径。
 * @returns 规范化后的筛选。
 */
export function normalizeEmployerFilters(input: NormalizeFiltersIn): EmployerFilters {
  const modeRaw = clip({ value: input.get(PARAM.mode), max: CAP_MODE })
  const program = clip({ value: input.get(PARAM.program), max: CAP_PROGRAM }).toUpperCase()
  const prov = clip({ value: input.get(PARAM.prov), max: CAP_PROV }).toUpperCase()
  const noc = clip({ value: input.get(PARAM.noc), max: CAP_NOC })
  const page = Number(clip({ value: input.get(PARAM.page), max: CAP_PAGE }))
  let mode: EmployerMode = input.defMode
  if (modeRaw === MODE.hiring || modeRaw === MODE.designated) {
    mode = modeRaw
  }
  let cleanProgram = FILTER_UNSET
  if ((EMP_PROGRAMS as readonly string[]).includes(program)) {
    cleanProgram = program
  }
  let cleanProv = FILTER_UNSET
  if (PROV_RE.test(prov)) {
    cleanProv = prov
  }
  let cleanNoc = FILTER_UNSET
  if (NOC_RE.test(noc)) {
    cleanNoc = noc
  }
  let cleanPage = 0
  if (Number.isFinite(page) && page > 0) {
    cleanPage = Math.min(Math.floor(page), PAGE_MAX)
  }
  return {
    mode: mode, program: cleanProgram, prov: cleanProv,
    city: clip({ value: input.get(PARAM.city), max: CAP_TEXT }),
    noc: cleanNoc,
    q: clip({ value: input.get(PARAM.q), max: CAP_TEXT }),
    page: cleanPage,
  }
}

/**
 * 一格 URL 参数收窄成定长干净串(参数缺席收成空串)。
 *
 * @param input 原始值与上限。
 * @returns 干净串。
 */
function clip(input: ClipIn): string {
  if (input.value == null) {
    return FILTER_UNSET
  }
  return input.value.trim().slice(0, input.max)
}

/**
 * 按筛选过滤板上行(designated 口径;hiring 口径的职业筛在入口 noc 本身)。
 *
 * @param input 全量行与筛选。
 * @returns 命中的行。
 */
export function applyEmployerFilters(input: ApplyEmployerFiltersIn): EmployerRows {
  const f = input.filters
  const q = f.q.trim().toLowerCase()
  const out: EmployerRow[] = []
  for (const r of input.rows) {
    if (programMatches({ rowProgram: r.program, program: f.program }) === false) {
      continue
    }
    if (f.prov !== '' && r.province !== f.prov) {
      continue
    }
    if (f.city !== '' && r.where !== f.city) {
      continue
    }
    if (nocMatches({ rowNocs: r.nocs, noc: f.noc }) === false) {
      continue
    }
    if (q !== '' && r.name.toLowerCase().includes(q) === false) {
      continue
    }
    out.push(r)
  }
  return out
}

/**
 * 职业匹配口径(**本域最要紧的一条**):名录**没写**职业的行,选了 NOC 时照常保留。
 * 空 nocs = 官方名录这一行没列职业清单(RCIP/FCIP 绝大多数如此),不是「该雇主不招这个职业」——
 * 当成不匹配剔掉 = 拿我们的数据缺口冒充官方的排除,用户会错过大半个名录。
 *
 * @param input 行的职业码与选中的职业码。
 * @returns 是否保留。
 */
export function nocMatches(input: NocMatchesIn): boolean {
  if (input.noc === '') {
    return true
  }
  if (input.rowNocs.length === 0) {
    return true
  }
  return input.rowNocs.includes(input.noc)
}

/**
 * 制度匹配:用**子串** —— 'RCIP+FCIP' 的双标社区对 RCIP 与 FCIP 两个筛选都算数。
 *
 * @param input 行的制度值与选中的制度。
 * @returns 是否保留。
 */
export function programMatches(input: ProgramMatchesIn): boolean {
  if (input.program === '') {
    return true
  }
  return input.rowProgram.includes(input.program)
}

/**
 * 下拉选项:省/制度看整份数据(切了省也不能把省下拉自己清空),
 * 社区/职业看**已按省+制度收窄后**的数据(否则 NB 的社区会出现在 SK 的下拉里)。
 *
 * @param input 全量行与当前筛选。
 * @returns 四个下拉的选项。
 */
export function employerFacets(input: EmployerFacetsIn): EmployerFacets {
  const f = input.filters
  const provs = new Set<string>()
  const programs = new Set<string>()
  const cities = new Set<string>()
  const nocs = new Set<string>()
  for (const r of input.rows) {
    if (r.province !== '') {
      provs.add(r.province)
    }
    for (const p of EMP_PROGRAMS) {
      if (r.program.includes(p)) {
        programs.add(p)
      }
    }
    if (programMatches({ rowProgram: r.program, program: f.program }) === false) {
      continue
    }
    if (f.prov !== '' && r.province !== f.prov) {
      continue
    }
    if (r.where !== '') {
      cities.add(r.where)
    }
    for (const n of r.nocs) {
      nocs.add(n)
    }
  }
  const orderedPrograms: string[] = []
  for (const p of EMP_PROGRAMS) {
    if (programs.has(p)) {
      orderedPrograms.push(p)
    }
  }
  return {
    provs: Array.from(provs).sort(),
    programs: orderedPrograms,
    cities: Array.from(cities).sort(),
    nocs: Array.from(nocs).sort(),
  }
}

/**
 * 内存分页切片(#313:一次只吐一页)。
 *
 * @param input 筛后全量行、页码与页大小。
 * @returns 该页的行。
 */
export function pageSlice(input: PageSliceIn): EmployerRows {
  const p = Math.max(0, input.page)
  return input.rows.slice(p * input.size, (p + 1) * input.size)
}

// =========================================================================
// 2. 雇主板:取数边缘(db 只在这里)
// =========================================================================

/**
 * 雇主板 SSR 首屏(两个入口路由共用一份;口径由**路径段**定,不由 query 改写 ——
 * 入口契约:/employers/designated?program=…&prov=… 与 /employers/hiring?prov=…&noc=… 必须直达且预置筛选)。
 *
 * @param input searchParams、口径与连接。
 * @returns 第一页 + 预置筛选。
 */
export async function employersBoardProps(input: BoardPropsIn): BoardPropsOut {
  const filters = normalizeEmployerFilters({ get: getterOf(input.sp), defMode: input.mode })
  filters.mode = input.mode
  const initial = await loadEmployerPage({ db: input.db, filters: filters, pageSize: EMP_SSR_ROWS })
  return { initial: initial, initialFilters: filters }
}

/**
 * 雇主板一页(SSR 与 /api/employers 共用)。
 * hiring 口径:省+职业**两个都得有**才查 —— 少一个就是全省 GROUP BY 全表,那是站级聚合,禁每请求现算。
 *
 * @param input 连接、筛选与页大小。
 * @returns 一页数据;挂了回空表并留痕。
 */
export async function loadEmployerPage(input: LoadEmployerPageIn): LoadEmployerPageOut {
  const f = input.filters
  if (input.db == null) {
    return emptyEmployerPage({ filters: f, pageSize: input.pageSize })
  }
  const db = input.db
  try {
    if (f.mode === MODE.hiring) {
      let raw: EmployerRows = []
      if (PROV_RE.test(f.prov) && NOC_RE.test(f.noc)) {
        const hiring = await queryRowsOrEmpty({ db: db, sql: SQL.HIRING_EMPLOYERS, params: [f.prov, f.noc], map: toHiringRow })
        raw = hiring.map(hiringToEmployerRow)
      }
      const q = f.q.trim().toLowerCase()
      const hit: EmployerRow[] = []
      for (const r of raw) {
        if (f.city !== '' && r.where !== f.city) {
          continue
        }
        if (q !== '' && r.name.toLowerCase().includes(q) === false) {
          continue
        }
        hit.push(r)
      }
      let facetProvs: string[] = []
      if (f.prov !== '') {
        facetProvs = [f.prov]
      }
      let facetNocs: string[] = []
      let titleCodes: string[] = []
      if (f.noc !== '') {
        facetNocs = [f.noc]
        titleCodes = [f.noc]
      }
      const cities = new Set<string>()
      for (const r of raw) {
        if (r.where !== '') {
          cities.add(r.where)
        }
      }
      return {
        mode: MODE.hiring, rows: pageSlice({ rows: hit, page: f.page, size: input.pageSize }),
        total: hit.length, page: f.page, pageSize: input.pageSize,
        facets: { provs: facetProvs, programs: [], cities: Array.from(cities).sort(), nocs: facetNocs },
        fetched: FETCHED_NONE, nocTitles: await nocTitlesOf({ db: db, codes: titleCodes }),
      }
    }
    const raw = await fetchAllDesignated(db)
    const all = raw.map(toEmployerRow)
    const facets = employerFacets({ rows: all, filters: f })
    const hit = applyEmployerFilters({ rows: all, filters: f })
    let fetched = FETCHED_NONE
    for (const r of raw) {
      if (r.fetched !== '') {
        fetched = r.fetched
        break
      }
    }
    return {
      mode: MODE.designated, rows: pageSlice({ rows: hit, page: f.page, size: input.pageSize }),
      total: hit.length, page: f.page, pageSize: input.pageSize,
      facets: facets, fetched: fetched, nocTitles: await nocTitlesOf({ db: db, codes: facets.nocs }),
    }
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: EMP_LOG.tag, text: `${EMP_LOG.pageQueryFailed}${why}` })
    return emptyEmployerPage({ filters: f, pageSize: input.pageSize })
  }
}

/**
 * 指定雇主名录整表(6,680 行 × 7 短字段)带 TTL 缓存取数。
 * 过期先回旧值、后台单飞刷新,只有冷启动第一请求真等(改 `CACHE.designated` / `CACHE.designatedInflight`)。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 名录整表。
 */
function fetchAllDesignated(db: Db): DesignatedRowsOut {
  const hot = CACHE.designated
  if (hot != null && Date.now() - hot.at < CACHE_TTL_MS) {
    return Promise.resolve(hot.rows)
  }
  if (CACHE.designatedInflight == null) {
    CACHE.designatedInflight = queryRowsOrEmpty({ db: db, sql: SQL.DESIGNATED_ALL, params: [], map: toDesignatedRow })
      .then(function remember(rows) {
        CACHE.designated = { at: Date.now(), rows: rows }
        return rows
      })
      .finally(function clearInflight() {
        CACHE.designatedInflight = null
      })
  }
  if (hot != null) {
    return Promise.resolve(hot.rows)
  }
  return CACHE.designatedInflight
}

/**
 * 职业人话名(站规:代码不裸奔)。查不到的码不进映射,展示层原样显示 5 位码。
 *
 * @param input 能打 SQL 的东西与要查的码。
 * @returns 码 → 三语名。
 */
async function nocTitlesOf(input: NocTitlesIn): NocTitlesOut {
  const list: string[] = []
  for (const c of input.codes) {
    if (NOC_RE.test(c)) {
      list.push(c)
    }
  }
  const capped = list.slice(0, NOC_TITLES_MAX)
  if (capped.length === 0) {
    return {}
  }
  const pairs = await queryRowsOrEmpty({ db: input.db, sql: SQL.NOC_TITLES_FOR_EMPLOYERS, params: [capped], map: toNocTitlePair })
  const out: NocTitleMap = {}
  for (const p of pairs) {
    if (p.noc !== '') {
      out[p.noc] = p.title
    }
  }
  return out
}

/**
 * 空的一页(池没拿到 / 查挂了都回它,绝不 500 —— 前端保底继续用 SSR 那一页)。
 *
 * @param input 当前筛选与页大小。
 * @returns 空表。
 */
function emptyEmployerPage(input: EmptyPageIn): EmployerPage {
  return {
    mode: input.filters.mode, rows: [], total: 0, page: input.filters.page, pageSize: input.pageSize,
    facets: { provs: [], programs: [], cities: [], nocs: [] }, fetched: FETCHED_NONE, nocTitles: {},
  }
}

/**
 * Next 的 searchParams(值可能是数组)收敛成本域的取值器(数组取第一个,缺席收成 null)。
 *
 * @param sp 页面收到的 searchParams。
 * @returns 取值器。
 */
function getterOf(sp: SearchParams): ParamGetter {
  return function get(k: string): string | null {
    const v = sp[k]
    if (v == null) {
      return null
    }
    if (Array.isArray(v)) {
      const v0 = v[0]
      if (v0 == null) {
        return null
      }
      return v0
    }
    return v
  }
}

// =========================================================================
// 3. 在招担保雇主(B2/B4)
// =========================================================================

/**
 * 在招担保雇主整表带 TTL 缓存取数(策略同名录:过期先回旧值、后台单飞刷新;
 * 改 `CACHE.sponsors` / `CACHE.sponsorsInflight`)。
 *
 * @param input 连接与注入的雇主判定引擎(2026-08-23 收牌批)。
 * @returns 全量担保行(缓存行全站共享,消费端不许原地改)。
 */
export function loadSponsorEmployers(input: SponsorsIn): SponsorRowsOut {
  const db = input.db
  const hot = CACHE.sponsors
  if (hot != null && Date.now() - hot.at < CACHE_TTL_MS) {
    return Promise.resolve(hot.rows)
  }
  if (CACHE.sponsorsInflight == null) {
    CACHE.sponsorsInflight = loadSponsors({ db: db, judge: input.judge })
      .then(function remember(rows) {
        CACHE.sponsors = { at: Date.now(), rows: rows }
        return rows
      })
      .finally(function clearInflight() {
        CACHE.sponsorsInflight = null
      })
  }
  if (hot != null) {
    return Promise.resolve(hot.rows)
  }
  return CACHE.sponsorsInflight
}

/**
 * 在招担保雇主全量聚合(边缘的取数实现):探列 → 聚合 SQL + 雇主侧门槛并发 → 逐行判定并收窄。
 * 门槛省 = provs[0](表行没有单一地址,与既有 where 列同一取法)。
 *
 * @param input 连接与注入的雇主判定引擎(2026-08-23 收牌批)。
 * @returns 全量担保行。
 */
async function loadSponsors(input: SponsorsIn): SponsorRowsOut {
  const db = input.db
  const probed = await queryRowsOrEmpty({ db: db, sql: SQL.COMPANIES_HAS_COLUMNS, params: [Array.from(FACT_COLS)], map: toColumnName })
  const cols: string[] = []
  for (const c of probed) {
    if (c !== '') {
      cols.push(c)
    }
  }
  const frag = factColsFragment(cols)
  const [raw, reqs] = await Promise.all([
    queryRowsOrEmpty({ db: db, sql: SQL.sponsorEmployers(frag, frag), map: passSponsorRow, params: [] }),
    queryRowsOrEmpty({ db: db, sql: SQL.PNP_REQ_EMPLOYER, params: [], map: toEmployerReq }),
  ])
  const nowYear = new Date().getFullYear()
  const out: SponsorEmployerRow[] = []
  for (const r of raw) {
    let province = PROVINCE_NONE
    if (r.provs != null && r.provs.length > 0 && r.provs[0] != null) {
      province = r.provs[0]
    }
    const verdict = input.judge({
      facts: toEmployerFacts(r), province: province, reqs: reqs, nowYear: nowYear,
    })
    out.push(toSponsorRow({ row: r, verdict: verdict }))
  }
  return out
}

/**
 * 拼 B4 探测列的 SELECT/GROUP BY 片段(`c.` 前缀逗号串;一列没探到就是空串,SQL 退回原样)。
 *
 * @param cols 探到的列名。
 * @returns SQL 片段。
 */
function factColsFragment(cols: StrList): string {
  if (cols.length === 0) {
    return SQL_FRAG_NONE
  }
  const parts: string[] = []
  for (const c of cols) {
    parts.push(COL_PREFIX + c)
  }
  return JOIN_COMMA + parts.join(JOIN_COMMA)
}

/**
 * 把脉页橱窗三分表(#313;SSR 切前 SE_SSR_ROWS 行与 API 全量共用)。
 * 缓存行全站共享:三个板各自产新数组新对象,均不动缓存。
 *
 * @param rows 缓存全量行。
 * @returns 三分表。
 */
export function buildSponsorBoards(rows: SponsorRows): SponsorBoards {
  return { lmia: lmiaBoard(rows), named: namedBoard(rows), aip: aipBoard(rows) }
}

/**
 * AIP 表:指定雇主行,保持聚合序。
 *
 * @param rows 缓存全量行。
 * @returns 该表数据。
 */
function aipBoard(rows: SponsorRows): SponsorBoardData {
  const hit: SponsorEmployerRow[] = []
  for (const r of rows) {
    if (r.aip === true) {
      hit.push(r)
    }
  }
  return { top: hit.map(toSlimSponsorRow), total: hit.length }
}

/**
 * named 表:具名省清单命中的行,按 #285 三灯默认序(派生序先算好挂上,比较器只读)。
 *
 * @param rows 缓存全量行。
 * @returns 该表数据。
 */
function namedBoard(rows: SponsorRows): SponsorBoardData {
  const ranked: RankedSponsor[] = []
  for (const r of rows) {
    if (r.named === false) {
      continue
    }
    let rec = 0
    if (r.lmiaPositions > 0 || r.aip === true) {
      rec = 1
    }
    let rank = 1
    const orderHit = VERDICT_ORDER[r.verdict.state]
    if (orderHit != null) {
      rank = orderHit
    }
    ranked.push({ row: r, rank: rank, rec: rec })
  }
  ranked.sort(byNamedRank)
  const top: SponsorEmployerRow[] = []
  for (const x of ranked) {
    top.push(toSlimSponsorRow(x.row))
  }
  return { top: top, total: ranked.length }
}

/**
 * LMIA 表:有获批记录的行,按新近度排序,瘦身切装。
 *
 * @param rows 缓存全量行。
 * @returns 该表数据。
 */
function lmiaBoard(rows: SponsorRows): SponsorBoardData {
  const hit: SponsorEmployerRow[] = []
  for (const r of rows) {
    if (r.lmiaPositions > 0) {
      hit.push(r)
    }
  }
  hit.sort(byLmiaRecency)
  return { top: hit.map(toSlimSponsorRow), total: hit.length }
}

/**
 * 进程内筛选+排序(全量,B3 导出与页面共用;缓存行是共享的,绝不原地排序 —— 先浅拷贝)。
 *
 * @param input 缓存全量行与筛选。
 * @returns 命中的行(要排序时是新数组)。
 */
export function applySponsorFilters(input: ApplySponsorFiltersIn): SponsorRows {
  const f = input.filters
  const q = f.q.trim().toLowerCase()
  const hit: SponsorEmployerRow[] = []
  for (const r of input.rows) {
    if (f.f === VIEW.aip && r.aip === false) {
      continue
    }
    if (f.f === VIEW.lmia && r.lmiaPositions <= 0) {
      continue
    }
    if (f.f === VIEW.named && r.named === false) {
      continue
    }
    if (f.prov !== '' && r.provs.includes(f.prov) === false) {
      continue
    }
    if (f.city !== '' && r.cities.includes(f.city) === false) {
      continue
    }
    if (f.noc !== '' && r.nocs.includes(f.noc) === false) {
      continue
    }
    if (q !== '' && r.name.toLowerCase().includes(q) === false) {
      continue
    }
    hit.push(r)
  }
  if (f.sort === SORT_SKILLED) {
    const copy = hit.slice()
    copy.sort(bySkilledDesc)
    return copy
  }
  return hit
}

// =========================================================================
// 4. 多雇主对照(D3 / E5-06)
// =========================================================================

/**
 * 多雇主对照聚合。零新抓取:companies + jobs 聚合 + stats.difficulty(E12-07)+ lib/jobs/match。
 * Pro gate 在页面层(免费不调本函数);红线:摆事实不下结论、LMIA=历史事实≠担保(措辞在 i18n)。
 *
 * @param input 连接、雇主名、已归一档案与匹配维度。
 * @returns 对照行(不在库的名字直接跳过 —— 入口只来自库内行,正常不会发生)。
 */
export async function compareEmployers(input: CompareIn): CompareOut {
  const seen = new Set<string>()
  const clean: string[] = []
  for (const n of input.names) {
    const t = n.trim()
    if (t !== '' && seen.has(t) === false) {
      seen.add(t)
      clean.push(t)
    }
  }
  const capped = clean.slice(0, CMP_MAX)
  if (capped.length < 2) {
    return []
  }
  const lower: string[] = []
  for (const n of capped) {
    lower.push(n.toLowerCase())
  }
  const cos = await queryRows({ db: input.db, sql: SQL.COMPANIES_FOR_COMPARE, params: [lower], map: passCompareCompany })
  const out: CompareRow[] = []
  for (const name of capped) {
    let company: CompareCompanyDbRow | null = null
    for (const c of cos) {
      if (c.name != null && c.name.toLowerCase() === name.toLowerCase()) {
        company = c
        break
      }
    }
    if (company == null) {
      continue
    }
    const jobs = await queryRows({ db: input.db, sql: SQL.COMPANY_JOBS_FOR_COMPARE, params: [toCompanyId(company)], map: toCompareJob })
    out.push(toCompareRow({ company: company, agg: companyAggOf({ jobs: jobs, profile: input.profile, dims: input.dims }) }))
  }
  const provSet = new Set<string>()
  for (const r of out) {
    if (r.mainProvince !== '') {
      provSet.add(r.mainProvince)
    }
  }
  if (provSet.size > 0) {
    const pairs = await queryRowsOrEmpty({ db: input.db, sql: SQL.PROV_DIFFICULTY_ANY, params: [Array.from(provSet)], map: toDifficultyPair })
    for (const r of out) {
      for (const p of pairs) {
        if (p.province === r.mainProvince) {
          r.diffTier = p.tier
          break
        }
      }
    }
  }
  return out
}

/**
 * 一家公司的岗位聚合:省分布 → 主要省,分数均值、年薪中位、具名/AIP 计数、与我的匹配。
 *
 * @param input 该公司的岗、档案与维度表。
 * @returns 聚合。
 */
function companyAggOf(input: CompanyAggIn): CompareAgg {
  const provCount: Record<string, number> = {}
  let named = 0
  let aip = false
  const scores: number[] = []
  const sals: number[] = []
  let high = 0
  let mid = 0
  let withMatch = false
  if (input.dims != null && input.profile != null && hasProfile(input.profile)) {
    withMatch = true
  }
  for (const j of input.jobs) {
    if (j.province !== '') {
      let cur = 0
      const seen = provCount[j.province]
      if (seen != null) {
        cur = seen
      }
      provCount[j.province] = cur + 1
    }
    if (j.pnpStream !== '') {
      named += 1
    }
    if (j.aip === true) {
      aip = true
    }
    if (j.score != null) {
      scores.push(j.score)
    }
    if (j.salaryAnnual != null) {
      sals.push(j.salaryAnnual)
    }
    if (withMatch && input.dims != null && input.profile != null) {
      const mj: MatchJob = {
        noc: j.noc, teer: teerOf(j.noc), province: j.province, pnpEligible: j.pnpEligible,
        pnpStream: j.pnpStream, eeCategory: j.eeCategory, salaryAnnual: j.salaryAnnual,
        wageMedAnnual: j.wageMedAnnual, lmiaPositions: null, lmiaLastQuarter: LMIA_QUARTER_NONE, lmiaPositionsSkilled: null,
      }
      const m = match({ profile: input.profile, job: mj, dims: input.dims })
      if (m.level === LEVEL.high) {
        high += 1
      } else if (m.level === LEVEL.mid) {
        mid += 1
      }
    }
  }
  const mainProvince = mainProvinceOf(provCount)
  sals.sort(byNumAsc)
  let avgScore: number | null = null
  if (scores.length > 0) {
    let sum = 0
    for (const s of scores) {
      sum += s
    }
    avgScore = Math.round(sum / scores.length)
  }
  let medSalary: number | null = null
  const salMid = sals[Math.floor(sals.length / 2)]
  if (salMid != null) {
    medSalary = Math.round(salMid)
  }
  let matchHigh: number | null = null
  let matchMid: number | null = null
  if (withMatch) {
    matchHigh = high
    matchMid = mid
  }
  return {
    aip: aip, openJobs: input.jobs.length, avgScore: avgScore, namedJobs: named,
    medSalary: medSalary, mainProvince: mainProvince, matchHigh: matchHigh, matchMid: matchMid,
  }
}

/**
 * 计数表里岗数最多的省(平手取先到者 —— 与旧实现的 sort 首位一致)。
 *
 * @param tally 省码 → 岗数。
 * @returns 主要省;空表则空串。
 */
function mainProvinceOf(tally: ProvTally): string {
  let mainProvince = PROVINCE_NONE
  let best = 0
  for (const [prov, n] of Object.entries(tally)) {
    if (n > best) {
      best = n
      mainProvince = prov
    }
  }
  return mainProvince
}

/**
 * 5 位码第二位当 TEER;不是像样的码则 null,不瞎猜。
 *
 * @param noc 职业码。
 * @returns TEER。
 */
function teerOf(noc: string): MaybeTeer {
  const d = noc[1]
  if (noc.length === 5 && d != null && DIGIT_RE.test(d)) {
    return Number(d)
  }
  return null
}

// =========================================================================
// 5. 单公司背调(#107 K 懒探索)
// =========================================================================

/**
 * 按公司名取缓存行;不在 companies 的雇主(Job Bank 大量)懒建最小行给缓存落脚,source 标 ai-lazy。
 * 旧版缓存懒升级(2026-07-21 五节改版):三节/散文格式的存量 brief 视为过期 → 当没缓存,
 * 下次打开这家公司自动重查一次(一家一次,lazy-first 不批量重跑)。
 *
 * @param input 连接与公司名。
 * @returns 主键与缓存;懒建失败则 null。
 */
export async function companyRow(input: CompanyRowIn): CompanyRowOut {
  const rows = await queryRows({ db: input.db, sql: SQL.COMPANY_AI_BRIEF, params: [input.name], map: passCompanyBrief })
  let row = firstOf(rows)
  if (row == null) {
    try {
      const ins = await queryRows({ db: input.db, sql: SQL.COMPANY_INSERT_LAZY, params: [input.name], map: passCompanyBrief })
      const insFirst = firstOf(ins)
      if (insFirst == null) {
        return null
      }
      row = { id: insFirst.id, ai_brief: null, ai_website: null, ai_sources: null, ai_fetched: null }
    } catch (e) {
      let why = String(e)
      if (e instanceof Error) {
        why = e.message
      }
      log({ tag: EMP_LOG.tag, text: `${EMP_LOG.lazyInsertFailed}${why}` })
      return null
    }
  }
  let cached: CompanyResearch | null = null
  if (row.ai_brief != null && row.ai_brief.includes(BRIEF_V2_MARK)) {
    let sources: string[] = []
    if (row.ai_sources != null && row.ai_sources !== '') {
      try {
        sources = JSON.parse(row.ai_sources)
      } catch {
        log({ tag: EMP_LOG.tag, text: `${EMP_LOG.sourcesParseFailed}${input.name}` })
      }
    }
    let website = WEBSITE_NONE
    if (row.ai_website != null) {
      website = row.ai_website
    }
    let fetched = FETCHED_NONE
    if (row.ai_fetched != null) {
      fetched = String(row.ai_fetched).slice(0, DATE_LEN)
    }
    cached = { brief: row.ai_brief, website: website, sources: sources, fetched: fetched }
  }
  return { id: toCompanyId(row), cached: cached }
}

/**
 * 单公司调查(同名并发合流:一家公司全站只查一次;改 `CACHE.research`)。
 *
 * @param input 连接、主键与公司名。
 * @returns 调查结果;查不到如实回 null(反编)。
 */
export function investigateCompany(input: InvestigateIn): InvestigateOut {
  const hot = CACHE.research.get(input.name)
  if (hot != null) {
    return hot
  }
  const p = investigate(input).finally(function clearInflight() {
    CACHE.research.delete(input.name)
  })
  CACHE.research.set(input.name, p)
  return p
}

/**
 * 真正的调查:联网检索(五节白名单制)+ Wikidata 懒查回填并行。
 * Wikidata 命中回填别名/知名列(COALESCE 不覆盖已有值);没命中/失败不重试 ——
 * 一家公司一生一次,宁缺勿滥(2026-07-20 Frank 拍板批量退役「公司详情全懒」)。
 *
 * @param input 连接、主键与公司名。
 * @returns 调查结果;校验不过如实回 null。
 */
async function investigate(input: InvestigateIn): InvestigateOut {
  const [r, wd] = await Promise.all([
    friendChat({
      prompt: `${RESEARCH_PROMPT_HEAD}${input.name}${RESEARCH_PROMPT_TAIL}`,
      system: RESEARCH_SYSTEM,
      webSearch: true,
      searchQuery: `${input.name}${RESEARCH_SEARCH_TAIL}`,
      timeoutMs: RESEARCH_TIMEOUT_MS,
    }),
    wikidataLookup(input.name),
  ])
  if (wd != null) {
    try {
      let zh: string | null = null
      if (wd.zh !== '') {
        zh = wd.zh
      }
      let ko: string | null = null
      if (wd.ko !== '') {
        ko = wd.ko
      }
      await input.db.query(SQL.COMPANY_UPDATE_ALIASES, [zh, ko, wd.wiki, input.id])
    } catch (e) {
      let why = String(e)
      if (e instanceof Error) {
        why = e.message
      }
      log({ tag: EMP_LOG.tag, text: `${EMP_LOG.aliasWriteFailed}${why}` })
    }
  }
  if (r == null) {
    return null
  }
  const brief = r.answer.replace(SITE_LINE_RE, SITE_LINE_DROP).trim()
  let website = WEBSITE_NONE
  const siteMatch = r.answer.match(SITE_PICK_RE)
  let siteUrl = null
  if (siteMatch != null) {
    const g1 = siteMatch[1]
    if (g1 != null) {
      siteUrl = g1
    }
  }
  if (siteUrl != null && HTTP_URL_RE.test(siteUrl)) {
    website = siteUrl
  }
  if (brief === '' || NOT_FOUND_RE.test(brief) || brief.length < BRIEF_MIN || brief.length > BRIEF_MAX) {
    return null
  }
  let websiteCell: string | null = null
  if (website !== '') {
    websiteCell = website
  }
  await input.db.query(SQL.COMPANY_UPDATE_AI_BRIEF, [brief, websiteCell, JSON.stringify(r.sources), input.id])
  return { brief: brief, website: website, sources: r.sources, fetched: new Date().toISOString().slice(0, DATE_LEN) }
}

/**
 * Wikidata 严格名称匹配(移植批量脚本,批量退役后这是唯一查询点)。门槛与批量版一致:
 * en 标签/别名归一后**全等** + 有英文维基条目才算知名;不机翻,别名只收官方跨语言标签。
 * #279:zh 裸标签常是 zh-TW/zh-HK 繁体 → 优先简体变体,都没有才退 zh(ETL 侧同款取序)。
 *
 * @param name 公司名。
 * @returns 命中;查不到/超时/掉线 null 并留痕(不重试 —— ai_brief 缓存后不会再进 investigate)。
 */
async function wikidataLookup(name: string): WikidataOut {
  const ctrl = new AbortController()
  const timer = setTimeout(function abortWd() {
    ctrl.abort()
  }, WD_TIMEOUT_MS)
  try {
    const searched = await wdGet({
      params: { action: WD_ACTION_SEARCH, search: name, language: WD_LANG_EN, type: WD_TYPE_ITEM, limit: WD_LIMIT },
      signal: ctrl.signal,
    })
    const ids: string[] = []
    if (searched.search != null) {
      for (const h of searched.search) {
        if (h.id != null && h.id !== '') {
          ids.push(h.id)
        }
      }
    }
    if (ids.length === 0) {
      return null
    }
    const got = await wdGet({
      params: { action: WD_ACTION_ENTITIES, ids: ids.join(PIPE), props: WD_PROPS, languages: WD_LANGS },
      signal: ctrl.signal,
    })
    if (got.entities == null) {
      return null
    }
    const target = normCompanyName(name)
    for (const id of ids) {
      const e = got.entities[id]
      if (e == null) {
        continue
      }
      if (entityNameHits({ entity: e, target: target }) === false) {
        continue
      }
      const hit = wikidataHitOf(e)
      if (hit != null) {
        return hit
      }
    }
    return null
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: EMP_LOG.tag, text: `${EMP_LOG.wikidataFailed}${why}` })
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 公司名归一(与 etl/clean/_enrich_company_facts.py 同门槛):小写、标点归空格、去法定后缀、缩空白。
 *
 * @param s 原名。
 * @returns 归一后的名。
 */
function normCompanyName(s: string): string {
  return s.toLowerCase().replace(PUNCT_RE, SPACE).replace(SUFFIX_RE, SPACE).replace(SPACES_RE, SPACE).trim()
}

/**
 * 打一次 Wikidata API(format=json 由这里补;非 2xx 抛给调用方的 catch)。
 *
 * @param input 查询参数与中断句柄。
 * @returns 响应信封。
 */
async function wdGet(input: WdGetIn): WdGetOut {
  const qs = new URLSearchParams(input.params)
  qs.set(FORMAT_KEY, FORMAT_JSON)
  const r = await fetch(WD_API + URL_QS + qs.toString(), {
    signal: input.signal, headers: { [HDR_USER_AGENT]: WD_UA },
  })
  if (r.ok === false) {
    throw fail({ name: ERR_NAME.wikidata, msg: String(r.status), code: null })
  }
  return r.json()
}

/**
 * 实体的 en 标签或任一 en 别名,归一后与目标全等才算命中。
 *
 * @param input 实体与归一后的目标名。
 * @returns 是否命中。
 */
function entityNameHits(input: EntityNameHitsIn): boolean {
  const names: string[] = []
  if (input.entity.labels != null && input.entity.labels[WD_LANG_EN] != null && input.entity.labels[WD_LANG_EN].value != null) {
    names.push(input.entity.labels[WD_LANG_EN].value)
  }
  if (input.entity.aliases != null && input.entity.aliases[WD_LANG_EN] != null) {
    for (const a of input.entity.aliases[WD_LANG_EN]) {
      if (a != null && a.value != null) {
        names.push(a.value)
      }
    }
  }
  for (const x of names) {
    if (x !== '' && normCompanyName(x) === input.target) {
      return true
    }
  }
  return false
}

/**
 * 命中实体 → 回填载荷。无英文维基条目 = 不算知名,别名也不收(与批量版同门槛)。
 *
 * @param e 命中的实体。
 * @returns 回填载荷;不够格则 null。
 */
function wikidataHitOf(e: WdEntity): WikidataHitOrNull {
  if (e.sitelinks == null || e.sitelinks[WD_SITE_EN] == null || e.sitelinks[WD_SITE_EN].title == null) {
    return null
  }
  const title = e.sitelinks[WD_SITE_EN].title
  if (title === '') {
    return null
  }
  let zh = ALIAS_NONE
  if (e.labels != null) {
    if (e.labels[WD_LANG_ZH_CN] != null && e.labels[WD_LANG_ZH_CN].value != null && e.labels[WD_LANG_ZH_CN].value !== '') {
      zh = e.labels[WD_LANG_ZH_CN].value
    } else if (e.labels[WD_LANG_ZH_HANS] != null && e.labels[WD_LANG_ZH_HANS].value != null && e.labels[WD_LANG_ZH_HANS].value !== '') {
      zh = e.labels[WD_LANG_ZH_HANS].value
    } else if (e.labels[WD_LANG_ZH] != null && e.labels[WD_LANG_ZH].value != null && e.labels[WD_LANG_ZH].value !== '') {
      zh = e.labels[WD_LANG_ZH].value
    }
  }
  let ko = ALIAS_NONE
  if (e.labels != null && e.labels[WD_LANG_KO] != null && e.labels[WD_LANG_KO].value != null) {
    ko = e.labels[WD_LANG_KO].value
  }
  return { zh: zh, ko: ko, wiki: ENWIKI_BASE + encodeURIComponent(title.replace(SPACE_GLOBAL_RE, UNDERSCORE)) }
}

// =========================================================================
// 6. 职业目录与测试钩子
// =========================================================================

/**
 * 职业目录(/occupations;照 lib/rankings 模式,零计算只 SELECT,挂了抛给页面)。
 *
 * @param db 数据库连接(池由调用方注进来)。
 * @returns 全量目录行。
 */
export function loadOccupations(db: Db): OccRowsOut {
  return queryRows({ db: db, sql: SQL.PNP_OCCUPATIONS_ALL, params: [], map: toOccRow })
}

/**
 * 测试/热更新用:清掉本域全部进程缓存(改 `CACHE` 的每一格)。
 *
 * @returns 无返回值。
 */
export function resetEmployersCache(): void {
  CACHE.designated = null
  CACHE.designatedInflight = null
  CACHE.sponsors = null
  CACHE.sponsorsInflight = null
  CACHE.research.clear()
}

/**
 * 担保雇主名单 → CSV 全文(B3 付费交付物:浏览免费,成文件带走收费)。
 * 只含库内可核验事实列,无任何「好签/成功率」字样 —— 凭证=粗筛信号非担保承诺。
 * BOM 开头让 Excel 打开中文别名不乱码。
 *
 * @param rows 已按筛选与排序处理过的行。
 * @returns CSV 全文(表头 + 行,尾带换行)。
 */
export function sponsorCsvOf(rows: SponsorRows): string {
  const lines: string[] = [CSV_HEAD.join(CSV_SEP)]
  for (const r of rows) {
    lines.push(csvRowOf(r))
  }
  return CSV_BOM + lines.join(CSV_NL) + CSV_NL
}

/**
 * 一行雇主 → 一行 CSV(列序与 CSV_HEAD 逐格对齐)。
 * lmia 三窗与获批数沿并入前口径:0 或缺位都出空格;lmia_skilled 是官方可空列,
 * 0 是真值要保留,只有 null 出空格(与 db 词汇表 numOrNull 同一条红线)。
 *
 * @param r 一行雇主。
 * @returns 一行 CSV。
 */
function csvRowOf(r: SponsorEmployerRow): string {
  const cells: string[] = [
    csvCell(r.name),
    yesCell(r.aip),
    blankIfNone(r.lmia1q),
    blankIfNone(r.lmia2q),
    blankIfNone(r.lmia4q),
    blankIfNone(r.lmiaPositions),
    blankIfNull(r.lmiaPositionsSkilled),
    csvCell(r.lmiaLastQuarter),
    csvCell(r.streams.join(PIPE)),
    yesCell(r.named),
    String(r.openJobs),
    csvCell(r.provs.join(PIPE)),
    csvCell(r.city),
  ]
  return cells.join(CSV_SEP)
}

/**
 * CSV 格转义:含逗号/引号/换行才加引号(Excel 兼容)。
 *
 * @param v 格内容。
 * @returns 转义后的格。
 */
function csvCell(v: string): string {
  if (CSV_QUOTE_RE.test(v) === false) {
    return v
  }
  return CSV_QUOTE + v.replace(CSV_QUOTE_G_RE, CSV_QUOTE_ESC) + CSV_QUOTE
}

/**
 * 布尔格:真 = yes,假 = 空格(aip/named 两列的口径)。
 *
 * @param v 布尔值。
 * @returns yes 或空格。
 */
function yesCell(v: boolean): string {
  if (v) {
    return CSV_YES
  }
  return CSV_EMPTY
}

/**
 * 数值格:0 或缺位都出空格(lmia 三窗与获批数并入前就是 `|| ''` 的口径 —— 0 无信息量)。
 *
 * @param v 数值。
 * @returns 数字串或空格。
 */
function blankIfNone(v: MaybeNum): string {
  if (v == null || v === 0) {
    return CSV_EMPTY
  }
  return String(v)
}

/**
 * 数值格:只有 null 出空格,0 保留(官方可空列,0 是真值 —— 折 0 = 替官方编数)。
 *
 * @param v 数值。
 * @returns 数字串或空格。
 */
function blankIfNull(v: MaybeNum): string {
  if (v == null) {
    return CSV_EMPTY
  }
  return String(v)
}

/**
 * 公司 AI 检索简介（companies.ai_brief，五节标记；懒翻译的源 —— 只翻库内，
 * 不收任意文本防开放代理）。
 *
 * @param input 连接与公司名（大小写不敏感）。
 * @returns 简介全文；没查过/查无这家是 null。
 */
export async function loadCompanyBrief(input: CompanyBriefIn): MaybeStrOut {
  const rows = await queryRows({ db: input.db, sql: SQL.COMPANY_BRIEF_BY_NAME, params: [input.name], map: toBriefCell })
  return firstOf(rows)
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

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
export function toEmployerReq(r: ReqDbRow): ReqRow {
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
export function toEmployerFacts(r: SponsorDbRow): EmployerFacts {
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
    provs: toStrList(r.provs), nocs: toStrList(r.nocs), cities: toStrList(r.cities),
    aip: r.aip === true, named: r.named === true,
    openJobsAip: count(r.open_jobs_aip), provsAip: toStrList(r.provs_aip),
    lmiaPositions: count(r.lmia_positions),
    lmiaPositionsSkilled: numOrNull(r.lmia_positions_skilled),
    lmiaLastQuarter: text(r.lmia_last_quarter),
    lmia4q: count(r.lmia_positions_4q), lmia2q: count(r.lmia_positions_2q), lmia1q: count(r.lmia_positions_1q),
    streams: toStrList(r.streams),
    verdict: input.verdict,
  }
}

/**
 * 数组格的词汇:pg 的 array_agg 列,null 收成空数组,元素逐个过 text。
 *
 * @param x 库回的数组格。
 * @returns 干净的字符串数组。
 */
export function toStrList(x: StrListCell): StrList {
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
export function toCompanyId(r: IdCell): number {
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

/**
 * 单列 AI 简介（SQL.COMPANY_BRIEF_BY_NAME）→ 文本；查询已把 NULL 行滤掉，
 * 行形状借既有的 CompanyBriefDbRow（只读 ai_brief 一格）。
 *
 * @param r 库里的一行。
 * @returns 简介全文；缺位 null。
 */
export function toBriefCell(r: CompanyBriefDbRow): MaybeStr {
  return textOrNull(r.ai_brief)
}

// =========================================================================
// 回调(callbacks 抽屉 2026-08-23 撤编后的固定尾段;签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * LMIA 表的序:按新近度(Frank 08-08「按最近 LMIA 数排前面」),同值再看在招数。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byLmiaRecency(a: SponsorEmployerRow, b: SponsorEmployerRow): number {
  if (b.lmia1q !== a.lmia1q) {
    return b.lmia1q - a.lmia1q
  }
  if (b.lmia2q !== a.lmia2q) {
    return b.lmia2q - a.lmia2q
  }
  if (b.lmia4q !== a.lmia4q) {
    return b.lmia4q - a.lmia4q
  }
  return b.openJobs - a.openJobs
}

/**
 * named 表的序(#285 三灯默认序):灯①雇主资格(达标→待核/公共→差项)→ 灯②担保行为记录 → 在招数。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byNamedRank(a: RankedSponsor, b: RankedSponsor): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank
  }
  if (b.rec !== a.rec) {
    return b.rec - a.rec
  }
  return b.row.openJobs - a.row.openJobs
}

/**
 * 技能股排序:技能股获批数降序(列未回填的 null 当 0 参战),同值看在招数。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function bySkilledDesc(a: SponsorEmployerRow, b: SponsorEmployerRow): number {
  let av = 0
  if (a.lmiaPositionsSkilled != null) {
    av = a.lmiaPositionsSkilled
  }
  let bv = 0
  if (b.lmiaPositionsSkilled != null) {
    bv = b.lmiaPositionsSkilled
  }
  if (bv !== av) {
    return bv - av
  }
  return b.openJobs - a.openJobs
}

/**
 * 数字升序(对照页年薪中位数取中点前的排序)。
 *
 * @param a 左行。
 * @param b 右行。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byNumAsc(a: number, b: number): number {
  return a - b
}
