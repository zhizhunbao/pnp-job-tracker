/**
 * stats 页面域的桶 —— 就业把脉统计主图 MarketChart 与它的取数钩子。
 * 2026-08-26 自 app/(frontend)/stats/ 整体迁入 —— 那个目录本来就没有 page.tsx
 * (2026-08-19 索引页退役后只剩共享件),搬完随之删除。
 * 2026-08-28 换装批整体重写成小写件形制:charts.tsx 拆成 marketchart / marketcontrols /
 * marketfilters / marketcanvas / marketselect / echart 六件 + hooks / functions /
 * constants / types 四抽屉,内联样式逐格迁 stats.module.css。对外只有下面两个名字,
 * 形状一格没动(/start 的 Pulse 是唯一消费者)。
 * 同日删死件 ui.tsx:StatsShell / MetricCards / CaliberLine 三件随 2026-08-19 /stats
 * 索引页退役后全站零消费者(grep 复核过),连同它对 useLang 的再导出一并撤 ——
 * 语言钩子的家在 components/i18n,要用的从那里取。
 * 对应 lib 域:lib/stats。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
export { MarketChart } from './marketchart'
export { useMarketStats } from './hooks'
export type { ChannelNocs, MarketChartIn, MarketData } from './types'
