// 移民动态详情页(E12-06 v3):官方英文原文直贴 + ©四件套 + 逐段中文对照 + 评论区(登录可评,审核后显示)。
// SEO:每篇=独立落地页,标题带官方原标题;正文 SSR 全文可索引。
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/quota/server'
import { NewsDetail } from '../News'
import { newsRegionName, type NewsComment, type NewsRow } from '../shared'
import { SQL } from '@/lib/db'   // SQL 文本全在那儿,本文件只管取数与组装

export const dynamic = 'force-dynamic'

async function loadRow(slug: string): Promise<NewsRow | null> {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const q = (withEn: boolean) => pool.query(
    SQL.newsBySlug(withEn ? 'summary_en' : 'NULL'), [slug])
  // schema 容错(P1f 事故教训:引用未建列把全部详情页打成 404):summary_en 缺列时退回 NULL 版,DDL 到位自动启用
  return q(true)
    .then((r: { rows: NewsRow[] }) => r.rows[0] ?? null)
    .catch(() => q(false).then((r: { rows: NewsRow[] }) => r.rows[0] ?? null).catch(() => null))
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
  // F 件(E8-07):带楼中楼/置顶/官方标(official=admin 号发的);统一 created_at ASC,楼序在组件里排
  // (顶层=置顶先、再时间倒序;楼内回复保持时间正序)。parent_id/pinned 列缺(DDL 未跑)时回退老查询。
  const pool = (payload.db as any).pool
  const comments: NewsComment[] = await pool
    .query(SQL.NEWS_COMMENTS_THREADED, [slug])
    .then((r: { rows: NewsComment[] }) => r.rows)
    .catch(() => pool
      .query(SQL.NEWS_COMMENTS_FLAT, [slug])
      .then((r: { rows: NewsComment[] }) => r.rows)
      .catch(() => []))
  const user = await getUser(await headers())
  return <NewsDetail row={row} comments={comments} loggedIn={!!user} />
}
