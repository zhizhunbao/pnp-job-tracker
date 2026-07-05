// 省份索引页(E5-04):各省汇总卡(broad='all')→ 点进省页。
import { loadStats, loadStatSources } from './lib'
import { StatsIndexView } from './views'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: 'Canadian jobs by province — immigration-lens statistics | PNP Job Tracker',
    description: 'Open jobs, median wages (ESDC), provincial named-stream hits and AIP jobs by province, updated daily. 按省查看在招职位/中位薪资/省提名通道命中,每日更新。',
  }
}

export default async function StatsIndexPage() {
  const rows = await loadStats(`WHERE broad = 'all'`)
  const srcs = await loadStatSources()
  return <StatsIndexView rows={rows} srcs={srcs} />
}
