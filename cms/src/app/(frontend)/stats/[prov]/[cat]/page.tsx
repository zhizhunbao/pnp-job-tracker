// 省×大类统计详情页(E5-04):指标卡 + 通道/城市 + citation + 职位板入口(预设筛选)。
import { notFound } from 'next/navigation'
import { loadStats, loadStatSources } from '../../lib'
import { StatsCatView } from '../../views'
import { BROAD_EN, PROV_NAME, slugToBroad } from '../../shared'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ prov: string; cat: string }> }) {
  const { prov, cat } = await params
  const p = prov.toUpperCase()
  const broad = slugToBroad(cat)
  if (!PROV_NAME[p] || !broad) return {}
  const en = BROAD_EN[broad] || broad
  return {
    title: `${en} jobs in ${PROV_NAME[p]} — wages & PNP streams | PNP Job Tracker`,
    description: `${PROV_NAME[p]} ${en}: open jobs, 7-day new postings, median wage (ESDC), provincial named streams, AIP. Updated daily. ${PROV_NAME[p]} ${broad}类职位统计,每日更新。`,
  }
}

export default async function StatsCatPage({ params }: { params: Promise<{ prov: string; cat: string }> }) {
  const { prov, cat } = await params
  const p = prov.toUpperCase()
  const broad = slugToBroad(cat)
  if (!PROV_NAME[p] || !broad) notFound()
  const rows = await loadStats(`WHERE province = $1 AND broad = $2`, [p, broad])
  if (!rows.length) notFound()
  const srcs = await loadStatSources()
  return <StatsCatView prov={p} row={rows[0]} srcs={srcs} catSlug={cat} />
}
