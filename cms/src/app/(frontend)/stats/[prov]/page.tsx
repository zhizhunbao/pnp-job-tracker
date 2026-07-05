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
  return <StatsProvView prov={p} rows={rows} srcs={srcs} />
}
