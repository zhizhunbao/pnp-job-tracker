// 榜单行读取(E5-02):rankings 页与 /api/rankings-data 共用同一查询与映射(E8-02 弹窗化,不许 fork)。
// 零计算 —— 只 SELECT rankings 表(计算在 etl/10_build_rankings.py)。
import type { RankRow } from '@/app/(frontend)/rankings/RankingView'

// 每日分类榜(E9-02):大类 slug 段与 etl/10_build_rankings BROAD_SLUG 镜像,勿单改
export const DAILY_BROADS = ['tech', 'health', 'trades', 'service', 'business', 'education', 'manufacturing', 'resources', 'arts', 'management'] as const
export const RANKING_SLUGS = new Set(['weekly-top', 'sponsor-likely', 'daily-top', ...DAILY_BROADS.map((b) => `daily-top-${b}`)])

/** 当前实际有数据的榜 slug(大类榜岗不够当天不出榜——导航只显示存在的) */
export async function fetchRankingSlugs(pool: any): Promise<string[]> {
  const { rows } = await pool.query(`SELECT DISTINCT slug FROM rankings`)
  return rows.map((r: any) => r.slug as string)
}

export async function fetchRankingRows(pool: any, slug: string): Promise<RankRow[]> {
  const { rows } = await pool.query(
    `SELECT slug, rank, kind, external_id, title, company, company_slug, city, province, noc, teer, score,
            salary_text, salary_annual, pnp_stream, ee_category, date_posted, apply_url, official_url,
            open_jobs, named_jobs, avg_score, lmia_positions, lmia_quarter
     FROM rankings WHERE slug = $1 ORDER BY rank ASC`, [slug])
  const num = (v: any) => (v == null ? null : Number(v))
  return rows.map((r: any) => ({
    rank: Number(r.rank), kind: r.kind ?? 'job', externalId: r.external_id ?? '',
    title: r.title ?? '', company: r.company ?? '', city: r.city ?? '', province: r.province ?? '',
    noc: r.noc ?? '', teer: num(r.teer), score: num(r.score),
    salaryText: r.salary_text ?? '', salaryAnnual: num(r.salary_annual),
    pnpStream: r.pnp_stream ?? '', eeCategory: r.ee_category ?? '', datePosted: r.date_posted ?? '',
    applyUrl: r.apply_url ?? '', officialUrl: r.official_url ?? '',
    openJobs: num(r.open_jobs), namedJobs: num(r.named_jobs), avgScore: num(r.avg_score),
    lmiaPositions: num(r.lmia_positions), lmiaQuarter: r.lmia_quarter ?? '',
  }))
}
