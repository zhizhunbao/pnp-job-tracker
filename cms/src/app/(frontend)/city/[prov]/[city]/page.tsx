/**
 * /city/[prov]/[city] 城市详情页(SSR;2026-09-12 批三首件)—— 可分享 URL + SEO 落地页,
 * 数据全在库零新抓取(cities 维度 + stats_city 快照 + dli 名单 + 试点表)。
 * 查无城走 View 内 Notice 不 404(已收录 URL 保留可访问);无在招岗 = 薄页不进新收录。
 * 门形照 companies/[slug] 样张:取参 + 取数 + 拼壳,门里没有函数体。
 *
 * @author Frank
 * @time 2026-09-12 02:50:00
 */
import { headers } from 'next/headers'

import { City } from '@/components/city'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { getDb } from '@/lib/db/server'
import { SITE_FALLBACK } from '@/lib/jobs'
import { checkedAt } from '@/lib/jobs/server'
import { getUser } from '@/lib/quota/server'
import { loadCityDetail, loadCityDliList, loadCityPilotTypes } from '@/lib/stats/server'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || SITE_FALLBACK).replace(/\/$/, '')

/**
 * 城市页的 SEO 头:标题带省码,描述带在招与人口。
 * robots 口径同公司页:无在招岗 = 薄页,不进新收录。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题、描述、canonical 与 robots;查无城只给标题并禁收录。
 */
export async function generateMetadata({ params }: { params: Promise<{ prov: string; city: string }> }) {
  const { prov, city } = await params
  const name = decodeURIComponent(city)
  const code = decodeURIComponent(prov).toUpperCase()
  const c = await loadCityDetail({ db: await getDb(), city: name, province: code })
  if (!c) return { title: 'City not found | Offer2PR', robots: { index: false } }
  const title = `${c.city}, ${c.province} — jobs, wages & immigration | Offer2PR`
  const description = `${c.city}, ${c.province}: ${c.openJobs ?? 0} open jobs, median wage, population, unemployment and immigration channels (AIP / RCIP / FCIP). ${c.city} 就业与移民数据。`
  return {
    title, description,
    alternates: { canonical: `${SITE}/city/${encodeURIComponent(c.province)}/${encodeURIComponent(c.city)}` },
    robots: c.openJobs == null || c.openJobs === 0 ? { index: false } : undefined,
  }
}

/**
 * 城市详情页的门:取参 + 三路取数 + 拼壳与正文。
 * 查无城(拼错 / 维度表外)给最小基面走 View 的 Notice。
 *
 * @param props Next 传进来的路由段。
 * @returns 整页。
 */
export default async function CityDetailPage({ params }: { params: Promise<{ prov: string; city: string }> }) {
  const { prov, city } = await params
  const name = decodeURIComponent(city)
  const code = decodeURIComponent(prov).toUpperCase()
  const detail = await loadCityDetail({ db: await getDb(), city: name, province: code })
  const user = await getUser(await headers())
  const updatedAt = await checkedAt(await getDb())

  if (!detail) {
    return <Frame>
      <Header loggedIn={!!user} />
      <City city={{
        city: name, cityZh: '', cityKo: '', province: code,
        population: null, unempRate: null,
        openJobs: null, new7d: null, medianWageAnnual: null, aipJobs: null, groups: [],
      }} schools={[]} pilotTypes={[]} missing updatedAt={updatedAt} />
      <Footer />
    </Frame>
  }

  const schools = await loadCityDliList({ db: await getDb(), city: name, province: code })
  const pilotTypes = await loadCityPilotTypes({ db: await getDb(), city: name, province: code })

  return <Frame>
    <Header loggedIn={!!user} />
    <City city={detail} schools={schools} pilotTypes={pilotTypes} missing={false} updatedAt={updatedAt} />
    <Footer />
  </Frame>
}
