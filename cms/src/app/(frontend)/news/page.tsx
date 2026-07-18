// 移民动态卡片流(E12-06 P1b):SSR 直读 news 表(近 60 条,ETL 滚动)。
// 列表只带卡片字段+正文前 300 字摘要——bodyEn 全文只在详情页下发。
// 护栏:news 表缺/查询失败 → 空列表照常渲(宁可留空,页面不 500;DDL 未到位时同理)。
import { getPayload } from 'payload'
import config from '@/payload.config'
import { NewsListView } from './NewsView'
import type { NewsCard } from './shared'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canada immigration news — official IRCC & provincial PNP updates | Offer2PR',
  description:
    'Latest official immigration announcements from IRCC and 7 provincial nominee programs (BC, AB, SK, MB, ON, QC, NS), aggregated with sources and dates. Refreshed every 12 hours. 加拿大移民最新政策动态:联邦 IRCC 与 7 省官方发布聚合,注明出处与日期,每 12 小时刷新。',
}

export default async function NewsPage() {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  // excerpt=mart 清洗产物(剥样板前缀/标题复读,P1c);importance=AI 重要度(P1d,徽标+只看重要)
  const items: NewsCard[] = await pool
    .query(`SELECT region, title, date, slug, og_image AS "ogImage", excerpt,
                   importance, importance_note AS "importanceNote"
            FROM news ORDER BY date DESC, id ASC LIMIT 60`)
    .then((r: { rows: NewsCard[] }) => r.rows.map((n) => ({ ...n, importance: n.importance == null ? null : Number(n.importance) })))
    .catch(() => [])
  return <NewsListView items={items} />
}
