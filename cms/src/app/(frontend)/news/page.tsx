/**
 * 移民动态列表页(E12-06 v3 门户形态)的门:SSR 直读 news 表 → 拼组件。
 * banner = TOP5 重要新闻轮播(importance 驱动,带中文速读);列表只带卡片字段;
 * 评论数 = approved 聚合。
 * 护栏:任一查询失败 → 对应块留空(宁可留空,页面不 500;comments 表未建时同理)。
 * SQL 文本全在 lib/db 的 SQL 里,本文件只管取数与拼装。
 * 2026-08-27 换装批:壳件拼装收进门里(Frank「组装只许在 (frontend) 页面门里」,
 * 样张 account)—— 整页外框走 shell 桶的通用件 Frame,顶栏与页脚在这里拼,
 * News 只出 Shell 轨往下的视图(原 NewsShell 随之撤编)。
 *
 * @author Frank
 * @time 2026-07-18 00:00:00
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { News } from '@/components/news'
import type { NewsCard, NewsHero } from '@/components/news'
import { Frame } from '@/components/shell'
import { SQL } from '@/lib/db'
import { dbOf } from '@/lib/db/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canada immigration news — official IRCC & provincial PNP updates | Offer2PR',
  description:
    'Latest official immigration announcements from IRCC and 7 provincial nominee programs (BC, AB, SK, MB, ON, QC, NS), aggregated with sources and dates. Refreshed every 12 hours. 加拿大移民最新政策动态:联邦 IRCC 与 7 省官方发布聚合,注明出处与日期,每 12 小时刷新。',
}

/**
 * 动态列表页的门:三条查询并发取数 + 大写组件的拼装,没有别的。
 *
 * @returns 整页。
 */
export default async function NewsPage() {
  const payload = await getPayload({ config: await config })
  const pool = dbOf(payload)
  const itemsP = pool
    .query(SQL.NEWS_LIST)
    .then((r: { rows: NewsCard[] }) => r.rows.map((n) => ({ ...n, importance: n.importance == null ? null : Number(n.importance) })))
    .catch(() => [])
  const heroP = pool
    .query(SQL.NEWS_LIST_REGION)
    .then((r: { rows: NewsHero[] }) => r.rows.map((n) => ({ ...n, importance: Number(n.importance) })))
    .catch(() => [])
  const cmtP = pool
    .query(SQL.NEWS_COMMENT_COUNTS)
    .then((r: { rows: { slug: string; n: number }[] }) => Object.fromEntries(r.rows.map((x) => [x.slug, x.n])))
    .catch(() => ({}))
  const [items, hero, cmtCounts] = await Promise.all([itemsP, heroP, cmtP])
  return (
    <Frame>
      <Header active="news" />
      <News items={items} hero={hero} cmtCounts={cmtCounts} />
      <Footer />
    </Frame>
  )
}
