// E8-11 B1:公司弹框数据同源端点——与 /companies/[slug] 页面同一份 CompanyDetail(+相似雇主)。
// 全事实层免费不走额度闸(与页面同口径,Frank 拍板「一个来源」;#189 弹框页眉额度注随之退役)。
// POST {jobId}:按 jobs.company_id 解析,不走公司名匹配(同名公司不串)。
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { fetchCompanyByJobId, fetchSimilarEmployers } from '@/lib/jobsSql'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { jobId } = await req.json().catch(() => ({}))
  if (!Number.isFinite(Number(jobId))) return new Response('', { status: 400 })
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  const company = await fetchCompanyByJobId(pool, Number(jobId))
  if (!company) return new Response('', { status: 404 })
  const similar = await fetchSimilarEmployers(pool, { province: company.province, industry: company.industry, excludeSlug: company.slug }).catch(() => [])
  return Response.json({ company, similar })
}
