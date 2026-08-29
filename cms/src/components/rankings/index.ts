/**
 * rankings 页面域的桶 —— /rankings/[slug] 榜单页(一块视图,列表页只做重定向)。
 * 2026-08-26 自 app/(frontend)/rankings/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-28 换装批整体重写成小写件形制:
 * 内联样式逐格迁 rankings.module.css、洗行与派生进 functions.ts、死值进 constants.ts、
 * props 契约进 types.ts,壳件(整页外框 / 顶栏 / 页脚)拼装归页面门(样张 companies)。
 * 门里露三样:正文 Ranking、这一页的 SEO 主体 rankingMetaOf(Next 的 generateMetadata
 * 要一个函数,门里不许有函数体,所以在这边写好交出去)、以及门要判的两个死值
 * (下架榜的 slug 与它的去处 —— tsx 顶层不许住常量)。
 * 对应 lib 域:lib/rankings(loadRankingRows / loadRankingSlugs 与 slug 白名单)。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
export { SLUG_SPONSOR, URL_SPONSOR_GONE, URL_WEEKLY_TOP } from './constants'
export { rankingMetaOf } from './functions'
export { Ranking } from './ranking'
