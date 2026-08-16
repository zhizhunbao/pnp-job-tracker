// 在招雇主页(2026-08-16 Frank「其他的查雇主按钮呢?」):普通省提名没有「指定雇主」这回事,
// 对它们有意义的雇主视图 = 这个省正在招这个职业的雇主 —— 数据来自本站每日职位库(不是官方名录)。
// 与 /employers/designated 共用同一套版式,只是口径与列名不同(那边第三列是制度,这边是在招岗数)。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchHiringEmployers } from '@/lib/designatedEmployers'
import { ssrLang } from '@/lib/lang.server'
import { makeT } from '../../jobs/i18n'
import { DesignatedEmployersView } from '../designated/DesignatedEmployersView'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ prov?: string; noc?: string }> }) {
  const sp = await searchParams
  const prov = /^[A-Z]{2}$/.test(String(sp.prov ?? '')) ? String(sp.prov) : ''
  return {
    title: `${prov ? prov + ' ' : ''}Employers hiring now | Offer2PR`,
    description: 'Employers with open postings for this occupation in this province, from our daily job crawl. 该省该职业正在招人的雇主,来自本站每日抓取的职位库。',
  }
}

export default async function HiringEmployersPage({ searchParams }: {
  searchParams: Promise<{ prov?: string; noc?: string }>
}) {
  const sp = await searchParams
  const province = /^[A-Z]{2}$/.test(String(sp.prov ?? '')) ? String(sp.prov) : ''
  const noc = /^\d{5}$/.test(String(sp.noc ?? '')) ? String(sp.noc) : ''
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: Parameters<typeof fetchHiringEmployers>[0] }).pool
  const rows = pool && province && noc ? await fetchHiringEmployers(pool, { province, noc }) : []
  const t = makeT(await ssrLang())
  const title = [province ? t('pr.' + province) : '', t('de.hiringTitle')].filter(Boolean).join(' ')
  return (
    <DesignatedEmployersView
      rows={rows.map((r) => ({ name: r.name, where: r.location || (province ? t('pr.' + province) : ''), tag: t('dp.planJobsN', { n: r.openJobs }) }))}
      title={title} colTag={t('dp.planOpen')} empty={t('de.hiringEmpty')} backHref="/plan/pr" />
  )
}
