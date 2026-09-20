/**
 * E8-09 B 件:/companies/[slug] 公司详情页(SSR)——可分享 URL + SEO 落地页
 * (Organization JSON-LD + sitemap)。
 * 数据全在库零新抓取(companies 行 + 该司在招岗聚合);查无公司走 View 内 Notice 不 404
 * (slug 可能因岗全下线而空)。
 * 2026-08-29 页面规范化批收成标准形:取池改 lib/db 的 getDb 一行注入(原页内 loadCompany
 * 包装退役 —— 它的体与 getDb 逐字同义)、相似雇主的失败兜底由 `.catch` 箭头改 try/catch、
 * JSON-LD 拼装下沉进 lib/jobs 的 companyJsonOf、脚本壳走通用件 JsonLd(08-29 收拢)
 * (门里不许有函数体、不许有裸标签)。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:页上点在招职位叠开职位描述弹框,弹框要分层态 ——
 * 照职位详情页的门同法现算一份(user 本来就在手上,零额外查询)递给正文。
 *
 * @author Frank
 * @time 2026-08-29 09:10:00
 */
import { headers } from 'next/headers'

import { Company } from '@/components/companies'
import { JsonLd } from '@/components/jsonld'
import { Footer } from '@/components/footer'
import { toJobPlan } from '@/components/jobs'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { getDb } from '@/lib/db/server'
import { hasProfile, normalizeProfile, SITE_FALLBACK, type ProfileJson } from '@/lib/jobs'
import { checkedAt, companyJsonOf, loadCompanyBySlug, loadSimilarEmployers } from '@/lib/jobs/server'
import { getUser, isPro } from '@/lib/quota/server'
import type { SessionUser } from '@/components/jobs'
import type { SimilarEmployer } from '@/lib/jobs/server'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || SITE_FALLBACK).replace(/\/$/, '')

/**
 * 公司页的 SEO 头:标题带地点、描述带行业与在招数。
 * robots 那一格的口径:无在招岗=薄页,不进新收录。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题、描述、canonical 与 robots;查无公司只给标题并禁收录。
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await loadCompanyBySlug({ db: await getDb(), slug })
  if (!c) return { title: 'Company not found | Offer2PR', robots: { index: false } }
  const loc = [c.address, c.province].filter(Boolean).join(', ')
  const title = `${c.name}${loc ? ` — ${loc}` : ''} | Offer2PR`
  const description = `${c.name}${c.industry ? ` (${c.industry})` : ''}${c.openCount ? ` — ${c.openCount} open positions` : ''}. Employer immigration signals: LMIA sponsorship record, hiring activity, wage level. 加拿大雇主画像与担保记录。`
  return {
    title, description,
    alternates: { canonical: `${SITE}/companies/${slug}` },
    robots: c.openCount === 0 ? { index: false } : undefined,
  }
}

/**
 * 公司详情页的门:取参 + 一行装配 + 拼壳与正文。
 * 查无公司(slug 拼错 / 公司被清)时给个最小壳走 View 的 Notice
 * (不 404 —— 已收录 slug 保留可访问)。
 * 相似雇主是同省同行业的旁参,失败不拦页面。
 *
 * @param props Next 传进来的路由段。
 * @returns 整页。
 */
export default async function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = await loadCompanyBySlug({ db: await getDb(), slug })
  const user = await getUser(await headers())
  const updatedAt = await checkedAt(await getDb())
  const profile = normalizeProfile(user?.profile as ProfileJson | null)
  const plan = toJobPlan({
    user: user as SessionUser | null, pro: isPro(user), profile, profileOk: hasProfile(profile),
  })

  if (!company) {
    return <Frame>
      <Header loggedIn={!!user} />
      <Company company={{
        name: slug, slug, website: '', websiteSource: '', careersUrl: '', hq: '', hqSource: '', industry: '', sectors: '', aliasZh: '', aliasKo: '',
        wikiUrl: '', sponsorGrade: null, scoreDetail: null, aiBrief: '', aiWebsite: '', aiSources: [], aiFetched: '',
        description: '', address: '', province: '',
        lmiaPositions: null, lmiaLmias: null, lmiaLastQuarter: '', lmiaStreams: '', lmiaSkilled: null,
        lmiaNocs: [], designatedPrograms: [], designatedProvinces: [], openCount: 0, jobs: [],
      }} updatedAt={updatedAt} plan={plan} />
      <Footer />
    </Frame>
  }

  let similar: SimilarEmployer[] = []
  try {
    similar = await loadSimilarEmployers({
      db: await getDb(), province: company.province, industry: company.industry, excludeSlug: company.slug,
    })
  } catch {
    similar = []
  }

  return <>
    <JsonLd json={companyJsonOf({ company })} />
    <Frame>
      <Header loggedIn={!!user} />
      <Company company={company} similar={similar} updatedAt={updatedAt} plan={plan} />
      <Footer />
    </Frame>
  </>
}
