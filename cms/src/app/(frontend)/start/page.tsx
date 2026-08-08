// E13-03 把脉首页(/start)—— 开始规划 + 榜单 + 地区统计**三合一**(设计:docs/implementation/E13-把脉首页/00_总设计与口径.md)。
// 本页只做 SSR 取数:判决区的证据数(proof)、抽选表+冷解读、政策动态、省卡的 IRCC 体量与难度档、口径出处。
// S1 的「近 14 天新发 + 环比」走 occ 全国行(客户端 /api/market-stats),不在这儿查;
// 净值卡(在架存量差)按契约 v3 **本批不做** —— 排水期的存量下跌是数据清洗不是市场收缩(后置 E13-04)。
// 红线:数字全部来自库内聚合查询,不写死;单项查询失败 → 该行/该块整条不渲染,绝不显示 0。
// SSR 瘦身照旧:职业大表(occ ~3400 行,含 E13-03 派生列)不进 HTML,由 StartView 挂载后拉 /api/market-stats。
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getUser } from '@/lib/entitlement'
import { checkedAt, fetchTotalAndProof } from '@/lib/jobsSql'
import { normalizeProfile } from '@/lib/match'
import { loadProvExtra } from '../stats/lib'
import { PROVS } from '../stats/shared'
import { StartView, type HomeStats } from './StartView'
import { fetchSponsorEmployers } from '@/lib/sponsorEmployers'

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

type RawDraw = { province: string; draw_date: string; stream: string | null; label: string | null; score: number | null; invitations: number | null }

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
      date: String(r.draw_date), province: r.province ?? '', stream: r.stream ?? '', label: r.label ?? '',
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

async function loadHomeStats(pool: any): Promise<Omit<HomeStats, 'checkedAt' | 'provPreset'>> {
  // 每项独立 .catch(null):一张表缺/查询挂只丢它自己那块,页面照常(宁可留空)
  const [proof, drawRes, newsRes, provExtra, sponsorRows, occOpts] = await Promise.all([
    fetchTotalAndProof(pool).catch(() => null),
    // 抽选表(与 /pathways 同源 pnp_draws):前端只展示 Top N(下拉 10/20/50),
    // 但冷解读要按通道回看 12 期 —— 多取一批只在服务端用完即丢,不进 HTML
    pool.query(`SELECT province, draw_date, stream, label, score, invitations FROM pnp_draws
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
  ])
  // Frank 08-08 三分表:对应三类人——没工签→LMIA、有工签→PNP 担保记录(省清单命中,二拍撤 LMIA 维)、想去海洋省→AIP
  type SR = (typeof sponsorRows)[number]
  // Frank 08-08「不要只显示 50 条」:货架页下架后橱窗即货架本体,三表全量装填客户端翻页。
  // 瘦身:cities 表格不渲不筛,置空;nocs 留着供职业筛(实测独立体积 0.10MB,gzip 后可忽略)
  const seSlice = (rows: typeof sponsorRows, keep: (r: SR) => boolean, order?: (a: SR, b: SR) => number) => {
    // 缓存行全站共享:filter 产新数组供排序,map 产新对象供瘦身,均不动缓存
    const hit = rows.filter(keep)
    if (order) hit.sort(order)
    return { top: hit.map((r) => ({ ...r, cities: [] })), total: hit.length }
  }
  return {
    total: proof?.total || null, named: proof?.named || null,
    sponsor: {
      // LMIA 表按新近度排(Frank 08-08「按最近 LMIA 数排前面」,与 #278 新近度主轴同拍):最近一季→近半年→近一年→在招
      lmia: seSlice(sponsorRows, (r) => r.lmiaPositions > 0, (a, b) => b.lmia1q - a.lmia1q || b.lmia2q - a.lmia2q || b.lmia4q - a.lmia4q || b.openJobs - a.openJobs),
      named: seSlice(sponsorRows, (r) => r.named),
      aip: seSlice(sponsorRows, (r) => r.aip),
    },
    occOpts,
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
    homeCache = { v: await loadHomeStats(pool), ts: Date.now() }
  }
  // S4 省份预选(设计 §1 拍板 4):**已建档按档案省,匿名默认 ON —— 不许按 IP 判**
  // (站内零 geo 能力,且主力受众在境外;同 i18n「不许按 IP 判语言」同族红线)。
  const user = await getUser(await headers()).catch(() => null)
  const target = normalizeProfile((user as any)?.profile).targetProvinces.find((p) => PROVS.includes(p))
  const upd = await checkedAt(pool).catch(() => '')
  return <StartView stats={{ ...homeCache.v, provPreset: target || '', checkedAt: upd }} />
}
