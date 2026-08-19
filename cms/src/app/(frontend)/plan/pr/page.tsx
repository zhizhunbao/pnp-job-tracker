// 决策页(判定合一批1,设计:docs/design/判定合一与SEO落地页-20260810.md §3):
// SSR 事实区(各省最近抽选)+ 答题入口 + 三项判定(?job= 带岗全开)。
// 个人条件完成后按职位所在省渐进补问官方计分项;只查当前已入库并核验过的官方分值表。
// URL 不变保收录;表空时明确不估分,不拿旧规则凑数。
//
// 2026-08-12:官方分值表**不再随页面下发**(192 行 ≈ 88KB,只有答完题的人才看得到)——
// 改由 /api/score-factors 按省懒取;抽选表仍走 SSR(唯一的免费硬事实,要被爬到),
// 但两张表都过 getScoreTables 的进程内缓存,不再每请求两条查询(prod-pool-wedge 教训)。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getScoreTables } from '@/lib/score/server'
import { buildTripleWire, type TripleWire } from '@/lib/verdict/server'
import { Decision, type TvJob } from './Decision'
import * as SQL from '@/lib/db/sql'   // SQL 文本全在那儿,本文件只管取数与组装

export const dynamic = 'force-dynamic'

export const metadata = {
  // 头部词「PR assessment」不动(保收录);尾巴跟内容走 —— 旧「streams, draws, gaps」是报告页时代的
  title: 'PR assessment — per-job verdict, latest PNP draws | Offer2PR',
  description: 'Employer offer → provincial nomination: latest draw cutoffs by province and a per-job three-part verdict. 雇主 offer → 省提名:各省最近抽选分数线与逐岗三项判定。',
}

export default async function PlanPrPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const sp = await searchParams
  const { overview, drawsRecent, competition, topNocs } = await getScoreTables()

  // ?job= 带岗进来 → 三项结果直接并入本页(轻查:判定本体在 /api/triple-verdict,这里只要表头四样)
  let tvJob: TvJob | null = null
  const jobId = Number(sp.job)
  if (Number.isFinite(jobId) && jobId > 0) {
    const payload = await getPayload({ config: await config })
    const pool = (payload.db as { pool?: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool
    if (pool) {
      const { rows } = await pool.query(
        SQL.PR_PLAN_JOBS, [jobId],
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
  }

  // 判定卡**服务端先算一版**(2026-08-12):先前整张卡都在客户端取,一进页面先盯 ~1.5s 的骨架条。
  // 服务端读不到 localStorage,所以这一版按「登录档案 / 无本地答案」算;客户端拿到本地答案后再刷一次。
  // 同一个 buildTripleWire,与 /api/triple-verdict 一条口径(付费闸也在里面,SSR 不会多漏一行)。
  // 🔴 **SSR 不许阻塞页面**:判定拿不到/慢了就当没有,首屏照出,客户端再取(它本来就会取)。
  //    数据面有单件缓存(实测 getVerdictData 冷 2.3s、热 0ms;名录冷 97ms、热 0ms)——
  //    热进程里这一步几乎免费,但**冷启那一次不能让整页跟着等**,更不能因为它挂了页面就白屏。
  let initialVerdict: TripleWire | null = null
  if (tvJob) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const wire = await Promise.race([
      buildTripleWire(tvJob.id, null).catch(() => null),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500) }),
    ])
    if (timer) clearTimeout(timer)
    if (wire && !('error' in wire)) initialVerdict = wire
  }

  return <Decision overview={overview} drawsRecent={drawsRecent} competition={competition} tvJob={tvJob} topNocs={topNocs} initialVerdict={initialVerdict} />
}
