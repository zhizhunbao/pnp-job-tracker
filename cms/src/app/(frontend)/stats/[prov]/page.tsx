// 省级统计页(E5-04):汇总指标 + 按大类表格(链去 /stats/[prov]/[cat])。
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
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
    title: `${name} jobs & immigration statistics — open jobs, wages, PNP streams | Offer2PR`,
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
  // 该省移民动态(E12-06):近 3 条官方新闻瘦行;表缺/查询失败 → 不出块(宁可留空,页面不 500)
  const payload = await getPayload({ config: await config })
  const news: { title: string; date: string; slug: string }[] = await (payload.db as any).pool
    .query(`SELECT title, date, slug FROM news WHERE region = $1 ORDER BY date DESC, id ASC LIMIT 3`, [p])
    .then((r: any) => r.rows)
    .catch(() => [])
  return <StatsProvView prov={p} rows={rows} srcs={srcs} ranks={ranks} news={news} />
}
