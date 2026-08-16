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

/**
 * 各省名额竞争(E12-07 `stats.difficulty`,来源 IRCC 开放数据):
 *   ratio = 该省临时居民存量 ÷ 该省当年省提名名额。9 省**同一个源同一套口径**,可以横向比 ——
 *   与各省自己公布的 EOI 池(AB 实时 / MB 年报 / SK·ON 不发)不是一回事,后者才是不可比的那类。
 */
export type ProvCompetition = {
  province: string; ratio: number; tier: string
  pool: number; quota: number
  /** 存量拆分:学签 / 工签(TFWP+IMP)。访客旅游签从不计入 pool。旧库行没有拆分 → null,前端回退合计列 */
  poolStudy: number | null; poolWork: number | null
  /** 两个数不是同一年的:分子是临时居民存量的统计年(asOf),分母是名额的年份(quotaYear)——
   *  各行还不一样(ON/BC/AB/SK 拿到 2026 名额,MB/NS/NB/NL/PE 还是 2025)。**必须逐行摆出来**,
   *  否则读者会默认它们同年。 */
  poolYear: string; quotaYear: number
  /** 本站算出这一行的日期(difficulty.generated) */
  generated: string
  /** 年份筛选序列(2026-08-14):存量近 3 年(官方停在 2024,之后年份缺位)、流量近 5 年、名额 2024–2026 */
  series?: {
    /** asOf=该年存量快照月(StatCan 季度参考日;年末=Y-12,进行年=最新季度月,方案C 2026-08-15) */
    stocks: Record<string, { study?: number | null; work?: number | null; asOf?: string }>
    flow: Record<string, { n: number; period: string }>
    quota: { y2024: number | null; y2025: number | null; y2026: number | null }
  } | null
  source: string
  /**
   * 新发学签**流量**(IRCC 月度表,provinces.info.studyFlow)。
   * 🔴 与上面的比值**口径不同不可混用**:比值的分母是「在库存量」(2024-12 快照,官方最新只到这儿),
   *    这一列是「当期新增」——2026 年只到 5 月,拿它当分子会把比值凭空砍一半。
   *    摆它是因为存量停在 2024,而这是唯一能反映**当下还在涌进多少人**的官方数字。
   */
  flow?: { period: string; n: number; prevYear: number | null } | null
}

type Tables = {
  overview: OverviewDraw[]
  /** 每省**近 6 轮有分数**的抽选(2026-08-16):估分卡的空态诱饵。
   *  必须随 SSR 下发 —— 先前它取自 `/api/score-factors`,而那个请求只在**答满全卷**后才发,
   *  于是「选了省却看不到线」,连「先选目标省份」都还在提示(实撞)。线是免费硬事实,不该收在答题之后。 */
  drawsRecent: DrawRow[]
  /** 各省名额竞争(松→紧);这一页的第二条免费硬事实,要被爬到 */
  competition: ProvCompetition[]
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
    // sort 必须带 factor+seq:只按 province 排的话,同一道题的官方档位顺序随 DB 返回
    // (2026-08-16 Frank 实拍:BC 工作地区出成「Area 3 / Area 1 / Area 2」)
    payload.find({ collection: 'pnp-score-factors', limit: 1000, depth: 0, sort: ['province', 'factor', 'seq'] })
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

  // 每省近 6 轮**有分数**的(没分数的轮次不进 —— 拿它跟估分比就是编)。9 省 × 6 ≈ 54 行,随 SSR 走
  const perProv = new Map<string, number>()
  const drawsRecent: DrawRow[] = []
  for (const r of drawDocs) {
    const prov = str(r.province)
    if (!prov || typeof r.score !== 'number') continue
    const n = perProv.get(prov) ?? 0
    if (n >= 6) continue
    perProv.set(prov, n + 1)
    drawsRecent.push({ province: prov, kind: str(r.kind), drawDate: str(r.drawDate), stream: str(r.stream), score: r.score })
  }

  // 热门职业 24 条:聚合表一次索引扫描(表还没建时 fetchTopNocs 内部自动回退老查询)
  const topNocs = pool ? await fetchTopNocs(pool, 24).catch(() => [] as TopNoc[]) : []

  // 各省名额竞争:一条按省的小查询,与上面几张表共用同一份 TTL 缓存
  const competition: ProvCompetition[] = []
  if (pool) {
    const { rows } = await pool.query(
      `SELECT province, difficulty, fetched FROM stats
        WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`,
    ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
    for (const r of rows) {
      const raw = r.difficulty
      let d: {
        tier?: string; generated?: string
        factors?: { key?: string; value?: number; pool?: number; poolStudy?: number; poolWork?: number; quota?: number; quotaYear?: number; asOf?: string; source?: string }[]
      } | null = null
      try { d = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof d) } catch { d = null }
      const f = d?.factors?.find((x) => x?.key === 'comp')
      const ratio = Number(f?.value)
      const prov = str(r.province)
      if (!PROVS.has(prov) || !Number.isFinite(ratio)) continue
      competition.push({
        province: prov, ratio, tier: str(d?.tier),
        pool: Number(f?.pool) || 0, quota: Number(f?.quota) || 0,
        poolStudy: Number.isFinite(Number(f?.poolStudy)) && f?.poolStudy != null ? Number(f.poolStudy) : null,
        poolWork: Number.isFinite(Number(f?.poolWork)) && f?.poolWork != null ? Number(f.poolWork) : null,
        poolYear: str(f?.asOf), quotaYear: Number(f?.quotaYear) || 0,
        generated: str(d?.generated) || str(r.fetched), source: str(f?.source),
      })
    }
    // 新发学签流量:与竞争比同一次取(provinces 维度表的 info jsonb,ETL 09 已写好)
    const MONTH: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
    const { rows: provRows } = await pool.query('SELECT code, info FROM provinces')
      .catch(() => ({ rows: [] as Record<string, unknown>[] }))
    const flowOf: Record<string, ProvCompetition['flow']> = {}
    const seriesOf: Record<string, ProvCompetition['series']> = {}
    for (const r of provRows) {
      const raw = r.info
      let info: {
        studyFlow?: { year?: string; n?: number; throughMonth?: string; prev?: number | null }
        trSeries?: Record<string, { study?: number | null; work?: number | null; asOf?: string }>
        flowSeries?: Record<string, { n?: number; complete?: boolean; throughMonth?: string }>
        alloc?: { y2024?: number | null; y2025?: number | null; y2026?: number | null }
      } | null = null
      try { info = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof info) } catch { info = null }
      const f = info?.studyFlow
      const n = Number(f?.n)
      if (info?.trSeries || info?.flowSeries || info?.alloc) {
        // 年份筛选序列(2026-08-14):存量近 3 年(官方停在 2024)、流量近 5 年、名额 2025/2026。
        // 流量进行年 complete=false → period 带「至几月」;缺位一律 null,前端显「—」
        const flowS: Record<string, { n: number; period: string }> = {}
        for (const [y, v] of Object.entries(info?.flowSeries ?? {})) {
          const fn = Number(v?.n)
          if (!Number.isFinite(fn)) continue
          const mm = v?.complete === false ? MONTH[str(v?.throughMonth)] ?? '' : ''
          flowS[y] = { n: fn, period: mm ? `${y}-${mm}` : y }
        }
        seriesOf[str(r.code)] = { stocks: info?.trSeries ?? {}, flow: flowS, quota: { y2024: info?.alloc?.y2024 ?? null, y2025: info?.alloc?.y2025 ?? null, y2026: info?.alloc?.y2026 ?? null } }
      }
      if (!f?.year || !Number.isFinite(n)) continue
      const mm = MONTH[str(f.throughMonth)] ?? ''
      flowOf[str(r.code)] = { period: mm ? `${f.year}-${mm}` : String(f.year), n, prevYear: Number(f.prev) || null }
    }
    for (const row of competition) { row.flow = flowOf[row.province] ?? null; row.series = seriesOf[row.province] ?? null }

    competition.sort((x, y) => x.ratio - y.ratio)          // 松 → 紧
  }

  return { overview, drawsRecent, competition, draws, factors, topNocs, factorProvinces: Array.from(new Set(factors.map((f) => f.province).filter(Boolean))) }
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
