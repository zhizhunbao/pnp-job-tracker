/**
 * 决策页(判定合一批1,设计:docs/design/判定合一与SEO落地页-20260810.md §3)的门:
 * SSR 事实区(各省最近抽选)+ 答题入口 + 三项判定(`?job=` 带岗全开)。
 * 个人条件完成后按职位所在省渐进补问官方计分项;只查当前已入库并核验过的官方分值表。
 * URL 不变保收录;表空时明确不估分,不拿旧规则凑数。
 * 2026-08-12:官方分值表**不再随页面下发**(192 行 ≈ 88KB,只有答完题的人才看得到)——
 * 改由 `/api/points/factors` 按省懒取;抽选表仍走 SSR(唯一的免费硬事实,要被爬到),
 * 但两张表都过 getScoreTables 的进程内缓存,不再每请求两条查询(prod-pool-wedge 教训)。
 * SQL 文本全在 lib/db 的 SQL 里,本文件只管取数与拼装。
 * 2026-08-28 换装批:壳件拼装收进门里(Frank「组装只许在 (frontend) 页面门里」,
 * 样张 account)—— 整页外框走 shell 桶的 Frame,顶栏与页脚在这里拼,
 * Decision 只出 Shell 轨往下的视图。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { headers } from 'next/headers'
import { Decision, type TvJob } from '@/components/plan'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import { SQL } from '@/lib/db'
import { getDb } from '@/lib/db/server'
import { getTopNocs } from '@/lib/jobs/server'
import { getScoreTables } from '@/lib/points/server'
import { getUser, isPro } from '@/lib/quota/server'
import { tripleWireOf, type TripleWire } from '@/lib/ruling/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'PR assessment — per-job verdict, latest PNP draws | Offer2PR',
  description: 'Employer offer → provincial nomination: latest draw cutoffs by province and a per-job three-part verdict. 雇主 offer → 省提名:各省最近抽选分数线与逐岗三项判定。',
}

export default async function PlanPrPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const sp = await searchParams
  /** 表包(points)与热门职业榜(jobs)2026-08-22 拆开取,各自 TTL 缓存;池由页面注入(拍板③) */
  const db = await getDb()
  const [{ overview, drawsRecent, competition }, topNocs] = await Promise.all([
    getScoreTables(db), getTopNocs({ db, limit: 24 }),
  ])

  /** `?job=` 带岗进来 → 三项结果直接并入本页(轻查:判定本体在 `/api/ruling/verdict`,这里只要表头四样) */
  let tvJob: TvJob | null = null
  const jobId = Number(sp.job)
  if (Number.isFinite(jobId) && jobId > 0) {
    const { rows } = await db.query(
      SQL.PR_PLAN_JOBS, [jobId],
    ).catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: null }))
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

  /**
   * 判定卡**服务端先算一版**(2026-08-12):先前整张卡都在客户端取,一进页面先盯 ~1.5s 的骨架条。
   * 服务端读不到 localStorage,所以这一版按「登录档案 / 无本地答案」算;客户端拿到本地答案后再刷一次。
   * 同一个 tripleWireOf,与 `/api/ruling/verdict` 一条口径(付费闸也在里面,SSR 不会多漏一行)。
   * 🔴 **SSR 不许阻塞页面**:判定拿不到/慢了就当没有,首屏照出,客户端再取(它本来就会取)。
   *    数据面有单件缓存(实测 getVerdictData 冷 2.3s、热 0ms;名录冷 97ms、热 0ms)——
   *    热进程里这一步几乎免费,但**冷启那一次不能让整页跟着等**,更不能因为它挂了页面就白屏。
   */
  let initialVerdict: TripleWire | null = null
  if (tvJob) {
    /**
     * 超时句柄挂在一个本地容器上,而不是给 `let` 重新赋值 —— 后者被 react-hooks/immutability
     * 判成「渲染完成后改变量」。赛跑语义一个字没变:谁先回谁算,回来后照旧把定时器清掉。
     */
    const timeout: { handle: ReturnType<typeof setTimeout> | null } = { handle: null }
    const wire = await Promise.race([
      (async () => { const u = await getUser(await headers()).catch(() => null); return tripleWireOf({ id: tvJob.id, answers: null, user: u, pro: isPro(u) }) })().catch(() => null),
      new Promise<null>((resolve) => { timeout.handle = setTimeout(() => resolve(null), 1500) }),
    ])
    if (timeout.handle) clearTimeout(timeout.handle)
    if (wire && !('error' in wire)) initialVerdict = wire
  }

  return (
    <Frame>
      <Header active="pathways" />
      <Decision overview={overview} drawsRecent={drawsRecent} competition={competition}
        tvJob={tvJob} topNocs={topNocs} initialVerdict={initialVerdict} />
      <Footer />
    </Frame>
  )
}
