// 省级统计页(E5-04):汇总指标 + 按大类表格(链去 /stats/[prov]/[cat])。
import { notFound } from 'next/navigation'
import { loadStats, loadStatSources } from '../lib'
import { StatsProvView } from '../views'
import { PROV_NAME } from '../shared'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ prov: string }> }) {
  const { prov } = await params
  const p = prov.toUpperCase()
  const name = PROV_NAME[p]
  if (!name) return {}
  return {
    title: `${name} jobs & immigration statistics — open jobs, wages, PNP streams | PNP Job Tracker`,
    description: `${name} (${p}): open jobs by occupation group, median wages (ESDC), provincial named-stream hits, AIP jobs. Updated daily. ${name} 在招职位/中位薪资/省提名通道统计,每日更新。`,
  }
}

export default async function StatsProvPage({ params }: { params: Promise<{ prov: string }> }) {
  const { prov } = await params
  const p = prov.toUpperCase()
  if (!PROV_NAME[p]) notFound()
  const rows = await loadStats(`WHERE province = $1`, [p])
  if (!rows.length) notFound()
  const srcs = await loadStatSources()
  // 全国排名(第 5 轮 #19):P3 用户要结论不是数字——「该省在招全国第 X」是免费级答案,也是跨省对比(Pro)的钩子
  const allProv = await loadStats(`WHERE broad = 'all'`)
  const cur = rows.find((r) => r.broad === 'all')
  const rankBy = (get: (r: (typeof allProv)[number]) => number | null) => {
    const mine = cur ? get(cur) : null
    if (mine == null) return null
    return 1 + allProv.filter((r) => (get(r) ?? -Infinity) > mine).length
  }
  const ranks = { open: rankBy((r) => r.openJobs), wage: rankBy((r) => r.medianWageAnnual), total: allProv.length }
  return <StatsProvView prov={p} rows={rows} srcs={srcs} ranks={ranks} />
}
