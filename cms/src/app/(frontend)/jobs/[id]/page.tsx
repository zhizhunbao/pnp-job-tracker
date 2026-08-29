/**
 * /jobs/[id] 职位详情页的门(E8-07 A 件,内容站模式借鉴批 2026-07-20 Frank 拍板)。
 * 定位:可分享 URL + SEO 落地页(JobPosting JSON-LD + sitemap 分片)+ 手机端主阅读形态;
 * 桌面弹框体系照旧。分层口径与主表完全一致:同一列集/映射,Pro 列免费剥离在 SELECT 映射层;
 * closed 岗保留可访问(已收录不 404)。
 *
 * E8-11 B2:页面砍到只剩 JD(移民/匹配/相关职位/公司 meta 全移交弹框)→ 匹配级、
 * PNP/EE/新闻/AIP 维度不再取。2026-08-11 Frank「下架了应该下面列出其他相似职位,
 * 用户不至于一看下架就走」:closed 岗才接回相关职位卡(Google 招聘富结果直落本页,
 * 30 天最大入口,撞上「已下架」横幅就只剩关页);在招岗照旧守「一条信息一个家」。
 * 页面维度只取本岗 NOC 官方职业名 + 本岗分类的英韩名 —— 后者供详情页直入时渲面包屑,
 * 不能假设用户一定从列表页导航过来。
 * dd24-#107:B2 瘦身时把 profile 硬置 null,投递栏(E9-04)上线后成了坑 —— 详情页直入的
 * 已建档用户点投递被当无档案弹空白向导;user 本来就在手上,传真实档案零额外查询。
 *
 * 2026-08-28 换装批收成标准形:SEO 头的芯在 lib/jobs 的 jobsIdMetaRoute(08-29 改 A 形一行转发),JSON-LD 拼装下沉
 * 进 lib/jobs 的 jobPostingJsonOf,脚本标签成件 JobJsonLd(门里不许有函数体、不许裸标签)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import {
  EMPTY_MATCH_DIMS, EMPTY_RELATED, Job, JobJsonLd, STATUS_CLOSED, toCatLabelList, toJobPlan, toNocDescList,
} from '@/components/jobs'
import { Frame } from '@/components/shell'
import { SQL } from '@/lib/db'
import { dbOf } from '@/lib/db/server'
import { hasProfile, normalizeProfile, type ProfileJson } from '@/lib/jobs'
import { jobPostingJsonOf, jobsIdMetaRoute, loadJobById, loadRelatedJobs } from '@/lib/jobs/server'
import { getUser, isPro } from '@/lib/quota/server'
import type { NocCategoryDoc, NocDescDoc, RelatedJobs, SessionUser } from '@/components/jobs'

export const dynamic = 'force-dynamic'

/**
 * 详情页的 SEO 头:A 形 —— Next 的 params Promise 线形状在门里拆参,
 * 芯 jobsIdMetaRoute 收本域一参形(db 注入;2026-08-29 Frank 定形,C 形禁)。
 *
 * @param x Next 递来的路由参数。
 * @returns 标题与描述。
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return jobsIdMetaRoute({ db: dbOf(await getPayload({ config: await config })), id })
}

/**
 * 职位详情页的门。
 *
 * @param props Next 传进来的路由段。
 * @returns 整页。
 */
export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (Number.isFinite(id) === false) {
    notFound()
  }

  const payload = await getPayload({ config: await config })
  const db = dbOf(payload)
  const user = await getUser(await headers())
  const pro = isPro(user)

  const job = await loadJobById({
    db, id, pro, profile: normalizeProfile(null), profileOk: false, matchDims: EMPTY_MATCH_DIMS,
  })
  if (job == null) {
    notFound()
  }

  let related: RelatedJobs = EMPTY_RELATED
  if (job.status === STATUS_CLOSED) {
    related = await loadRelatedJobs({
      db,
      job: {
        id, company: job.company, province: job.province, noc: job.noc,
        fine: job.fine, mid: job.mid, broad: job.broad,
      },
    })
  }

  let nocDescDocs: NocDescDoc[] = []
  if (job.noc !== '') {
    const found = await payload.find({
      collection: 'noc-descriptions', limit: 1, depth: 0, where: { noc: { equals: job.noc } },
    }) as { docs: NocDescDoc[] }
    nocDescDocs = found.docs
  }

  const catTerms = [
    job.broad !== '' ? { broad: { equals: job.broad } } : null,
    job.mid !== '' ? { mid: { equals: job.mid } } : null,
    job.fine !== '' ? { fine: { equals: job.fine } } : null,
  ].filter(Boolean)
  let nocCategoryDocs: NocCategoryDoc[] = []
  if (catTerms.length > 0) {
    const found = await payload.find({
      collection: 'noc-categories', limit: 1, depth: 0, where: { and: catTerms as CategoryTerm[] },
    }) as { docs: NocCategoryDoc[] }
    nocCategoryDocs = found.docs
  }

  const userProfile = normalizeProfile(user?.profile as ProfileJson | null)
  const plan = toJobPlan({
    user: user as SessionUser | null, pro, profile: userProfile, profileOk: hasProfile(userProfile),
  })

  let jdText = ''
  try {
    const { rows } = await db.query(SQL.JD_BY_JOB_ID, [id])
    jdText = String(rows[0]?.description ?? '').trim()
  } catch {
    jdText = ''
  }

  return (
    <>
      <JobJsonLd json={jobPostingJsonOf({ job, jdText })} />
      <Frame>
        <Header loggedIn={user != null} />
        <Job job={job} plan={plan}
          dims={{ nocDesc: toNocDescList(nocDescDocs), nocCategories: toCatLabelList(nocCategoryDocs) }}
          related={related} />
        <Footer />
      </Frame>
    </>
  )
}

/**
 * 查分类维表的一条 where 项(按级二选一,拼进 payload 的 `and`)。
 */
type CategoryTerm = { broad: { equals: string } } | { mid: { equals: string } } | { fine: { equals: string } }
