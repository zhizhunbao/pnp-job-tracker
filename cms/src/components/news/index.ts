/**
 * news 页面域的桶 —— /news 新闻列表与 /news/[slug] 单条详情两块视图,
 * 外加两边共用的行形状与地区显示名。2026-08-26 自 app/(frontend)/news/ 整体迁入。
 * 对应 lib 域:lib/news。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { News, NewsDetail } from './News'
export { newsRegionName } from './shared'
export type { NewsCard, NewsComment, NewsHero, NewsRow } from './shared'
