/**
 * stats 页面域的桶 —— 地区统计的共享件:统计主图 MarketChart 与它的取数钩子,
 * 以及历史沿承的 useLang 再导出(news 那一处按名引它,原样保留)。
 * 2026-08-26 自 app/(frontend)/stats/ 整体迁入 —— 那个目录本来就没有 page.tsx
 * (2026-08-19 索引页退役后只剩共享件),搬完随之删除。
 * 对应 lib 域:lib/stats。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { MarketChart, useMarketStats } from './charts'
export { useLang } from './ui'
