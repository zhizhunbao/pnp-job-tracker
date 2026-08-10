// 决策页(判定合一批1,设计:docs/design/判定合一与SEO落地页-20260810.md §3):
// SSR 事实区(各省最近抽选)+ 答题入口 + 三项判定(?job= 带岗全开)+ 顾问出口。
// 个人条件完成后按职位所在省渐进补问官方计分项;只查当前已入库并核验过的官方分值表。
// URL 不变保收录;表空时明确不估分,不拿旧规则凑数。
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { DrawRow, ScoreFactor } from '@/lib/pnpSelfScore'
import { PrDecisionView, type OverviewDraw, type TvJob } from './PrDecisionView'

export const dynamic = 'force-dynamic'

export const metadata = {
  // 头部词「PR assessment」不动(保收录);尾巴跟内容走 —— 旧「streams, draws, gaps」是报告页时代的
  title: 'PR assessment — per-job verdict, latest PNP draws | Offer2PR',
  description: 'Employer offer → provincial nomination: latest draw cutoffs by province and a per-job three-part verdict. 雇主 offer → 省提名:各省最近抽选分数线与逐岗三项判定。',
}

export default async function PlanPrPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const sp = await searchParams
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool

  const [drawRes, factorRes] = await Promise.all([
    payload.find({ collection: 'pnp-draws', limit: 200, depth: 0, sort: '-drawDate' })
      .catch(() => ({ docs: [] as any[] })),
    payload.find({ collection: 'pnp-score-factors', limit: 1000, depth: 0, sort: 'province' })
      .catch(() => ({ docs: [] as any[] })),
  ])

  const scoreDraws: DrawRow[] = (drawRes.docs as any[]).map((r) => ({
    province: String(r.province ?? ''), kind: String(r.kind ?? ''), drawDate: String(r.drawDate ?? ''),
    stream: String(r.stream ?? ''), score: typeof r.score === 'number' ? r.score : null,
  }))
  const scoreFactors: ScoreFactor[] = (factorRes.docs as any[]).map((r) => ({
    province: String(r.province ?? ''), system: String(r.system ?? ''), factor: String(r.factor ?? ''),
    kind: String(r.kind ?? ''), seq: Number(r.seq ?? 0), label: String(r.label ?? ''),
    points: typeof r.points === 'number' ? r.points : null, xorPrev: !!r.xorPrev, rule: String(r.rule ?? ''),
    factorMax: typeof r.factorMax === 'number' ? r.factorMax : null,
    factorGroup: String(r.factorGroup ?? ''), groupMax: typeof r.groupMax === 'number' ? r.groupMax : null,
    passMark: typeof r.passMark === 'number' ? r.passMark : null,
    maxTotal: typeof r.maxTotal === 'number' ? r.maxTotal : null,
    guideEffective: String(r.guideEffective ?? ''), url: String(r.url ?? ''), fetched: String(r.fetched ?? ''),
  }))

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

  // ?job= 带岗进来 → 三项结果直接并入本页(轻查:判定本体在 /api/triple-verdict,这里只要表头四样)
  let tvJob: TvJob | null = null
  const jobId = Number(sp.job)
  if (Number.isFinite(jobId) && jobId > 0 && pool) {
    const { rows } = await pool.query(
      `SELECT j.id, j.title, j.noc, j.teer, COALESCE(j.pnp_stream,'') AS pnp_stream,
              COALESCE(c.name,'') AS company, COALESCE(j.city,'') AS city, COALESCE(j.province,'') AS province
       FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`, [jobId],
    ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
    if (rows.length) {
      const r = rows[0]
      const teer = Number(r.teer)
      tvJob = {
        id: Number(r.id), title: String(r.title ?? ''), noc: String(r.noc ?? ''),
        teer: Number.isFinite(teer) ? teer : null, pnpStream: String(r.pnp_stream ?? ''),
        company: String(r.company ?? ''), city: String(r.city ?? ''), province: String(r.province ?? ''),
      }
    }
  }

  return <PrDecisionView overview={overview} tvJob={tvJob} scoreFactors={scoreFactors} scoreDraws={scoreDraws} />
}
