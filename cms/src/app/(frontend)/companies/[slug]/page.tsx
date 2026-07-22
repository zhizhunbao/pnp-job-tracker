// E8-09 B 件:/companies/[slug] 公司详情页(SSR)——可分享 URL + SEO 落地页(Organization JSON-LD + sitemap)。
// 数据全在库零新抓取(companies 行 + 该司在招岗聚合);查无公司走 View 内 Notice 不 404(slug 可能因岗全下线而空)。
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'
import { fetchCompanyBySlug } from '@/lib/jobsSql'
import CompanyDetailView from './CompanyDetailView'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

async function loadCompany(slug: string) {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  return fetchCompanyBySlug(pool, slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await loadCompany(slug)
  if (!c) return { title: 'Company not found | Offer2PR', robots: { index: false } }
  const loc = [c.address, c.province].filter(Boolean).join(', ')
  const title = `${c.name}${loc ? ` — ${loc}` : ''} | Offer2PR`
  const description = `${c.name}${c.industry ? ` (${c.industry})` : ''}${c.openCount ? ` — ${c.openCount} open positions` : ''}. Employer immigration signals: LMIA sponsorship record, hiring activity, wage level. 加拿大雇主画像与担保记录。`
  return {
    title, description,
    alternates: { canonical: `${SITE}/companies/${slug}` },
    robots: c.openCount === 0 ? { index: false } : undefined,   // 无在招岗=薄页,不进新收录
  }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = await loadCompany(slug)
  const user = await getUser(await headers())

  if (!company) {
    // slug 拼错/公司被清:给个最小壳走 View 的 Notice(不 404 —— 已收录 slug 保留可访问)
    return <CompanyDetailView company={{
      name: slug, slug, website: '', websiteSource: '', industry: '', sectors: '', aliasZh: '', aliasKo: '',
      wikiUrl: '', sponsorGrade: null, scoreDetail: null, aiBrief: '', aiWebsite: '', aiSources: [], aiFetched: '',
      description: '', address: '', province: '', openCount: 0, jobs: [],
    }} loggedIn={!!user} />
  }

  // Organization JSON-LD(公开事实层;缺值不编)
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: company.name,
    ...(company.website ? { url: company.website } : {}),
    ...(company.wikiUrl ? { sameAs: company.wikiUrl } : {}),
    ...(company.address || company.province ? { address: { '@type': 'PostalAddress', ...(company.address ? { streetAddress: company.address } : {}), ...(company.province ? { addressRegion: company.province } : {}), addressCountry: 'CA' } } : {}),
  }

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <CompanyDetailView company={company} loggedIn={!!user} />
  </>
}
