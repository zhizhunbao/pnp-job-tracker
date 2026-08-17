// E13-03 把脉首页(/start)—— 开始规划 + 榜单 + 地区统计**三合一**(设计:docs/implementation/E13-把脉首页/00_总设计与口径.md)。
// 本页只做 SSR 取数:判决区的证据数(proof)、抽选表+冷解读、政策动态、省卡的 IRCC 体量与难度档、口径出处。
// S1 中间两卡(近 14 天新发/平均在架天数)08-09 起也在这儿算成两个标量下发(此前走客户端
// /api/market-stats,刷新必闪一次骨架占位——Frank「中间两个数为什么会闪」);occ 大表本身仍不进 HTML。
// 净值卡(在架存量差)按契约 v3 **本批不做** —— 排水期的存量下跌是数据清洗不是市场收缩(后置 E13-04)。
// 红线:数字全部来自库内聚合查询,不写死;单项查询失败 → 该行/该块整条不渲染,绝不显示 0。
// SSR 瘦身照旧:职业大表(occ ~3400 行,含 E13-03 派生列)不进 HTML,由 Start 挂载后拉 /api/market-stats。
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'
import { checkedAt, fetchTotalAndProof } from '@/lib/jobsSql'
import { normalizeProfile } from '@/lib/match'
import { loadOccStats, loadProvExtra } from '../stats/lib'
import { PROVS } from '../stats/shared'
import { Start, type HomeStats } from './Start'
import { buildSponsorBoards, fetchSponsorEmployers, SE_SSR_ROWS } from '@/lib/sponsorEmployers'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canada job market pulse — what is shrinking, what is hiring, by province | Offer2PR',
  description:
    'Which occupations are shrinking and which are still hiring: 14-day posting change, average days open, PNP-list hit rate, provincial breakdown and the latest draw cutoffs. 就业把脉:哪些职业在缩、哪些还在招,数字全部来自库内真数。',
}

// 聚合进程内缓存(手法照 jobs/page.tsx 的 ssrDimsCache):判决证据/抽选/政策/省卡全是与用户无关的
// 聚合数,10 分钟陈旧完全可接受;Render 单实例,进程缓存即全局缓存。
// checkedAt 与「用户档案省」不进缓存(前者 jobsSql 自带 30s,后者是逐用户的)。
let homeCache: { v: Omit<HomeStats, 'checkedAt' | 'provPreset'>; ts: number } | null = null
const HOME_TTL = 10 * 60_000

// S5 冷解读的口径(设计 §4):当期分数线 vs **近 12 期同通道**的区间。
// 在服务端算完只带三个标量下去(histN/histMin/histMax),而不是把 400 行抽选史塞进 HTML。
const HIST_WINDOW = 12
const HIST_MIN_N = 4        // 同通道有效期数 <4 不出解读(样本太少的「区间」是噪音,宁可不说)

type RawDraw = { province: string; draw_date: string; stream: string | null; stream_zh?: string | null; label: string | null; score: number | null; invitations: number | null }

function withDrawHistory(rows: RawDraw[], limit: number): HomeStats['draws'] {
  const groups = new Map<string, RawDraw[]>()   // 键=省+通道;rows 已按日期降序,组内自然也降序
  for (const r of rows) {
    const k = `${r.province}|${r.stream || r.label || ''}`
    const g = groups.get(k); if (g) g.push(r); else groups.set(k, [r])
  }
  const pos = new Map<RawDraw, { n: number; min: number; max: number } | null>()
  for (const g of groups.values()) {
    g.forEach((r, i) => {
      // 从本期往回数 12 期(含本期):只统计有分数线的期次
      const scores = g.slice(i, i + HIST_WINDOW).map((x) => x.score).filter((v): v is number => v != null)
      pos.set(r, scores.length >= HIST_MIN_N ? { n: scores.length, min: Math.min(...scores), max: Math.max(...scores) } : null)
    })
  }
  return rows.slice(0, limit).map((r) => {
    const h = pos.get(r) ?? null
    return {
      date: String(r.draw_date), province: r.province ?? '', stream: r.stream ?? '', streamZh: r.stream_zh ?? '', label: r.label ?? '',
      score: r.score == null ? null : Number(r.score),
      invitations: r.invitations == null ? null : Number(r.invitations),
      histN: h?.n ?? null, histMin: h?.min ?? null, histMax: h?.max ?? null,
    }
  })
}

// 橱窗职业筛 datalist 候选(旧货架页同款手法,1h 进程缓存;~500 行,gzip 15KB)
let occCache: { ts: number; rows: { noc: string; title: string; titleZh: string }[] } | null = null
async function occOptions(pool: any) {
  if (occCache && Date.now() - occCache.ts < 3600_000) return occCache.rows
  const { rows } = await pool.query(`SELECT noc, title, COALESCE(title_zh, '') AS title_zh FROM noc_descriptions ORDER BY title`).catch(() => ({ rows: [] }))
  occCache = { ts: Date.now(), rows: rows.map((r: any) => ({ noc: r.noc, title: r.title ?? '', titleZh: r.title_zh ?? '' })) }
  return occCache.rows
}

// 职业筛联动(大类→中类→小类→职业,08-08 Frank「大类种类小类联动过滤要加上」;小类一级 08-09 补,
// Frank「全部小类呢?」)的中/小类英韩名——与职位板 JobsTable 同一张 noc_categories 维度表
// (一行=一个小类,1h 进程缓存);大类沿用既有 i18n `broad.*` 键(27 个已全译,不必再查)。
let catCache: { ts: number; rows: { broad: string; mid: string; midEn: string; midKo: string; fine: string; fineEn: string; fineKo: string }[] } | null = null
async function catOptions(payload: any) {
  if (catCache && Date.now() - catCache.ts < 3600_000) return catCache.rows
  const docs = await payload.find({ collection: 'noc-categories', limit: 1000, depth: 0 }).catch(() => ({ docs: [] }))
  catCache = { ts: Date.now(), rows: docs.docs.map((c: any) => ({
    broad: c.broad ?? '', mid: c.mid ?? '', midEn: c.midEn ?? '', midKo: c.midKo ?? '',
    fine: c.fine ?? '', fineEn: c.fineEn ?? '', fineKo: c.fineKo ?? '',
  })) }
  return catCache.rows
}

async function loadHomeStats(pool: any, payload: any): Promise<Omit<HomeStats, 'checkedAt' | 'provPreset'>> {
  // 每项独立 .catch(null):一张表缺/查询挂只丢它自己那块,页面照常(宁可留空)
  const [proof, drawRes, newsRes, provExtra, sponsorRows, occOpts, catMids, occRows] = await Promise.all([
    fetchTotalAndProof(pool).catch(() => null),
    // 抽选表(与 /pathways 同源 pnp_draws):前端只展示 Top N(下拉 10/20/50),
    // 但冷解读要按通道回看 12 期 —— 多取一批只在服务端用完即丢,不进 HTML
    // #280:SELECT *(不点名 stream_zh)—— 同 news.title_zh 的容缺手法:DDL 没跑前该列不存在,
    // 点名会整块炸(catch 吞掉会连累score/invitations 一起消失);* 容缺列,400 行无压力
    pool.query(`SELECT * FROM pnp_draws
      WHERE (score IS NOT NULL OR invitations IS NOT NULL) AND COALESCE(draw_date,'') <> ''
      ORDER BY draw_date DESC LIMIT 400`).then((r: any) => r.rows as RawDraw[]).catch(() => []),
    // 多取几条再按标题去重(同题新闻隔日重抓会出重复行);前端 Top N 下拉再切
    // SELECT *:title_zh 列(E13-06)可能还没加,点名会整块炸;* 容缺列,80 行无压力
    pool.query(`SELECT * FROM news ORDER BY date DESC, id DESC LIMIT 80`)
      .then((r: any) => r.rows as any[]).catch(() => []),
    loadProvExtra().catch(() => ({})),      // 省卡:IRCC 学签/工签/PNP 拿到 PR + 难度档(与 /stats 索引页同源)
    // B2+ 雇主橱窗:复用进程内聚合缓存(同进程同一份,零额外查询);挂了只丢橱窗
    fetchSponsorEmployers(pool).catch(() => []),
    occOptions(pool).catch(() => []),
    catOptions(payload).catch(() => []),
    // S1 两标量 + noc→分类映射的原料(单一真相源 stats/lib.loadOccStats,同 /api/market-stats);
    // 挂了只丢中间两卡与分类联动,页面照常
    loadOccStats().catch(() => []),
  ])
  // S1 中间两卡:occ 全国行聚合成两个标量(逻辑原样自 Start.pulseCards 下沉;缺列/缺数=null,卡整张不出)
  const natOcc = occRows.filter((o) => (o.province || '').toLowerCase() === 'all')
  const news14 = natOcc.map((o) => o.new14d).filter((v): v is number => v != null)
  const new14 = news14.length ? news14.reduce((a, b) => a + b, 0) : null
  // 在架天数按在架量加权(职业间直接平均会让 3 个岗的小职业和 3000 个岗的大职业等权)
  const wRows = natOcc.filter((o) => o.avgDaysOpen != null && (o.openJobs ?? 0) > 0)
  const days = wRows.length
    ? Math.round(wRows.reduce((a, o) => a + (o.avgDaysOpen as number) * (o.openJobs as number), 0) / wRows.reduce((a, o) => a + (o.openJobs as number), 0))
    : null
  // 三分表职业筛联动 noc→大/中/小类:只带橱窗行真出现过的 NOC 下去(occ 全表仍不进 HTML)
  const nocSet = new Set<string>()
  for (const r of sponsorRows) for (const n of r.nocs ?? []) nocSet.add(n)
  const nocCat: Record<string, { broad: string; mid: string; fine: string }> = {}
  for (const o of occRows) if (o.broad && nocSet.has(o.noc) && !nocCat[o.noc]) nocCat[o.noc] = { broad: o.broad, mid: o.mid ?? '', fine: o.fine ?? '' }
  // Frank 08-08 三分表:对应三类人——没工签→LMIA、有工签→PNP 担保记录(省清单命中,二拍撤 LMIA 维)、想去海洋省→AIP。
  // #313(LCP 7.15s 真因):三表全量(16,430 行)序列化进 RSC payload 把 SSR 文档撑到 6.92MB ——
  // 「全量可翻页」拍板不动,只换运输方式:SSR 只带每表前 SE_SSR_ROWS 行 + total,挂载后
  // Start 拉 /api/sponsor-employers 换全量(手法照本页 occ 大表的 /api/market-stats 先例)。
  // 三表构建(筛选+排序)下沉 lib/sponsorEmployers.buildSponsorBoards,与 API 路由共用一份,不 fork。
  const boards = buildSponsorBoards(sponsorRows)
  const ssrSlice = (b: typeof boards.lmia) => ({ top: b.top.slice(0, SE_SSR_ROWS), total: b.total })
  return {
    total: proof?.total || null, named: proof?.named || null,
    sponsor: { lmia: ssrSlice(boards.lmia), named: ssrSlice(boards.named), aip: ssrSlice(boards.aip) },
    occOpts,
    catMids,
    pulse: { new14, days },
    nocCat,
    draws: withDrawHistory(drawRes as RawDraw[], 50),
    news: (() => {
      // 同题去重带归一化:IRCC 同一稿隔日重发常只差尾部「(城市)」括注,精确比对抓不住
      const norm = (s: string) => s.replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim().toLowerCase()
      const seen = new Set<string>()
      return (newsRes as any[])
        .filter((r) => { const k = norm(r.title ?? ''); if (seen.has(k)) return false; seen.add(k); return true })
        .slice(0, 50)
        .map((r) => ({ date: String(r.date), region: r.region ?? '', title: r.title ?? '', titleZh: r.title_zh ?? '', slug: r.slug ?? '' }))
    })(),
    provExtra,
  }
}

export default async function StartPage() {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  if (!homeCache || Date.now() - homeCache.ts >= HOME_TTL) {
    homeCache = { v: await loadHomeStats(pool, payload), ts: Date.now() }
  }
  // S4 省份预选(设计 §1 拍板 4):**已建档按档案省,匿名默认 ON —— 不许按 IP 判**
  // (站内零 geo 能力,且主力受众在境外;同 i18n「不许按 IP 判语言」同族红线)。
  const user = await getUser(await headers()).catch(() => null)
  const target = normalizeProfile((user as any)?.profile).targetProvinces.find((p) => PROVS.includes(p))
  const upd = await checkedAt(pool).catch(() => '')
  return <Start stats={{ ...homeCache.v, provPreset: target || '', checkedAt: upd }} />
}
