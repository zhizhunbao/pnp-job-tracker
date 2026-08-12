// 决策页要的两张表(pnp_score_factors 官方分值表 + pnp_draws 抽选记录)的进程内单件缓存。
//
// 🔴 为什么要有这个文件(2026-08-12):/plan/pr 是一级导航页 + Google 落地页,原先 force-dynamic
//    每请求两条查询(draws 200 行 + factors 1000 行),并把 **192 行分值表 ≈ 88KB** 整份塞进
//    客户端 props —— 而它只在「答完题、且目标省落在 ON/BC/MB/SK/NL」时才有人看。
//    站级聚合禁每请求现算(prod-pool-wedge 教训),与 verdictCache 同 TTL 同手法。
//
// 抽选表(overview)留在 SSR:它是这页唯一的免费硬事实,要被爬到,不能等水合。
// 分值表改由 /api/score-factors 按省懒取,不再随页面下发。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { fetchTopNocs } from './jobsSql'
import type { DrawRow, ScoreFactor } from './pnpSelfScore'

/** SSR 事实区一行:每省最近一轮有分数线或邀请数的抽选。
 *  🔴 invitations 必须带出来:这张表的入选条件就是「有分数线**或**有邀请数」,
 *  只带分数线的话,靠邀请数入选的那几行会显示成一整行「—」——把它入选的那个事实藏了(2026-08-12 Frank 实拍)。 */
export type OverviewDraw = { province: string; drawDate: string; stream: string; score: number | null; invitations: number | null }

// 只收 13 省区码 —— pnp_draws 里还有联邦轮(province='FED'),那是 EE 不是省提名,不进这张表
const PROVS = new Set(['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU'])
const TTL = 10 * 60_000

/** 热门职业一行(fetchTopNocs 的返回,读 ETL 聚合表 noc_openings) */
export type TopNoc = Awaited<ReturnType<typeof fetchTopNocs>>[number]

type Tables = {
  overview: OverviewDraw[]
  /** 选职业控件的热门榜:服务端取好随页面下发 → 控件首帧即终态,不再分段刷 */
  topNocs: TopNoc[]
  draws: DrawRow[]
  factors: ScoreFactor[]
  /** 本站已收录官方分值表的省 —— 决策页据此把「本站没有表」的省单列出来 */
  factorProvinces: string[]
}

let cache: { at: number; data: Tables } | null = null

const str = (v: unknown): string => String(v ?? '')
const numOrNull = (v: unknown): number | null => (typeof v === 'number' ? v : null)

async function load(): Promise<Tables> {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool
  const [drawRes, factorRes] = await Promise.all([
    payload.find({ collection: 'pnp-draws', limit: 200, depth: 0, sort: '-drawDate' })
      .catch(() => ({ docs: [] as Record<string, unknown>[] })),
    payload.find({ collection: 'pnp-score-factors', limit: 1000, depth: 0, sort: 'province' })
      .catch(() => ({ docs: [] as Record<string, unknown>[] })),
  ])
  const drawDocs = drawRes.docs as Record<string, unknown>[]
  const factorDocs = factorRes.docs as Record<string, unknown>[]

  const draws: DrawRow[] = drawDocs.map((r) => ({
    province: str(r.province), kind: str(r.kind), drawDate: str(r.drawDate),
    stream: str(r.stream), score: numOrNull(r.score),
  }))
  const factors: ScoreFactor[] = factorDocs.map((r) => ({
    province: str(r.province), system: str(r.system), factor: str(r.factor),
    kind: str(r.kind), seq: Number(r.seq ?? 0), label: str(r.label),
    points: numOrNull(r.points), xorPrev: !!r.xorPrev, rule: str(r.rule),
    factorMax: numOrNull(r.factorMax),
    factorGroup: str(r.factorGroup), groupMax: numOrNull(r.groupMax),
    passMark: numOrNull(r.passMark), maxTotal: numOrNull(r.maxTotal),
    guideEffective: str(r.guideEffective), url: str(r.url), fetched: str(r.fetched),
  }))

  // 每省最近一轮(docs 已按 drawDate 倒序;查不到的省不出行,纯事实零解释)
  const seen = new Set<string>()
  const overview: OverviewDraw[] = []
  for (const r of drawDocs) {
    const prov = str(r.province)
    if (!prov || !PROVS.has(prov) || seen.has(prov)) continue
    if (typeof r.score !== 'number' && typeof r.invitations !== 'number') continue
    seen.add(prov)
    overview.push({ province: prov, drawDate: str(r.drawDate), stream: str(r.stream),
      score: numOrNull(r.score), invitations: numOrNull(r.invitations) })
  }

  // 热门职业 24 条:聚合表一次索引扫描(表还没建时 fetchTopNocs 内部自动回退老查询)
  const topNocs = pool ? await fetchTopNocs(pool, 24).catch(() => [] as TopNoc[]) : []
  return { overview, draws, factors, topNocs, factorProvinces: Array.from(new Set(factors.map((f) => f.province).filter(Boolean))) }
}

export async function getScoreTables(): Promise<Tables> {
  if (!cache || Date.now() - cache.at > TTL) {
    const data = await load()
    // 两张表都空 = 多半是查挂了,不把一次抖动钉死 10 分钟
    if (data.draws.length || data.factors.length || data.topNocs.length) cache = { at: Date.now(), data }
    return data
  }
  return cache.data
}
