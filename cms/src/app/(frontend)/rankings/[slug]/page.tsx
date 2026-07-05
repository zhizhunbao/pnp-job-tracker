// 榜单页(E5-02,PRD F8):零前端计算 —— 只 SELECT rankings 表渲染(计算在 etl/10_build_rankings.py)。
// 行只含事实字段 + 官方链接(E4-03 约束);SEO 主体 = generateMetadata。
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { RankingView, type RankRow } from '../RankingView'

export const dynamic = 'force-dynamic'

const SLUGS = new Set(['weekly-top', 'sponsor-likely'])
const META: Record<string, { title: string; desc: string }> = {
  'weekly-top': {
    title: 'New Canadian jobs this week — TOP 50 by immigration value | PNP Job Tracker',
    desc: 'Top 50 jobs posted across Canada in the last 7 days, ranked by immigration-value score (PNP streams, EE categories, wages vs median). Updated daily. 本周全加拿大新增职位 TOP 50,按移民价值评分排序,每日更新。',
  },
  'sponsor-likely': {
    title: 'Employers most likely to support PNP — LMIA track record | PNP Job Tracker',
    desc: 'First-party employers ranked by approved LMIA positions in the past two years (ESDC open data, skilled streams) and named provincial-stream hiring. A rough signal, not a sponsorship promise. 最可能担保雇主榜:近两年 LMIA 获批记录 + 省提名清单命中,每日更新。',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const m = META[slug]
  return m ? { title: m.title, description: m.desc } : {}
}

export default async function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!SLUGS.has(slug)) notFound()
  const payload = await getPayload({ config: await config })
  const { rows } = await (payload.db as any).pool.query(
    `SELECT slug, rank, kind, external_id, title, company, company_slug, city, province, noc, teer, score,
            salary_text, salary_annual, pnp_stream, ee_category, date_posted, apply_url, official_url,
            open_jobs, named_jobs, avg_score
     FROM rankings WHERE slug = $1 ORDER BY rank ASC`, [slug])
  const num = (v: any) => (v == null ? null : Number(v))
  const items: RankRow[] = rows.map((r: any) => ({
    rank: Number(r.rank), kind: r.kind ?? 'job', externalId: r.external_id ?? '',
    title: r.title ?? '', company: r.company ?? '', city: r.city ?? '', province: r.province ?? '',
    noc: r.noc ?? '', teer: num(r.teer), score: num(r.score),
    salaryText: r.salary_text ?? '', salaryAnnual: num(r.salary_annual),
    pnpStream: r.pnp_stream ?? '', eeCategory: r.ee_category ?? '', datePosted: r.date_posted ?? '',
    applyUrl: r.apply_url ?? '', officialUrl: r.official_url ?? '',
    openJobs: num(r.open_jobs), namedJobs: num(r.named_jobs), avgScore: num(r.avg_score),
  }))
  return <RankingView slug={slug} items={items} />
}
