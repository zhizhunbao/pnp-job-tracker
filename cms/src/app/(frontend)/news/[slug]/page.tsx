/**
 * 移民动态详情页(E12-06 v3)的门:官方英文原文直贴 + ©四件套 + 逐段中文对照 +
 * 评论区(登录可评,审核后显示)。
 * SEO:每篇 = 独立落地页,标题带官方原标题;正文 SSR 全文可索引。
 * schema 容错(P1f 事故教训:引用未建列把全部详情页打成 404):summary_en 缺列时退回
 * NULL 版,DDL 到位自动启用。
 * 评论(v3):approved 才公开;comments 表未建/查询失败 → 空列表照常渲。登录态给表单
 * 分流(未登录 = 去登录)。F 件(E8-07):带楼中楼/置顶/官方标(official = admin 号发的);
 * 统一 created_at ASC,楼序在组件里排(顶层 = 置顶先、再时间倒序;楼内回复保持时间正序)。
 * parent_id/pinned 列缺(DDL 未跑)时回退老查询。
 * SQL 文本全在 lib/db 的 SQL 里,本文件只管取数与拼装。
 * 2026-08-27 换装批:壳件拼装收进门里(样张 account)—— 整页外框走 shell 桶的 Frame,
 * 顶栏与页脚在这里拼,NewsDetail 只出 Shell 轨往下的视图(原 NewsShell 随之撤编);
 * 同批 `NewsRow` 按三段律更名 `NewsDbRow`(它是 newsBySlug 那条 SQL 的原始行)。
 * 2026-08-29 清闸批:原门里的 `loadRow` 与评论那两发查询下沉 components/news 的 functions
 * (`loadNewsRow` / `loadNewsComments`,方案 A 注入连接池)—— 上面两段 schema 容错与评论
 * 回退的口径原样搬进那两个函数的 JSDoc,一字未改;门里只剩取参、取池、装配与拼组件。
 *
 * @author Frank
 * @time 2026-07-18 00:00:00
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/quota/server'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { META_DESC_LEN_MAX, NewsDetail, loadNewsComments, loadNewsRow, regionNameOf } from '@/components/news'
import { Frame } from '@/components/shell'
import { dbOf } from '@/lib/db/server'

export const dynamic = 'force-dynamic'

/**
 * 每篇独立落地页的标题与描述(标题带官方原标题与发布机关)。
 *
 * @param props 路由参数。
 * @returns 页面元数据;查不到给空对象(不编标题)。
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const row = await loadNewsRow({ db: dbOf(await getPayload({ config: await config })), slug })
  if (!row) return {}
  const who = row.region === 'federal' ? 'IRCC' : `${regionNameOf({ region: row.region })} PNP`
  return {
    title: `${row.title} — ${who} ${row.date} | Offer2PR`,
    description: `${(row.bodyEn || '').replace(/\s+/g, ' ').slice(0, META_DESC_LEN_MAX)}…`,
  }
}

/**
 * 动态详情页的门:取库行与评论 + 大写组件的拼装,没有别的。
 *
 * @param props 路由参数。
 * @returns 整页。
 */
export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })
  const db = dbOf(payload)
  const row = await loadNewsRow({ db, slug })
  if (!row) notFound()
  const comments = await loadNewsComments({ db, slug })
  const user = await getUser(await headers())
  return (
    <Frame>
      <Header active="news" />
      <NewsDetail row={row} comments={comments} loggedIn={!!user} />
      <Footer />
    </Frame>
  )
}
