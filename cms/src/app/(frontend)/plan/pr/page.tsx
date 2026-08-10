// 决策页(判定合一批1,设计:docs/design/判定合一与SEO落地页-20260810.md §3):
// SSR 事实区(各省最近抽选)+ 答题入口 + 三关判定(?job= 带岗全开)+ 顾问出口。
// 测分工具不上页面(Frank 08-10「测分数完全不用显示」)—— 分数归判定卡个人关(批2 接线),
// 本页服务端只查两样:抽选概览 + 岗位表头。URL 不变保收录;表空=不出该节,页面不 500。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { PrDecisionView, type OverviewDraw, type TvJob } from './PrDecisionView'

export const dynamic = 'force-dynamic'

export const metadata = {
  // 头部词「PR assessment」不动(保收录);尾巴跟内容走 —— 旧「streams, draws, gaps」是报告页时代的
  title: 'PR assessment — per-job verdict, latest PNP draws | Offer2PR',
  description: 'Employer offer → provincial nomination: latest draw cutoffs by province and a per-job three-gate verdict. 雇主 offer → 省提名:各省最近抽选分数线与逐岗三关判定。',
}

export default async function PlanPrPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const sp = await searchParams
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool

  const drawRes = await payload.find({ collection: 'pnp-draws', limit: 200, depth: 0, sort: '-drawDate' })
    .catch(() => ({ docs: [] as any[] }))

  // SSR 事实区:每省最近一轮有分数线或邀请数的抽选(纯事实,零解释;查不到的省不出行)。
  // 只收 13 省区码——pnp_draws 里还有联邦轮(province='FED'),那是 EE 不是省提名,不进这张表
  const PROVS = new Set(['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'])
  const seen = new Set<string>()
  const overview: OverviewDraw[] = []
  for (const r of drawRes.docs as any[]) {
    const prov = r.province ?? ''
    if (!prov || !PROVS.has(prov) || seen.has(prov)) continue
    if (typeof r.score !== 'number' && typeof r.invitations !== 'number') continue
    seen.add(prov)
    overview.push({
      province: prov, drawDate: r.drawDate ?? '', stream: r.stream ?? '',
      score: typeof r.score === 'number' ? r.score : null,
    })
  }

  // ?job= 带岗进来 → 三关全开(轻查:判定本体在 /api/triple-verdict,这里只要表头四样)
  let tvJob: TvJob | null = null
  const jobId = Number(sp.job)
  if (Number.isFinite(jobId) && jobId > 0 && pool) {
    const { rows } = await pool.query(
      `SELECT j.id, j.title, COALESCE(c.name,'') AS company, COALESCE(j.city,'') AS city, COALESCE(j.province,'') AS province
       FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`, [jobId],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
    if (rows.length) {
      const r = rows[0]
      tvJob = { id: Number(r.id), title: String(r.title ?? ''), company: String(r.company ?? ''), city: String(r.city ?? ''), province: String(r.province ?? '') }
    }
  }

  return <PrDecisionView overview={overview} tvJob={tvJob} />
}
