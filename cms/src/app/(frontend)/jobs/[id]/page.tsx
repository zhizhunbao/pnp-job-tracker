// E8-07 A 件:/jobs/[id] 独立职位详情页(SSR)——单栏内容骨架(内容站模式借鉴批,2026-07-20 Frank 拍板)。
// 定位:可分享 URL + SEO 落地页(JobPosting JSON-LD + sitemap 分片)+ 手机端主阅读形态;桌面弹框体系照旧。
// 分层口径与主表完全一致:fetchJobById 同一列集/映射,Pro 列免费剥离在 SELECT 映射层;closed 岗保留可访问(已收录不 404)。
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_MATCH_JOBS_PER_DAY } from '@/lib/plan'
import { normalizeProfile, hasProfile } from '@/lib/match'
import { fetchJobById, fetchRelatedJobs, mapPnpOcc, mapEeCat } from '@/lib/jobsSql'
import JobDetailView from './JobDetailView'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')
const ATLANTIC = new Set(['NL', 'NB', 'NS', 'PE'])

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
  const profile = normalizeProfile((user as any)?.profile)
  const profileOk = hasProfile(profile)

  // 维度先行:matchDims 是 fetchJobById 算匹配级的输入(全量口径与 page.tsx 一致)
  const [pnpDocs, eeDocs] = await Promise.all([
    payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
    payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
  ])
  const pnpOccAll = pnpDocs.docs.map(mapPnpOcc)
  const eeOcc = eeDocs.docs.map(mapEeCat)

  const job = await fetchJobById(pool, id, { pro, profile, profileOk, matchDims: { pnpOccupations: pnpOccAll, eeCategories: eeOcc } })
  if (!job) notFound()

  // 页面维度:PNP 清单/抽选/新闻按本省收窄;AIP 指定名单只在大西洋四省才拉;NOC 官方职责只取本岗一行
  const [drawDocs, fieldSrcDocs, nocDescDocs, desigDocs, newsRows, related, cityRow] = await Promise.all([
    payload.find({ collection: 'pnp-draws', limit: 200, depth: 0, sort: '-drawDate' }),
    payload.find({ collection: 'field-sources', limit: 200, depth: 0 }),
    // Frank(#173):「我的 NOC」也要显示官方职业名(雇主写的岗位名可能不规范,NOC 名是锚)——
    // 原先只查本岗一行,档案 NOC 在「对我意味着什么」里裸奔;把档案职业一并查出
    (() => { const nocs = [...new Set([job.noc, ...(profileOk ? profile.nocCodes : [])].filter(Boolean))] as string[]
      return nocs.length ? payload.find({ collection: 'noc-descriptions', limit: 20, depth: 0, where: { noc: { in: nocs } } }) : Promise.resolve({ docs: [] as any[] }) })(),
    ATLANTIC.has(job.province) ? payload.find({ collection: 'designated-employers', limit: 5000, depth: 0, where: { province: { equals: job.province } } }) : { docs: [] },
    job.province
      ? pool.query(`SELECT region, title, date, slug FROM news WHERE region = $1 ORDER BY date DESC, id ASC LIMIT 4`, [job.province])
        .then((r: any) => r.rows).catch(() => [])
      : [],
    fetchRelatedJobs(pool, job),
    // #151:本岗城市的通行译名(只查这一行;无通行译名的小镇=空,前端只显英文)
    job.city
      ? pool.query(`SELECT name_zh, name_ko FROM cities WHERE name = $1 AND province = $2 LIMIT 1`, [job.city, job.province || ''])
        .then((r: any) => r.rows[0] || {}).catch(() => ({}))
      : {},
  ])

  const dims = {
    pnpOcc: pnpOccAll.filter((o) => o.province === job.province),
    pnpDraws: drawDocs.docs
      .map((r: any) => ({ province: r.province, kind: r.kind, drawDate: r.drawDate ?? '', stream: r.stream ?? '', score: typeof r.score === 'number' ? r.score : null, scale: r.scale ?? '', invitations: typeof r.invitations === 'number' ? r.invitations : null, note: r.note ?? '', label: r.label ?? '', url: r.url ?? '', fetched: r.fetched ?? '' }))
      // #135:本省抽选 + 联邦 EE 历次(province=FED,EE 节展开时间线用);其余省份的行不带(页面用不上)
      .filter((d: any) => d.province === job.province || d.province === 'FED'),
    eeOcc,
    desigEmp: desigDocs.docs.map((r: any) => ({ name: r.name, province: r.province, location: r.location ?? '', isTech: !!r.isTech })),
    nocDesc: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', titleZh: r.titleZh ?? '', titleKo: r.titleKo ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
    fieldSources: fieldSrcDocs.docs.map((r: any) => ({ field: r.field ?? '', kind: r.kind ?? '', publisher: r.publisher ?? '', url: r.url ?? '', title: r.title ?? '', description: r.description ?? '', status: r.status ?? '', fetched: r.fetched ?? '', note: r.note ?? '' })),
    news: newsRows as { region: string; title: string; date: string; slug: string }[],
    cityZh: (cityRow as any)?.name_zh || '',
    cityKo: (cityRow as any)?.name_ko || '',
  }

  const plan = {
    isPro: pro, loggedIn: !!user, profileOk, profile: profileOk ? profile : null,
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
    <JobDetailView job={job} plan={plan} dims={dims} related={related} />
  </>
}
