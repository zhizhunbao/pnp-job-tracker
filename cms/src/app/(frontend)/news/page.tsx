// 移民动态(E12-06 v3 门户形态):SSR 直读 news 表。
// banner=TOP5 重要新闻轮播(importance 驱动,带中文速读);列表只带卡片字段;评论数=approved 聚合。
// 护栏:任一查询失败 → 对应块留空(宁可留空,页面不 500;comments 表未建时同理)。
import { getPayload } from 'payload'
import config from '@/payload.config'
import { News } from './News'
import type { NewsCard, NewsHero } from './shared'
import { SQL } from '@/lib/db'   // SQL 文本全在那儿,本文件只管取数与组装

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canada immigration news — official IRCC & provincial PNP updates | Offer2PR',
  description:
    'Latest official immigration announcements from IRCC and 7 provincial nominee programs (BC, AB, SK, MB, ON, QC, NS), aggregated with sources and dates. Refreshed every 12 hours. 加拿大移民最新政策动态:联邦 IRCC 与 7 省官方发布聚合,注明出处与日期,每 12 小时刷新。',
}

export default async function NewsPage() {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  // excerpt=mart 清洗产物(P1c);importance=AI 重要度(P1d,徽标+只看重要)
  const itemsP = pool
    .query(SQL.NEWS_LIST)
    .then((r: { rows: NewsCard[] }) => r.rows.map((n) => ({ ...n, importance: n.importance == null ? null : Number(n.importance) })))
    .catch(() => [])
  // banner TOP5(v3 拍板):重要度降序、同分新的在前;摘要用中文速读(summaryZh,EN/KO 界面退 excerpt)
  const heroP = pool
    .query(SQL.NEWS_LIST_REGION)
    .then((r: { rows: NewsHero[] }) => r.rows.map((n) => ({ ...n, importance: Number(n.importance) })))
    .catch(() => [])
  // 评论数(approved 才计;comments 表未建/空 → 全 0)
  const cmtP = pool
    .query(SQL.NEWS_COMMENT_COUNTS)
    .then((r: { rows: { slug: string; n: number }[] }) => Object.fromEntries(r.rows.map((x) => [x.slug, x.n])))
    .catch(() => ({}))
  const [items, hero, cmtCounts] = await Promise.all([itemsP, heroP, cmtP])
  return <News items={items} hero={hero} cmtCounts={cmtCounts} />
}
