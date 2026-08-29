/**
 * 移民动态列表页(E12-06 v3 门户形态)的门:SSR 直读 news 表 → 拼组件。
 * banner = TOP5 重要新闻轮播(importance 驱动,带中文速读);列表只带卡片字段;
 * 评论数 = approved 聚合。
 * 护栏:任一查询失败 → 对应块留空(宁可留空,页面不 500;comments 表未建时同理)。
 * SQL 文本全在 lib/db 的 SQL 里,本文件只管取数与拼装。
 * 2026-08-27 换装批:壳件拼装收进门里(Frank「组装只许在 (frontend) 页面门里」,
 * 样张 account)—— 整页外框走 shell 桶的通用件 Frame,顶栏与页脚在这里拼,
 * News 只出 Shell 轨往下的视图(原 NewsShell 随之撤编)。
 * 2026-08-29 清闸批:三条查询与它们的洗行下沉 components/news 的 functions
 * (`loadNewsCards` / `loadNewsHeroes` / `loadNewsCommentCounts`,方案 A 注入连接池)——
 * 门里只剩取池、并发装配与拼大写组件,护栏口径一字未改。
 *
 * @author Frank
 * @time 2026-07-18 00:00:00
 */
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { NEWS_META, News, loadNewsCards, loadNewsCommentCounts, loadNewsHeroes } from '@/components/news'
import { Frame } from '@/components/shell'
import { dbOf } from '@/lib/db/server'

export const dynamic = 'force-dynamic'

/**
 * 本页的 SEO 头(内容住桶 constants 的 NEWS_META,门里只一行转发 ——
 * 2026-08-29 Frank「框架导出的内容也一律来自桶」;导出名是框架定的,必须留在本文件)。
 */
export const metadata = NEWS_META

/**
 * 动态列表页的门:三条查询并发取数 + 大写组件的拼装,没有别的。
 *
 * @returns 整页。
 */
export default async function NewsPage() {
  const payload = await getPayload({ config: await config })
  const db = dbOf(payload)
  const [items, hero, cmtCounts] = await Promise.all([
    loadNewsCards({ db }),
    loadNewsHeroes({ db }),
    loadNewsCommentCounts({ db }),
  ])
  return (
    <Frame>
      <Header />
      <News items={items} hero={hero} cmtCounts={cmtCounts} />
      <Footer />
    </Frame>
  )
}
