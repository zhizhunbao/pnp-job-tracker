// E8-07 A 件:/jobs/[id] 独立职位详情页(SSR)——单栏内容骨架(内容站模式借鉴批,2026-07-20 Frank 拍板)。
// 定位:可分享 URL + SEO 落地页(JobPosting JSON-LD + sitemap 分片)+ 手机端主阅读形态;桌面弹框体系照旧。
// 分层口径与主表完全一致:fetchJobById 同一列集/映射,Pro 列免费剥离在 SELECT 映射层;closed 岗保留可访问(已收录不 404)。
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_MATCH_JOBS_PER_DAY } from '@/lib/plan'
import { hasProfile, normalizeProfile } from '@/lib/match'
import { fetchJobById } from '@/lib/jobsSql'
import JobDetailView from './JobDetailView'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

// metadata 用瘦查询(不走分层管线;只取公开列)
async function fetchMetaRow(id: number) {
  if (!Number.isFinite(id)) return null
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const { rows } = await pool.query(
    `SELECT j.title, c.name AS company, j.city, j.province, j.salary_text, j.status FROM jobs j
     LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`, [id])
  return rows[0] || null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await fetchMetaRow(Number(id))
  if (!r) return { title: 'Job not found | Offer2PR' }
  const loc = [r.city, r.province].filter(Boolean).join(', ')
  const title = `${r.title}${r.company ? ` — ${r.company}` : ''}${loc ? ` | ${loc}` : ''} | Offer2PR`
  const description = `${r.title} at ${r.company || 'a Canadian employer'}${loc ? ` in ${loc}` : ''}.${r.salary_text ? ` ${r.salary_text}.` : ''} Immigration signals: PNP streams, EE categories, wage vs ESDC median. 加拿大职位与移民信号。`
  return {
    title, description,
    alternates: { canonical: `${SITE}/jobs/${id}` },
    robots: r.status === 'closed' ? { index: false } : undefined,   // closed 岗页面保留但不再让新收录
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) notFound()

  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const user = await getUser(await headers())
  const pro = isPro(user)

  // E8-11 B2:页面砍到只剩 JD(移民/匹配/相关职位/公司 meta 全移交弹框)→ 匹配级、PNP/EE/新闻/AIP 维度不再取。
  const job = await fetchJobById(pool, id, { pro, profile: normalizeProfile(null), profileOk: false, matchDims: { pnpOccupations: [], eeCategories: [] } })
  if (!job) notFound()

  // 唯一页面维度:本岗 NOC 官方职业名(职位名译名对照,Frank「job 名称也需要翻译」)
  const nocDescDocs = job.noc
    ? await payload.find({ collection: 'noc-descriptions', limit: 1, depth: 0, where: { noc: { equals: job.noc } } })
    : { docs: [] as any[] }
  const dims = {
    nocDesc: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', titleZh: r.titleZh ?? '', titleKo: r.titleKo ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
  }

  // dd24-#107:B2 瘦身时把 profile 硬置 null,投递栏(E9-04)上线后成了坑——详情页直入的已建档用户
  // 点投递被当无档案弹空白向导(填完还会覆盖真档案)。user 本来就在手上,传真实档案零额外查询。
  const userProfile = normalizeProfile((user as any)?.profile ?? null)
  const plan = {
    isPro: pro, loggedIn: !!user, profileOk: !!user && hasProfile(userProfile), profile: user ? userProfile : null,
    freeMatchCap: FREE_MATCH_JOBS_PER_DAY,
    email: (user as any)?.email ?? null, displayName: (user as any)?.displayName ?? null,
    avatar: (user as any)?.avatar ?? null, proUntil: String((user as any)?.proUntil || '').slice(0, 10),
  }

  // JobPosting JSON-LD(Google 求职富结果):只放公开事实,缺值不编(validThrough 仅 closed 岗给真实下架时间)
  const empType = job.employmentHours === 'part' ? 'PART_TIME'
    : job.employmentTerm && job.employmentTerm !== 'permanent' ? 'TEMPORARY'
    : job.employmentHours === 'full' ? 'FULL_TIME' : undefined
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'JobPosting',
    title: job.title,
    datePosted: (job.datePosted || '').slice(0, 10) || undefined,
    ...(job.status === 'closed' && job.closedAt ? { validThrough: job.closedAt.slice(0, 10) } : {}),
    ...(empType ? { employmentType: empType } : {}),
    hiringOrganization: job.company ? { '@type': 'Organization', name: job.company, ...(job.officialUrl ? { sameAs: job.officialUrl } : {}) } : undefined,
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', ...(job.city ? { addressLocality: job.city } : {}), ...(job.province ? { addressRegion: job.province } : {}), addressCountry: 'CA' } },
    ...(job.salaryAnnual != null ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'CAD', value: { '@type': 'QuantitativeValue', value: job.salaryAnnual, unitText: 'YEAR' } } } : {}),
    ...(job.applyUrl ? { url: job.applyUrl } : {}),
    description: `${job.title} — ${job.company || ''} (${[job.city, job.province].filter(Boolean).join(', ')})`,
  }

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <JobDetailView job={job} plan={plan} dims={dims} />
  </>
}
