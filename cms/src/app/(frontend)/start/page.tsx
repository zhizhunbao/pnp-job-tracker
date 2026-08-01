// L1-01 Landing 页(/start,B 方案并行期;切 A 时把内容移到根 page.tsx、职位板还给 jobs/page.tsx)。
// 本页只做入口:三问式首屏 + 七目标入口 + 最新动态;不做报告(L2)、不做实体页(L3)、不碰数据层。
// 红线:数字全部来自库内聚合查询,不写死;单项查询失败 → 该行/该胶囊整条不渲染,绝不显示 0。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { checkedAt, fetchJobRows, fetchJobsPage, fetchTotalAndProof } from '@/lib/jobsSql'
import { normalizeProfile } from '@/lib/match'
import { StartView, type HomeStats } from './StartView'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Plan your Canada move with data — jobs, PNP streams, provinces, schools | Offer2PR',
  description:
    'One entry point for data-backed decisions: 7 goals (find a job, get PR, pick a province/city/school, career planning) with live counts from official sources. 用数据算你的下一步:找工作、拿 PR、选省份/城市/学校,数字全部来自库内真数。',
}

// 聚合进程内缓存(手法照 jobs/page.tsx 的 ssrDimsCache):七卡小注/胶囊/动态三行全是与用户无关的
// 聚合数,10 分钟陈旧完全可接受;Render 单实例,进程缓存即全局缓存。checkedAt 不进缓存(jobsSql 自带 30s)。
let homeCache: { v: Omit<HomeStats, 'checkedAt'>; ts: number } | null = null
const HOME_TTL = 10 * 60_000

async function loadHomeStats(pool: any): Promise<Omit<HomeStats, 'checkedAt'>> {
  // 每项独立 .catch(null):一张表缺/查询挂只丢它自己那行,页面照常(宁可留空)
  const cnt = (sql: string) => pool.query(sql).then((r: any) => Number(r.rows[0]?.n) || null).catch(() => null)
  const ANON = { profile: normalizeProfile(null), matchDims: { pnpOccupations: [], eeCategories: [] } }
  const [proof, provinces, cities, dli, occupations, aipEmployers, drawRes, dailyRes, newsRes, jobRows] = await Promise.all([
    fetchTotalAndProof(pool).catch(() => null),
    cnt('SELECT count(*)::int n FROM provinces'),
    cnt('SELECT count(*)::int n FROM cities'),
    cnt('SELECT count(*)::int n FROM dli'),
    cnt('SELECT count(*)::int n FROM stats_occupation'),
    cnt('SELECT count(*)::int n FROM designated_employers'),
    // 最近抽选表(v2 B+A 拍板):pnp_draws 含省抽选与联邦轮次(province=FED),有分/有邀请数的。
    // 2026-08-01 Frank 队列③:表上加 10/20/50 条数下拉 → SSR 取 50 条,前端切(50 行 ≈ 6KB,不值得再开端点)。
    // 单一真相源:与 /pathways 抽选事实块同表同口径,本页只是轻量投影
    pool.query(`SELECT province, draw_date, stream, label, score, invitations FROM pnp_draws
      WHERE (score IS NOT NULL OR invitations IS NOT NULL) AND COALESCE(draw_date,'') <> ''
      ORDER BY draw_date DESC LIMIT 50`).then((r: any) => r.rows as any[]).catch(() => []),
    // 日更卡:最新发布日的新增岗数 + 其中可提名数(与职位板 pnp_eligible 同口径)
    pool.query(`SELECT to_char(date_posted,'YYYY-MM-DD') d, count(*)::int n,
        count(*) FILTER (WHERE COALESCE(pnp_eligible,false))::int elig
      FROM jobs WHERE date_posted = (SELECT max(date_posted) FROM jobs)
      GROUP BY date_posted`).then((r: any) => r.rows[0] ?? null).catch(() => null),
    // 多取几条再按标题去重(同题新闻隔日重抓会出重复行,landing 三行里出现两条同题很难看;取最新那条)
    // 2026-08-01 Frank 队列④:政策动态同样加 10/20/50 下拉 → 多取一批,去重后前端切
    pool.query(`SELECT region, title, date, slug FROM news ORDER BY date DESC, id DESC LIMIT 80`)
      .then((r: any) => r.rows as any[]).catch(() => []),
    // 地区统计主图四份数据(occ/city/rows/channels)不再 SSR 直出:occ ~3400 行占 HTML 大头(实测 1.85MB),
    // 移到 /api/market-stats,StartView 挂载后后台拉(SSR 瘦身,手法照 /jobs 的 /api/dims)
    // 职位节:最新榜=fetchJobRows 发布时间序(与职位板同一 DAL,匿名口径)。
    // 逐岗高薪榜 2026-07-31 退役(Frank「要的是职业薪资排名,不是具体某些职位;top50 全是医生帖,
    // 程序员排在哪」)→ 高薪 tab 改职业级,吃 market.occ(StartView 客户端排序),SSR 不再背这查询
    fetchJobRows(pool, { pro: false, profile: ANON.profile, profileOk: false, matchDims: ANON.matchDims, limit: 50 })
      .then((r) => r.jobs).catch(() => []),
  ])
  return {
    total: proof?.total || null, named: proof?.named || null, lmia: proof?.lmia || null,
    provinces, cities, dli, occupations, aipEmployers,
    draws: (drawRes as any[]).map((r) => ({
      date: String(r.draw_date), province: r.province ?? '', stream: r.stream ?? '', label: r.label ?? '',
      score: r.score == null ? null : Number(r.score),
      invitations: r.invitations == null ? null : Number(r.invitations),
    })),
    daily: dailyRes && Number(dailyRes.n) > 0
      ? { date: dailyRes.d, n: Number(dailyRes.n), eligible: Number(dailyRes.elig) || 0 } : null,
    news: (() => {
      // 同题去重带归一化:IRCC 同一稿隔日重发常只差尾部「(城市)」括注,精确比对抓不住
      const norm = (s: string) => s.replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim().toLowerCase()
      const seen = new Set<string>()
      return (newsRes as any[])
        .filter((r) => { const k = norm(r.title ?? ''); if (seen.has(k)) return false; seen.add(k); return true })
        .slice(0, 50)
        .map((r) => ({ date: String(r.date), region: r.region ?? '', title: r.title ?? '', slug: r.slug ?? '' }))
    })(),
    latestJobs: (jobRows as any[]).map(slimJob),
  }
}

// landing 职位行瘦身:只留展示字段(全量 JobRow 50×2 行会白背几百 KB 的公司简介/JD 字段)。
// noc(2026-07-31 Frank「榜单要国际化」):帖子标题无逐帖译名,中/韩界面在前端拿 market.occ
// 已到手的 NOC 三语短名查表做灰注 —— 人话名主文案+灰字小注站规,零新数据零新查询
const slimJob = (j: any) => ({
  id: j.id, title: j.title, company: j.company, city: j.city, province: j.province,
  salaryText: j.salaryText || j.salary || '', pnp: !!j.pnpEligible, date: String(j.datePosted || '').slice(0, 10),
  noc: j.noc || '',
})

export default async function StartPage() {
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as any).pool
  if (!homeCache || Date.now() - homeCache.ts >= HOME_TTL) {
    homeCache = { v: await loadHomeStats(pool), ts: Date.now() }
  }
  const upd = await checkedAt(pool).catch(() => '')
  return <StartView stats={{ ...homeCache.v, checkedAt: upd }} />
}
