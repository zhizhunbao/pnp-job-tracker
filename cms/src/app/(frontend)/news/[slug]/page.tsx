// 移民动态详情页(E12-06 v3):官方英文原文直贴 + ©四件套 + 逐段中文对照 + 评论区(登录可评,审核后显示)。
// SEO:每篇=独立落地页,标题带官方原标题;正文 SSR 全文可索引。
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'
import { NewsDetailView } from '../NewsView'
import { newsRegionName, type NewsComment, type NewsRow } from '../shared'

export const dynamic = 'force-dynamic'

async function loadRow(slug: string): Promise<NewsRow | null> {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  return pool
    .query(`SELECT region, title, date, slug, url, og_image AS "ogImage", body_en AS "bodyEn", body_zh AS "bodyZh", body_ko AS "bodyKo",
                   summary_zh AS "summaryZh", summary_ko AS "summaryKo", summary_en AS "summaryEn",
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
  // 评论(v3):approved 才公开;comments 表未建/查询失败 → 空列表照常渲。登录态给表单分流(未登录=去登录)。
  const payload = await getPayload({ config: await config })
  const comments: NewsComment[] = await (payload.db as any).pool
    .query(`SELECT author_name AS "authorName", body, to_char(created_at, 'YYYY-MM-DD') AS date
            FROM comments WHERE news_slug = $1 AND status = 'approved' ORDER BY created_at ASC LIMIT 200`, [slug])
    .then((r: { rows: NewsComment[] }) => r.rows)
    .catch(() => [])
  const user = await getUser(await headers())
  return <NewsDetailView row={row} comments={comments} loggedIn={!!user} />
}
