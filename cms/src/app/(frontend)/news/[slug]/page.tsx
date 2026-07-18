// 移民动态详情页(E12-06 P1b,v3):官方英文原文直贴 + 转载姿势四件套(©/非官方声明/原文链/日期)。
// SEO:每篇=独立落地页,标题带官方原标题;正文 SSR 全文可索引。
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { NewsDetailView } from '../NewsView'
import { newsRegionName, type NewsRow } from '../shared'

export const dynamic = 'force-dynamic'

async function loadRow(slug: string): Promise<NewsRow | null> {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  return pool
    .query(`SELECT region, title, date, slug, url, og_image AS "ogImage", body_en AS "bodyEn", body_zh AS "bodyZh",
                   importance, importance_note AS "importanceNote", citation, fetched, '' AS excerpt
            FROM news WHERE slug = $1 LIMIT 1`, [slug])
    .then((r: { rows: NewsRow[] }) => r.rows[0] ?? null)
    .catch(() => null)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const row = await loadRow(slug)
  if (!row) return {}
  const who = row.region === 'federal' ? 'IRCC' : `${newsRegionName(row.region)} PNP`
  return {
    title: `${row.title} — ${who} ${row.date} | Offer2PR`,
    description: `${(row.bodyEn || '').replace(/\s+/g, ' ').slice(0, 160)}…`,
  }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const row = await loadRow(slug)
  if (!row) notFound()
  return <NewsDetailView row={row} />
}
