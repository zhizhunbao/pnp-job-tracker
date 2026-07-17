// 榜单页(E5-02,PRD F8):零前端计算 —— 只 SELECT rankings 表渲染(计算在 etl/10_build_rankings.py)。
// 行只含事实字段 + 官方链接(E4-03 约束);SEO 主体 = generateMetadata。
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { RankingView } from '../RankingView'
import { fetchRankingRows, fetchRankingSlugs, RANKING_SLUGS } from '@/lib/rankings'

export const dynamic = 'force-dynamic'
const META: Record<string, { title: string; desc: string }> = {
  'weekly-top': {
    title: 'New Canadian jobs this week — TOP 50 by immigration value | Offer2PR',
    desc: 'Top 50 jobs posted across Canada in the last 7 days, ranked by immigration-value score (PNP streams, EE categories, wages vs median). Updated daily. 本周全加拿大新增职位 TOP 50,按移民价值评分排序,每日更新。',
  },
  'sponsor-likely': {
    title: 'Employers most likely to support PNP — LMIA track record | Offer2PR',
    desc: 'First-party employers ranked by approved LMIA positions in the past two years (ESDC open data, skilled streams) and named provincial-stream hiring. A rough signal, not a sponsorship promise. 最可能担保雇主榜:近两年 LMIA 获批记录 + 省提名清单命中,每日更新。',
  },
}

// 每日分类榜(E9-02)SEO:slug 段 → 英文大类名
const DAILY_EN: Record<string, string> = { tech: 'Tech', health: 'Healthcare', trades: 'Trades', service: 'Service', business: 'Business', education: 'Education', manufacturing: 'Manufacturing', resources: 'Resources', arts: 'Arts & sports', management: 'Management' }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const m = META[slug]
  if (m) return { title: m.title, description: m.desc }
  if (slug.startsWith('daily-top')) {
    const cat = DAILY_EN[slug.replace('daily-top-', '')] || ''
    const seg = cat ? `${cat} jobs` : 'jobs'
    return {
      title: `Daily picks — top ${seg} in Canada by immigration value | Offer2PR`,
      description: `Top ${seg} posted across Canada in the last 48 hours, ranked by immigration-value score (PNP streams, EE categories, wages). Refreshed hourly. 每日精选:近 48 小时新发布按移民价值评分精选,每小时刷新。`,
    }
  }
  return {}
}

export default async function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!RANKING_SLUGS.has(slug)) notFound()
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const [items, slugs] = await Promise.all([fetchRankingRows(pool, slug), fetchRankingSlugs(pool)])
  return <RankingView slug={slug} items={items} slugs={slugs} />
}
