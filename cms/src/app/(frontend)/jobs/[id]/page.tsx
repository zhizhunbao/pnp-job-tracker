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
import { fetchJobById, fetchRelatedJobs } from '@/lib/jobsSql'
import Job from './Job'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://offer2pr.com').replace(/\/$/, '')

// JD 正文瘦查询,只给 JSON-LD 用(列表/详情的分层管线一律不带 description,见 jobsSql JOB_COLUMNS)。
// 2026-08-17:Google 的 JobPosting 规范里 description **必填**且要求「完整职位描述」,而这里一直塞的是
// 标题拼公司拼地点的 60 来字回声 —— 库里 46,315 个在架岗有 38,854 个存着真正文(81% 超 300 字),
// 从来没进过页面。当天 Search Console 实测:富结果占全部搜索曝光 94%,曝光自 7-24 峰值 7,861
// 连跌三周到 1,102(−86%)。**空壳描述是目前最强的解释,也是最便宜的修法。**
// 不触发懒抓(lazy-first 铁律 #123):库里有就用,没有照旧退回原来的拼装串 —— 爬虫来一次抓一次
// 等于批量预抓,既慢又打别人的站。
async function fetchJdText(id: number, pool: any): Promise<string> {
  if (!Number.isFinite(id)) return ''
  try {
    const { rows } = await pool.query(`SELECT description FROM jobs WHERE id = $1 LIMIT 1`, [id])
    return String(rows[0]?.description || '').trim()
  } catch {
    return ''   // 取不到就退拼装串,不因为 SEO 增强把整页拖挂
  }
}

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

  // 2026-08-11 Frank「下架了应该下面列出其他相似职位,用户不至于一看下架就走」:closed 岗是死路 ——
  // Google 招聘富结果直落本页(30 天最大入口),撞上「已下架」横幅就只剩关页。相关职位卡是 B2 瘦身时
  // 摘掉的(函数与三语文案一直留着),这里只对 closed 岗接回来:在招岗照旧守「一条信息一个家」。
  const related = job.status === 'closed'
    ? await fetchRelatedJobs(pool, {
      id, company: job.company || '', province: job.province || '', noc: job.noc || '',
      fine: job.fine || '', mid: job.mid || '', broad: job.broad || '',
    })
    : { sameCompany: [], sameOcc: [], fallbackLevel: null as null }

  // 页面维度:本岗 NOC 官方职业名 + 本岗分类的英韩名。后者供详情页直入时渲染面包屑；
  // 列表页虽已加载整张分类维表,但不能假设用户一定从列表页导航过来。
  const nocDescDocs = job.noc
    ? await payload.find({ collection: 'noc-descriptions', limit: 1, depth: 0, where: { noc: { equals: job.noc } } })
    : { docs: [] as any[] }
  const categoryTerms = [
    job.broad ? { broad: { equals: job.broad } } : null,
    job.mid ? { mid: { equals: job.mid } } : null,
    job.fine ? { fine: { equals: job.fine } } : null,
  ].filter(Boolean)
  const nocCategoryDocs = categoryTerms.length
    ? await payload.find({ collection: 'noc-categories', limit: 1, depth: 0, where: { and: categoryTerms as any[] } })
    : { docs: [] as any[] }
  const dims = {
    nocDesc: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', titleZh: r.titleZh ?? '', titleKo: r.titleKo ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
    nocCategories: nocCategoryDocs.docs.map((r: any) => ({
      broad: r.broad ?? '', mid: r.mid ?? '', fine: r.fine ?? '',
      broadEn: r.broadEn ?? '', broadKo: r.broadKo ?? '', midEn: r.midEn ?? '', midKo: r.midKo ?? '', fineEn: r.fineEn ?? '', fineKo: r.fineKo ?? '',
    })),
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
  const jdText = await fetchJdText(id, pool)
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
    // 库里有真正文就用真的(封顶 12000:懒抓 MAX_LEN 是 15000,这里留点页面重量余地);
    // 没有才退回原来那串拼装 —— 空着不行,description 是规范里的必填项,缺了整条 JobPosting 作废。
    description: jdText.slice(0, 12000) || `${job.title} — ${job.company || ''} (${[job.city, job.province].filter(Boolean).join(', ')})`,
  }

  return <>
    {/* ⚠️ JSON.stringify **不转义 `<`**,而这里走 dangerouslySetInnerHTML —— 正文是从雇主站抓来的
        第三方内容,里面一旦出现 `</script>` 就会提前闭合脚本、后面的字符当 HTML 解析(XSS)。
        把 `<` 全部转成 Unicode 转义序列:JSON 解析出来是同一个字符,却再也拼不出闭合标签。
        信任边界不上砧板(CLAUDE.md)。 */}
    <script type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <Job job={job} plan={plan} dims={dims} related={related} />
  </>
}
