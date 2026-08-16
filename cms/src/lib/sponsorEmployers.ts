// B2 在招担保雇主聚合(docs/implementation/在招担保雇主/02_B2):
// 行=在招(status≠closed)且有担保凭证(AIP 指定 / LMIA 获批 / 紧缺清单命中)的雇主。
// 铁律:站级聚合禁每请求现算——单条 GROUP BY 全量进程内 TTL 缓存(Render 单实例=进程缓存即全局),
// 筛选/排序/翻页全在进程内做;并发 miss 以 in-flight promise 去重(单飞)。
// 语义红线循 E6-02:凭证=历史事实/官方名录,非担保承诺。
//
// B4(design/雇主省提名门槛判定-20260808.md):named 表每行再挂一个「雇主够不够所在省门槛」判定
// (employerVerdict.ts,纯函数)。公司事实列(founded_year 等)B3 还没建 DDL → **逐列探测**取数
// (#280/E14-02 容缺先例),没探到的字段整行按「缺」处理,判定自然全落 unknown,不会报错。
// 门槛省 = r.provs[0](与既有 where 列同一取法:雇主表一行没有单一地址,只能挑一个代表省)。

import { employerVerdict, type EmployerFacts, type EmployerVerdict } from './employerVerdict'
import type { Requirement } from './rules'

export const SE_PAGE_SIZE = 100
// #313:把脉页橱窗三分表 SSR 每表只带前 50 行(桌面 10/页 → 首 5 页秒开),全量走 /api/sponsor-employers 懒取
export const SE_SSR_ROWS = 50

export type SponsorEmployerRow = {
  name: string; slug: string; industry: string; aliasZh: string; aliasKo: string
  sponsorGrade: number | null
  openJobs: number; city: string; provs: string[]; nocs: string[]; cities: string[]
  aip: boolean; named: boolean
  // AIP 视图专用口径(Frank 08-08 实指「AIP 不是只在四个省吗」):指定只存在于 NB/NS/PE/NL,
  // 全国在招数/所在地会让用户把安省岗也读成 AIP 可用 → 该视图在招/所在地只计 j.aip=true 的岗
  openJobsAip: number; provsAip: string[]
  lmiaPositions: number; lmiaPositionsSkilled: number | null; lmiaLastQuarter: string
  // B4 时间窗(近 4/2/1 季;列可能未回填=null → 0)
  lmia4q: number; lmia2q: number; lmia1q: number
  // Frank 08-08 二拍(PNP 视图=看省提名资质,不挂 LMIA):在招岗命中的具名省清单标签(去重,如「BC 医疗」)。
  // 旧「PR 股 LMIA」正则主证已撤——全库 35,478 家命中 0,是列名先行、数据不存在
  streams: string[]
  // B4:雇主侧门槛判定(公司事实×该省官方门槛)。字段没落库/门槛未收录时 state 恒 'unknown',
  // 不是一等公民的报错 —— 消费端(表列)据此判断要不要整列隐藏。
  verdict: EmployerVerdict
}

export type SponsorFilters = { f: '' | 'aip' | 'lmia' | 'named'; prov: string; city: string; noc: string; q: string; sort: 'open' | 'skilled'; page: number }

const TTL = 10 * 60_000
let cache: { ts: number; rows: SponsorEmployerRow[] } | null = null
let inflight: Promise<SponsorEmployerRow[]> | null = null

// B4 公司事实五列(founded_year/registry_status/staff_est/staff_est_src/sector):B3 还没建 DDL,
// 生产库大概率没有 —— 逐列探测(#280/E14-02 容缺先例),探到哪列就 SELECT/GROUP BY 哪列,
// 一列都没有时 extraSelect/extraGroup 都是空串,整条 SQL 退回到探测前的原样。
const FACT_COLS = ['founded_year', 'registry_status', 'staff_est', 'staff_est_src', 'sector']
async function probeFactCols(pool: any): Promise<string[]> {
  return pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name = ANY($1)`,
    [FACT_COLS],
  ).then((r: any) => r.rows.map((x: any) => String(x.column_name))).catch(() => [])
}

// 门槛端:pnp_requirements 雇主侧行(全表几十行,整表取回,判定在进程内做——纯函数好测)。
// 只取判定用得到的列;Requirement 其余字段判定不读,给空值占位即可(与 R() 测试 fixture 同一惯例)。
async function loadEmployerReqs(pool: any): Promise<Requirement[]> {
  const rows = await pool.query(
    `SELECT province, factor, op, value, unit, applies_area FROM pnp_requirements WHERE subject = 'employer'`,
  ).then((r: any) => r.rows).catch(() => [])
  return rows.map((r: any): Requirement => ({
    province: r.province ?? '', program: 'PNP', stream: '', subject: 'employer', factor: r.factor ?? '',
    op: r.op ?? '>=', value: r.value == null ? null : Number(r.value), valueText: '', unit: r.unit ?? '',
    appliesTeer: '', appliesNoc: '', excludesNoc: '', appliesArea: r.applies_area ?? '', appliesCondition: '',
    familySize: null, basis: '', label: '', section: '', effective: '', url: '', pageUrl: '', fetched: '',
  }))
}

async function loadAll(pool: any): Promise<SponsorEmployerRow[]> {
  const factCols = await probeFactCols(pool)
  const factSelect = factCols.length ? `, ${factCols.map((c) => `c.${c}`).join(', ')}` : ''
  const factGroup = factCols.length ? `, ${factCols.map((c) => `c.${c}`).join(', ')}` : ''
  const [{ rows }, employerReqs] = await Promise.all([
    // 在招口径与职位板同源(jobsSql #136):COALESCE(status,'open') <> 'closed'
    pool.query(`
    SELECT c.name, c.slug, c.industry, c.alias_zh, c.alias_ko, c.sponsor_grade,
      c.lmia_positions, c.lmia_positions_skilled, c.lmia_last_quarter, c.lmia_streams,
      c.lmia_positions_4q, c.lmia_positions_2q, c.lmia_positions_1q${factSelect},
      COUNT(*)::int AS open_jobs,
      COUNT(*) FILTER (WHERE j.aip)::int AS open_jobs_aip,
      COALESCE(ARRAY_AGG(DISTINCT j.province) FILTER (WHERE j.aip AND COALESCE(j.province, '') <> ''), '{}') AS provs_aip,
      BOOL_OR(j.aip) AS aip,
      BOOL_OR(COALESCE(j.pnp_stream, '') <> '') AS named,
      COALESCE(ARRAY_AGG(DISTINCT j.pnp_stream) FILTER (WHERE COALESCE(j.pnp_stream, '') <> ''), '{}') AS streams,
      COALESCE(ARRAY_AGG(DISTINCT j.noc) FILTER (WHERE COALESCE(j.noc, '') <> ''), '{}') AS nocs,
      COALESCE(ARRAY_AGG(DISTINCT j.province) FILTER (WHERE COALESCE(j.province, '') <> ''), '{}') AS provs,
      COALESCE(ARRAY_AGG(DISTINCT j.city) FILTER (WHERE COALESCE(j.city, '') <> ''), '{}') AS cities,
      COALESCE((ARRAY_AGG(j.city ORDER BY j.id) FILTER (WHERE COALESCE(j.city, '') <> ''))[1], '') AS city
    FROM jobs j JOIN companies c ON c.id = j.company_id
    WHERE COALESCE(j.status, 'open') <> 'closed'
    GROUP BY c.id, c.name, c.slug, c.industry, c.alias_zh, c.alias_ko, c.sponsor_grade,
      c.lmia_positions, c.lmia_positions_skilled, c.lmia_last_quarter, c.lmia_streams,
      c.lmia_positions_4q, c.lmia_positions_2q, c.lmia_positions_1q${factGroup}
    HAVING BOOL_OR(j.aip) OR BOOL_OR(COALESCE(j.pnp_stream, '') <> '') OR COALESCE(c.lmia_positions, 0) > 0
    ORDER BY open_jobs DESC, c.name ASC`),
    loadEmployerReqs(pool),
  ])
  return rows.map((r: any): SponsorEmployerRow => {
    // 门槛省 = provs[0](表行没有单一地址,与既有 where 列同一取法;见文件头注)
    const province = (r.provs ?? [])[0] ?? ''
    const facts: EmployerFacts = {
      foundedYear: r.founded_year == null ? null : Number(r.founded_year),
      registryStatus: r.registry_status ?? null,
      staffEst: r.staff_est == null ? null : Number(r.staff_est),
      staffEstSrc: r.staff_est_src ?? null,
      sector: r.sector ?? null,
    }
    return {
      name: r.name ?? '', slug: r.slug ?? '', industry: r.industry ?? '', aliasZh: r.alias_zh ?? '', aliasKo: r.alias_ko ?? '',
      sponsorGrade: r.sponsor_grade ?? null,
      openJobs: Number(r.open_jobs) || 0, city: r.city ?? '', provs: r.provs ?? [], nocs: r.nocs ?? [], cities: r.cities ?? [],
      aip: !!r.aip, named: !!r.named,
      openJobsAip: Number(r.open_jobs_aip) || 0, provsAip: r.provs_aip ?? [],
      lmiaPositions: Number(r.lmia_positions) || 0,
      lmiaPositionsSkilled: r.lmia_positions_skilled == null ? null : Number(r.lmia_positions_skilled),
      lmiaLastQuarter: r.lmia_last_quarter ?? '',
      lmia4q: Number(r.lmia_positions_4q) || 0, lmia2q: Number(r.lmia_positions_2q) || 0, lmia1q: Number(r.lmia_positions_1q) || 0,
      streams: r.streams ?? [],
      verdict: employerVerdict(facts, province, employerReqs),
    }
  })
}

export async function fetchSponsorEmployers(pool: any): Promise<SponsorEmployerRow[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.rows
  if (!inflight) inflight = loadAll(pool)
    .then((rows) => { cache = { ts: Date.now(), rows }; return rows })
    .finally(() => { inflight = null })
  // 过期先回旧值、后台刷新(08-08 生产两次池楔死后加的保险:聚合永不站在请求路径上排队;
  // 只有冷启动第一请求真正等)
  if (cache) { void inflight.catch(() => {}); return cache.rows }
  return inflight
}

// ── #313 把脉页橱窗三分表(lmia/named/aip)构建 ─────────────────────────────
// 逻辑原样自 start/page.tsx 下沉(单一来源):SSR(切前 50 行)与 /api/sponsor-employers(全量)共用。
// 排序拍板不动:LMIA 按新近度(Frank 08-08「按最近 LMIA 数排前面」),named 按 #285 三灯默认序,AIP 保持聚合序。
// 瘦身照旧:cities 表格不渲不筛,置空;nocs 留着供职业筛。
export type SponsorBoardData = { top: SponsorEmployerRow[]; total: number }
export type SponsorBoards = { lmia: SponsorBoardData; named: SponsorBoardData; aip: SponsorBoardData }
export function buildSponsorBoards(rows: SponsorEmployerRow[]): SponsorBoards {
  type SR = SponsorEmployerRow
  const pick = (keep: (r: SR) => boolean, order?: (a: SR, b: SR) => number): SponsorBoardData => {
    // 缓存行全站共享:filter 产新数组供排序,map 产新对象供瘦身,均不动缓存
    const hit = rows.filter(keep)
    if (order) hit.sort(order)
    return { top: hit.map((r) => ({ ...r, cities: [] })), total: hit.length }
  }
  return {
    lmia: pick((r) => r.lmiaPositions > 0, (a, b) => b.lmia1q - a.lmia1q || b.lmia2q - a.lmia2q || b.lmia4q - a.lmia4q || b.openJobs - a.openJobs),
    // #285 三灯默认序:灯①雇主资格(达标→待核/公共→差项)→ 灯②担保行为记录 → 在招数
    named: pick((r) => r.named, (a, b) => {
      const prio = (r: SR) => (r.verdict.state === 'met' ? 0 : r.verdict.state === 'short' ? 2 : 1)
      const rec = (r: SR) => (r.lmiaPositions > 0 || r.aip ? 1 : 0)
      return prio(a) - prio(b) || rec(b) - rec(a) || b.openJobs - a.openJobs
    }),
    aip: pick((r) => r.aip),
  }
}

/** 进程内筛选+排序(全量,B3 导出与页面共用;缓存行是共享的,绝不原地排序——先浅拷贝) */
export function applySponsorFilters(all: SponsorEmployerRow[], f: Omit<SponsorFilters, 'page'>): SponsorEmployerRow[] {
  const q = f.q.trim().toLowerCase()
  const rows = all.filter((r) =>
    (f.f === 'aip' ? r.aip : f.f === 'lmia' ? r.lmiaPositions > 0 : f.f === 'named' ? r.named : true)
    && (!f.prov || r.provs.includes(f.prov))
    && (!f.city || r.cities.includes(f.city))
    && (!f.noc || r.nocs.includes(f.noc))
    && (!q || r.name.toLowerCase().includes(q)))
  if (f.sort === 'skilled') return [...rows].sort((a, b) => (b.lmiaPositionsSkilled ?? 0) - (a.lmiaPositionsSkilled ?? 0) || b.openJobs - a.openJobs)
  return rows
}

/** 页面用:筛选+翻页 */
export function filterSponsorEmployers(all: SponsorEmployerRow[], f: SponsorFilters): { items: SponsorEmployerRow[]; total: number } {
  const rows = applySponsorFilters(all, f)
  const page = Math.max(0, f.page)
  return { items: rows.slice(page * SE_PAGE_SIZE, (page + 1) * SE_PAGE_SIZE), total: rows.length }
}
