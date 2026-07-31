// 省份索引页(E5-04;E8-06 图表化后传全量行——图表要大类维度,省卡在组件内自 filter)。
import { loadProvExtra, loadStats, loadStatSources } from './lib'
import { StatsIndexView } from './views'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Canadian jobs by province — immigration-lens statistics | Offer2PR',
    description: 'Open jobs, median wages (ESDC), provincial named-stream hits and AIP jobs by province, updated daily. 按省查看在招职位/中位薪资/省提名通道命中,每日更新。',
  }
}

export default async function StatsIndexPage() {
  const rows = await loadStats('', [], { withMid: true })  // 图表下钻 L2 要中类行;省卡/表格在组件内自 filter
  const srcs = await loadStatSources()
  // E8-14 主图的 occ/city/channels 不再 SSR 直出(occ ~3400 行占 HTML 大头),
  // StatsIndexView 挂载后拉 /api/market-stats(与 /start 同一端点同一缓存);rows 省卡/SEO 要用,照旧 SSR
  const provExtra = await loadProvExtra()   // 批B(#133):省卡 IRCC 体量+难度
  return <StatsIndexView rows={rows} srcs={srcs} provExtra={provExtra} />
}
