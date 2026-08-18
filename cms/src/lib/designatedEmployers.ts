// 雇主板取数与筛选(2026-08-16 Frank「这个雇主页面是不是应该参考 jobtables 页面整体创建。要加上筛选条件」)。
// 两种口径归一成**一块板**(站规 jobtable-is-the-standard:形态别处不自造):
//   · designated —— 官方**指定雇主**名录(AIP/RCIP/FCIP 三个制度都要求 offer 出自被指定的雇主)
//   · hiring     —— 该省该职业的**在招雇主**(本站每日职位库;普通省提名没有「指定雇主」这回事)
// 🔴 口径:被指定 = 该雇主可以走这条试点/试验计划招人,**不等于**它在招、更不等于它要你;
//    在招数是**本站库内**的数,不是该雇主全部招聘。每行给「看该雇主在招」直达职位板。
//
// 性能红线(#313 同款):名录 6,680 行**禁止**整包进 SSR/RSC payload。
//   取数一条不带 WHERE 的 SELECT 进程内 TTL 缓存(Render 单实例=进程缓存即全局,聚合不站在请求路径上排队),
//   筛选/分页全在进程内纯函数做(好测,且不需要为每种筛选组合建索引);
//   SSR 只带第一页 EMP_SSR_ROWS 行 + total,换筛选/翻页走 /api/employers 懒取。
// 只要求「能查」不要求「能借连接」:本文件的函数只 query,别让签名去要 connect。
// 真值在 lib/db/database(08-17 起连接形状单一来源);这里原样再导出,两个既有 import 点不必改。
import type { Db } from './db/database'
import * as SQL from './db/sql'   // SQL 文本全在那儿,本文件只管取数与映射
export type Pool = Db

type DesignatedEmployerRow = {
  name: string
  province: string
  /** 社区/城市(RCIP/FCIP 的名录按社区发,AIP 按省) */
  location: string
  /** AIP | RCIP | FCIP | RCIP+FCIP(双标社区) */
  source: string
  /** 逗号分隔 NOC(AIP 名录部分行有;RCIP/FCIP 多为空 —— 空=名录没写,不是没有限制) */
  nocs: string
  url: string
  fetched: string
}

type HiringEmployerRow = { name: string; province: string; location: string; openJobs: number }

export const EMP_PAGE_SIZE = 50
/** SSR 只带第一页(#313:全量整包进 RSC payload 是 LCP 的真凶) */
export const EMP_SSR_ROWS = 50
export const EMP_PROGRAMS = ['AIP', 'RCIP', 'FCIP'] as const

export type EmployerMode = 'designated' | 'hiring'
export type EmployerFilters = {
  mode: EmployerMode
  /** AIP | RCIP | FCIP;'' = 全部制度(仅 designated 口径有意义) */
  program: string
  prov: string
  /** 社区/城市(名录 location 原值) */
  city: string
  noc: string
  /** 雇主名关键词 */
  q: string
  page: number
}

/** 两种口径归一的一行(列随口径换:designated 出制度+职业,hiring 出在招岗数) */
export type EmployerRow = {
  name: string
  province: string
  /** 社区/城市;名录没写社区时留空,由展示层回落省名 */
  where: string
  /** designated:AIP/RCIP/FCIP(可双标);hiring:'' */
  program: string
  /** 名录列明的 NOC;**空 = 名录没写,不是没有限制**(展示「未列明」,筛职业时不许当不匹配剔掉) */
  nocs: string[]
  /** hiring:本站库内在招岗数;designated:null(名录不含在招信息) */
  openJobs: number | null
  url: string
}

type EmployerFacets = { provs: string[]; programs: string[]; cities: string[]; nocs: string[] }
export type EmployerPage = {
  mode: EmployerMode
  rows: EmployerRow[]
  total: number
  page: number
  pageSize: number
  facets: EmployerFacets
  /** 名录抓取日期(designated;hiring 无) */
  fetched: string
  /** 职业下拉的人话名(noc → 三语);查不到的码原样显示码 */
  nocTitles: Record<string, { en: string; zh: string; ko: string }>
}

// ── 纯函数区(筛选口径的单一来源,int 测试直打这里)─────────────────────────

/** 名录 nocs 串 → 5 位码数组(逗号/空格/顿号混排都吃;非 5 位的碎片丢弃,不瞎猜) */
export function nocList(nocs: string): string[] {
  return Array.from(new Set((nocs || '').split(/[^0-9]+/).filter((s) => /^\d{5}$/.test(s))))
}

/**
 * 职业匹配口径(**本文件最要紧的一条**):名录**没写**职业的行,选了 NOC 时照常保留。
 * 空 nocs = 官方名录这一行没列职业清单(RCIP/FCIP 绝大多数如此),不是「该雇主不招这个职业」——
 * 当成不匹配剔掉 = 拿我们的数据缺口冒充官方的排除,用户会错过大半个名录。
 */
export function nocMatches(rowNocs: string[], noc: string): boolean {
  if (!noc) return true
  if (rowNocs.length === 0) return true   // 未列明 → 保留(展示层标「未列明」)
  return rowNocs.includes(noc)
}

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

/** 名录抓取日:库里两种写法(20260419 / 2026-04-19)。归一在数据层做,展示层只显示 */
export function fmtFetched(v: string): string {
  const s = String(v ?? '').trim()
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return s.slice(0, 10)
}

/** URL 参数 → 规范化筛选(SSR 与 API 共用一份,避免两端口径漂移) */
export function normalizeEmployerFilters(get: (k: string) => string | null | undefined, defMode: EmployerMode = 'designated'): EmployerFilters {
  const modeRaw = clean(get('mode'), 12)
  const program = clean(get('program'), 8).toUpperCase()
  const prov = clean(get('prov'), 4).toUpperCase()
  const noc = clean(get('noc'), 8)
  const page = Number(clean(get('page'), 6))
  return {
    mode: modeRaw === 'hiring' || modeRaw === 'designated' ? modeRaw : defMode,
    program: (EMP_PROGRAMS as readonly string[]).includes(program) ? program : '',
    prov: /^[A-Z]{2}$/.test(prov) ? prov : '',
    city: clean(get('city'), 80),
    noc: /^\d{5}$/.test(noc) ? noc : '',
    q: clean(get('q'), 80),
    page: Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), 9999) : 0,
  }
}

/** 名录一行 → 板上一行 */
export function toEmployerRow(r: DesignatedEmployerRow): EmployerRow {
  return {
    name: r.name, province: r.province, where: r.location,
    program: r.source, nocs: nocList(r.nocs), openJobs: null, url: r.url,
  }
}

/** 制度用**子串**匹配:'RCIP+FCIP' 的双标社区对 RCIP 与 FCIP 两个筛选都算数 */
export function programMatches(rowProgram: string, program: string): boolean {
  return !program || rowProgram.includes(program)
}

export function applyEmployerFilters(rows: EmployerRow[], f: EmployerFilters): EmployerRow[] {
  const q = f.q.trim().toLowerCase()
  return rows.filter((r) => programMatches(r.program, f.program)
    && (!f.prov || r.province === f.prov)
    && (!f.city || r.where === f.city)
    && nocMatches(r.nocs, f.noc)
    && (!q || r.name.toLowerCase().includes(q)))
}

/**
 * 下拉选项:省/制度看整份数据(切了省也不能把省下拉自己清空),
 * 社区/职业看**已按省+制度收窄后**的数据(否则 NB 的社区会出现在 SK 的下拉里)。
 */
export function employerFacets(rows: EmployerRow[], f: EmployerFilters): EmployerFacets {
  const provs = new Set<string>()
  const programs = new Set<string>()
  const cities = new Set<string>()
  const nocs = new Set<string>()
  for (const r of rows) {
    if (r.province) provs.add(r.province)
    for (const p of EMP_PROGRAMS) if (r.program.includes(p)) programs.add(p)
    if (!programMatches(r.program, f.program)) continue
    if (f.prov && r.province !== f.prov) continue
    if (r.where) cities.add(r.where)
    for (const n of r.nocs) nocs.add(n)
  }
  return {
    provs: [...provs].sort(),
    programs: EMP_PROGRAMS.filter((p) => programs.has(p)),
    cities: [...cities].sort(),
    nocs: [...nocs].sort(),
  }
}

export function pageSlice<T>(rows: T[], page: number, size = EMP_PAGE_SIZE): T[] {
  const p = Math.max(0, page)
  return rows.slice(p * size, (p + 1) * size)
}

// ── 取数区 ─────────────────────────────────────────────────────────────────

const TTL = 10 * 60_000
let cache: { ts: number; rows: DesignatedEmployerRow[] } | null = null
let inflight: Promise<DesignatedEmployerRow[]> | null = null

async function loadAllDesignated(pool: Pool): Promise<DesignatedEmployerRow[]> {
  const { rows } = await pool.query(
    SQL.DESIGNATED_ALL,
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
  return rows.map((r) => ({
    name: String(r.name ?? ''),
    province: String(r.province ?? ''),
    location: String(r.location ?? ''),
    source: String(r.source ?? ''),
    nocs: String(r.nocs ?? ''),
    url: String(r.url ?? ''),
    fetched: fmtFetched(String(r.fetched ?? '')),
  }))
}

/** 整表进程内缓存(6,680 行 × 7 短字段);过期先回旧值、后台刷新,冷启动第一请求才真等 */
async function fetchAllDesignated(pool: Pool): Promise<DesignatedEmployerRow[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.rows
  if (!inflight) inflight = loadAllDesignated(pool)
    .then((rows) => { cache = { ts: Date.now(), rows }; return rows })
    .finally(() => { inflight = null })
  if (cache) { void inflight.catch(() => {}); return cache.rows }
  return inflight
}

/**
 * 在招雇主:该省该职业正在招人的雇主,数据来自本站每日职位库(不是官方名录)。
 * 省+职业**两个都得有**才查 —— 少一个就是全省 GROUP BY 全表,那是站级聚合,禁每请求现算。
 */
async function fetchHiringEmployers(pool: Pool, opts: { province: string; noc: string }): Promise<HiringEmployerRow[]> {
  if (!/^[A-Z]{2}$/.test(opts.province) || !/^\d{5}$/.test(opts.noc)) return []
  const { rows } = await pool.query(
    SQL.HIRING_EMPLOYERS, [opts.province, opts.noc],
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
  return rows.map((r) => ({
    name: String(r.name ?? ''),
    province: String(r.province ?? ''),
    location: String(r.location ?? ''),
    openJobs: Number(r.n) || 0,
  }))
}

/** 职业人话名(站规:代码不裸奔)。查不到就不返回该码,展示层原样显示 5 位码 */
async function fetchNocTitles(pool: Pool, codes: string[]): Promise<EmployerPage['nocTitles']> {
  const list = codes.filter((c) => /^\d{5}$/.test(c)).slice(0, 500)
  if (!list.length) return {}
  const { rows } = await pool.query(
    SQL.NOC_TITLES_FOR_EMPLOYERS, [list],
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
  const out: EmployerPage['nocTitles'] = {}
  for (const r of rows) {
    const noc = String(r.noc ?? '')
    if (noc) out[noc] = { en: String(r.en ?? ''), zh: String(r.zh ?? ''), ko: String(r.ko ?? '') }
  }
  return out
}

/** 一页数据(SSR 与 /api/employers 共用;挂了回空表,绝不 500) */
export async function loadEmployerPage(
  pool: Pool | undefined, f: EmployerFilters, pageSize = EMP_PAGE_SIZE,
): Promise<EmployerPage> {
  const empty: EmployerPage = {
    mode: f.mode, rows: [], total: 0, page: f.page, pageSize,
    facets: { provs: [], programs: [], cities: [], nocs: [] }, fetched: '', nocTitles: {},
  }
  if (!pool) return empty
  try {
    if (f.mode === 'hiring') {
      const raw = await fetchHiringEmployers(pool, { province: f.prov, noc: f.noc })
      const all: EmployerRow[] = raw.map((r) => ({
        name: r.name, province: r.province, where: r.location, program: '', nocs: [], openJobs: r.openJobs, url: '',
      }))
      // 在招口径的职业筛就是入口的 noc 本身(整批同一个职业),这里只再筛雇主名/社区
      const hit = all.filter((r) => (!f.city || r.where === f.city)
        && (!f.q || r.name.toLowerCase().includes(f.q.trim().toLowerCase())))
      const nocTitles = await fetchNocTitles(pool, f.noc ? [f.noc] : [])
      return {
        mode: 'hiring', rows: pageSlice(hit, f.page, pageSize), total: hit.length, page: f.page, pageSize,
        facets: {
          provs: f.prov ? [f.prov] : [], programs: [],
          cities: [...new Set(all.map((r) => r.where).filter(Boolean))].sort(),
          nocs: f.noc ? [f.noc] : [],
        },
        fetched: '', nocTitles,
      }
    }
    const raw = await fetchAllDesignated(pool)
    const all = raw.map(toEmployerRow)
    const facets = employerFacets(all, f)
    const hit = applyEmployerFilters(all, f)
    const nocTitles = await fetchNocTitles(pool, facets.nocs)
    return {
      mode: 'designated', rows: pageSlice(hit, f.page, pageSize), total: hit.length, page: f.page, pageSize,
      facets, fetched: raw.find((r) => r.fetched)?.fetched ?? '', nocTitles,
    }
  } catch {
    return empty
  }
}

/** 测试/热更新用:清掉进程缓存 */
export function _resetDesignatedCache() { cache = null; inflight = null }
