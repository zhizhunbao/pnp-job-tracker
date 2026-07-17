// 省份索引页(E5-04;E8-06 图表化后传全量行——图表要大类维度,省卡在组件内自 filter)。
import { loadStats, loadStatSources } from './lib'
import { StatsIndexView } from './views'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Canadian jobs by province — immigration-lens statistics | Offer2PR',
    description: 'Open jobs, median wages (ESDC), provincial named-stream hits and AIP jobs by province, updated daily. 按省查看在招职位/中位薪资/省提名通道命中,每日更新。',
  }
}

export default async function StatsIndexPage() {
  const rows = await loadStats()
  const srcs = await loadStatSources()
  return <StatsIndexView rows={rows} srcs={srcs} />
}
