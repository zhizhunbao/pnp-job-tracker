/**
 * 榜单页(E5-02,PRD F8)的门:取路由段 → 白名单先验 → getDb 注入取数 → 拼组件。
 * 零前端计算 —— 只 SELECT rankings 表渲染(计算在 etl/10_build_rankings.py);
 * 行只含事实字段 + 官方链接(E4-03 约束);SEO 主体 = generateMetadata,它的本体在
 * components/rankings 的 functions.ts(门里不许有函数体,闸 page-no-logic)。
 * B2:sponsor-likely 曾并入 /employers;货架页 2026-08-08 下架 → 直指把脉页橱窗
 * (避免 308 双跳)。
 * 2026-08-28 换装批:排版全部下沉进 components/rankings/,壳件(整页外框 Frame /
 * 顶栏 / 页脚)拼装收回本门(Frank「组装只许在 (frontend) 页面门里」,样张 companies)。
 * 顶栏走全站共享 Header(2026-07-11 用户指出子页 header 与 /jobs 样式不一致后统一),
 * 高亮键 rank。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { notFound, permanentRedirect } from 'next/navigation'
import { getDb } from '@/lib/db/server'
import { RANKING_SLUGS } from '@/lib/rankings'
import { loadRankingRows, loadRankingSlugs } from '@/lib/rankings/server'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Ranking, SLUG_SPONSOR, URL_SPONSOR_GONE, rankingMetaOf } from '@/components/rankings'
import { Frame } from '@/components/shell'

export const dynamic = 'force-dynamic'

export const generateMetadata = rankingMetaOf

/**
 * 榜单页的门:白名单先验 + 取这一榜的行与当天有数据的榜,没有别的。
 *
 * @param props Next 传进来的路由段。
 * @returns 整页。
 */
export default async function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === SLUG_SPONSOR) {
    permanentRedirect(URL_SPONSOR_GONE)
  }
  if (RANKING_SLUGS.has(slug) === false) {
    notFound()
  }
  const db = await getDb()
  const [items, slugs] = await Promise.all([loadRankingRows({ db, slug }), loadRankingSlugs(db)])
  return (
    <Frame>
      <Header active="rank" />
      <Ranking slug={slug} items={items} slugs={slugs} />
      <Footer />
    </Frame>
  )
}
