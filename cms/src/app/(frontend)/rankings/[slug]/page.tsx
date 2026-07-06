// 榜单页(E5-02,PRD F8):零前端计算 —— 只 SELECT rankings 表渲染(计算在 etl/10_build_rankings.py)。
// 行只含事实字段 + 官方链接(E4-03 约束);SEO 主体 = generateMetadata。
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { RankingView } from '../RankingView'
import { fetchRankingRows, RANKING_SLUGS } from '@/lib/rankings'

export const dynamic = 'force-dynamic'
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
  if (!RANKING_SLUGS.has(slug)) notFound()
  const payload = await getPayload({ config: await config })
  const items = await fetchRankingRows((payload.db as any).pool, slug)
  return <RankingView slug={slug} items={items} />
}
