// B2 在招担保雇主聚合(docs/implementation/在招担保雇主/02_B2):
// 行=在招(status≠closed)且有担保凭证(AIP 指定 / LMIA 获批 / 紧缺清单命中)的雇主。
// 铁律:站级聚合禁每请求现算——单条 GROUP BY 全量进程内 TTL 缓存(Render 单实例=进程缓存即全局),
// 筛选/排序/翻页全在进程内做;并发 miss 以 in-flight promise 去重(单飞)。
// 语义红线循 E6-02:凭证=历史事实/官方名录,非担保承诺。

export const SE_PAGE_SIZE = 100

export type SponsorEmployerRow = {
  name: string; slug: string; industry: string; aliasZh: string; aliasKo: string
  sponsorGrade: number | null
  openJobs: number; city: string; provs: string[]; nocs: string[]
  aip: boolean; named: boolean
  lmiaPositions: number; lmiaPositionsSkilled: number | null; lmiaLastQuarter: string
}

export type SponsorFilters = { f: '' | 'aip' | 'lmia' | 'named'; prov: string; noc: string; q: string; sort: 'open' | 'skilled'; page: number }

const TTL = 10 * 60_000
let cache: { ts: number; rows: SponsorEmployerRow[] } | null = null
let inflight: Promise<SponsorEmployerRow[]> | null = null

async function loadAll(pool: any): Promise<SponsorEmployerRow[]> {
  // 在招口径与职位板同源(jobsSql #136):COALESCE(status,'open') <> 'closed'
  const { rows } = await pool.query(`
    SELECT c.name, c.slug, c.industry, c.alias_zh, c.alias_ko, c.sponsor_grade,
      c.lmia_positions, c.lmia_positions_skilled, c.lmia_last_quarter,
      COUNT(*)::int AS open_jobs,
      BOOL_OR(j.aip) AS aip,
      BOOL_OR(COALESCE(j.pnp_stream, '') <> '') AS named,
      COALESCE(ARRAY_AGG(DISTINCT j.noc) FILTER (WHERE COALESCE(j.noc, '') <> ''), '{}') AS nocs,
      COALESCE(ARRAY_AGG(DISTINCT j.province) FILTER (WHERE COALESCE(j.province, '') <> ''), '{}') AS provs,
      COALESCE((ARRAY_AGG(j.city ORDER BY j.id) FILTER (WHERE COALESCE(j.city, '') <> ''))[1], '') AS city
    FROM jobs j JOIN companies c ON c.id = j.company_id
    WHERE COALESCE(j.status, 'open') <> 'closed'
    GROUP BY c.id, c.name, c.slug, c.industry, c.alias_zh, c.alias_ko, c.sponsor_grade,
      c.lmia_positions, c.lmia_positions_skilled, c.lmia_last_quarter
    HAVING BOOL_OR(j.aip) OR BOOL_OR(COALESCE(j.pnp_stream, '') <> '') OR COALESCE(c.lmia_positions, 0) > 0
    ORDER BY open_jobs DESC, c.name ASC`)
  return rows.map((r: any): SponsorEmployerRow => ({
    name: r.name ?? '', slug: r.slug ?? '', industry: r.industry ?? '', aliasZh: r.alias_zh ?? '', aliasKo: r.alias_ko ?? '',
    sponsorGrade: r.sponsor_grade ?? null,
    openJobs: Number(r.open_jobs) || 0, city: r.city ?? '', provs: r.provs ?? [], nocs: r.nocs ?? [],
    aip: !!r.aip, named: !!r.named,
    lmiaPositions: Number(r.lmia_positions) || 0,
    lmiaPositionsSkilled: r.lmia_positions_skilled == null ? null : Number(r.lmia_positions_skilled),
    lmiaLastQuarter: r.lmia_last_quarter ?? '',
  }))
}

export async function fetchSponsorEmployers(pool: any): Promise<SponsorEmployerRow[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.rows
  if (!inflight) inflight = loadAll(pool)
    .then((rows) => { cache = { ts: Date.now(), rows }; return rows })
    .finally(() => { inflight = null })
  return inflight
}

/** 进程内筛选+排序+翻页(缓存行是共享的,绝不原地排序——先浅拷贝) */
export function filterSponsorEmployers(all: SponsorEmployerRow[], f: SponsorFilters): { items: SponsorEmployerRow[]; total: number } {
  const q = f.q.trim().toLowerCase()
  let rows = all.filter((r) =>
    (f.f === 'aip' ? r.aip : f.f === 'lmia' ? r.lmiaPositions > 0 : f.f === 'named' ? r.named : true)
    && (!f.prov || r.provs.includes(f.prov))
    && (!f.noc || r.nocs.includes(f.noc))
    && (!q || r.name.toLowerCase().includes(q)))
  if (f.sort === 'skilled') rows = [...rows].sort((a, b) => (b.lmiaPositionsSkilled ?? 0) - (a.lmiaPositionsSkilled ?? 0) || b.openJobs - a.openJobs)
  const page = Math.max(0, f.page)
  return { items: rows.slice(page * SE_PAGE_SIZE, (page + 1) * SE_PAGE_SIZE), total: rows.length }
}
