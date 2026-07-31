// 报告 facts 组装层(L2-01 施工件):SQL 聚合 → ReportFacts,喂 lib/report.ts 纯函数引擎。
// 引擎不碰库、这里不做判定 —— 单一职责;查询口径全部与既有页面同源:
//   byProv 的 named 与职位板 pnp_stream 口径同、draws 与 /pathways 抽选块同表、
//   scoreProvinces=pnp_score_factors 实际覆盖的省(BC/SK),不写死。
import type { ReportFacts } from './report'

const TODAY = () => new Date().toISOString().slice(0, 10)
const EMPTY: ReportFacts = { noc: '', title: '', teer: null, byProv: [], draws: [], scoreProvinces: [], fetched: '' }

// 职业级统计(卡①找工作 / 卡⑥职业规划共用):stats_occupation 是 mart 算好的表,这里只 SELECT。
// 缺表容错同 loadOccStats 先例(42P01/42703 → 回空,报告少两条结论,页面不炸)。
export type OccStat = {
  noc: string; province: string; titleEn: string; titleZh: string; titleKo: string; teer: number | null; broad: string; mid: string; fine: string
  open: number; named: number; medianWage: number | null; medianPosted: number | null
}
export type OccStats = {
  self: OccStat | null            // 全国行(province='all')
  byProv: OccStat[]               // 该职业各省行
  peers: OccStat[]                // 相邻职业(NOC 官方 minor group 同门,全国行,按在招降序)
  sponsors: number                // 该职业命中具名通道的岗涉及多少家雇主(锁区:名单要付费)
}
const EMPTY_OCC: OccStats = { self: null, byProv: [], peers: [], sponsors: 0 }

export async function assembleOccStats(pool: any, noc: string): Promise<OccStats> {
  if (!/^\d{5}$/.test(noc)) return EMPTY_OCC
  const num = (v: any) => (v == null ? null : Number(v))
  const row = (r: any): OccStat => ({
    noc: r.noc ?? '', province: r.province ?? '', titleEn: r.title_en ?? '', titleZh: r.title_zh_short || r.title_zh || '', titleKo: r.title_ko ?? '',
    teer: num(r.teer), broad: r.broad ?? '', mid: r.mid ?? '', fine: r.fine ?? '',
    open: Number(r.open_jobs ?? 0), named: Number(r.named_jobs ?? 0),
    medianWage: num(r.median_wage_annual), medianPosted: num(r.median_salary_annual),
  })
  const cols = 's.noc, s.province, s.title_en, s.title_zh, s.title_zh_short, d.title_ko, s.teer, s.broad, s.mid, s.fine, s.open_jobs, s.named_jobs, s.median_wage_annual, s.median_salary_annual'
  const from = 'FROM stats_occupation s LEFT JOIN noc_descriptions d ON d.noc = s.noc'   // 韩文名的家在 noc_descriptions
  try {
    const [mine, peers, sponsors] = await Promise.all([
      pool.query(`SELECT ${cols} ${from} WHERE s.noc = $1`, [noc]),
      // 相邻职业(Frank 2026-07-31「干 IT 可能同时适合大数据/AI/全栈/cloud」)。
      // **按 NOC 官方编码层级取,不用本站的中文分类** —— 实测本站 mid='IT' 是个杂物桶(52 个职业里
      // 塞着景观园艺技师、化学技术员、地质学家、生物学家),fine 也有同样的兜底脏值(#126 另账);
      // 而 NOC 2021 的码本身就是层级:前 3 位=minor group(21234 的 212x 就是「工程与 IT 专业」),
      // 前 4 位=unit group。官方层级不受我们自己的错标影响,这才是「相关职业」的可靠依据。
      pool.query(
        `SELECT ${cols}, CASE WHEN left(s.noc,4) = left($1,4) THEN 1 ELSE 2 END AS kin
         ${from}
         WHERE s.province = 'all' AND s.noc <> $1 AND left(s.noc,3) = left($1,3)
         ORDER BY kin, s.open_jobs DESC NULLS LAST LIMIT 8`, [noc]),
      pool.query(
        `SELECT count(DISTINCT company_id)::int n FROM jobs
         WHERE COALESCE(status,'open') <> 'closed' AND noc = $1 AND pnp_stream IS NOT NULL AND pnp_stream <> '' AND company_id IS NOT NULL`, [noc])
        .catch(() => ({ rows: [] })),
    ])
    const rows: OccStat[] = mine.rows.map(row)
    return {
      self: rows.find((r) => r.province === 'all') ?? null,
      byProv: rows.filter((r) => r.province !== 'all'),
      peers: peers.rows.map(row),
      sponsors: Number(sponsors.rows[0]?.n ?? 0),
    }
  } catch (e: any) {
    if (e?.code !== '42P01' && e?.code !== '42703') throw e
    return EMPTY_OCC
  }
}

export async function assembleReportFacts(pool: any, noc: string): Promise<ReportFacts> {
  if (!/^\d{5}$/.test(noc)) return { ...EMPTY, fetched: TODAY() }
  const num = (v: any) => (v == null ? null : Number(v))
  const [prov, draws, scoreProv, head] = await Promise.all([
    pool.query(
      `SELECT province, count(*)::int open,
              count(*) FILTER (WHERE pnp_stream IS NOT NULL AND pnp_stream <> '')::int named
       FROM jobs WHERE COALESCE(status,'open') <> 'closed' AND noc = $1 AND COALESCE(province,'') <> ''
       GROUP BY province`, [noc]),
    // 省抽选(FED=联邦轮次在引擎里走 EE 独立信号,这里不带);近 120 行足够覆盖各省近 6 次
    pool.query(
      `SELECT province, draw_date, stream, score FROM pnp_draws
       WHERE score IS NOT NULL AND COALESCE(draw_date,'') <> '' AND province <> 'FED'
       ORDER BY draw_date DESC LIMIT 120`).catch(() => ({ rows: [] })),
    pool.query(`SELECT DISTINCT province FROM pnp_score_factors`).catch(() => ({ rows: [] })),
    // 职业名=NOC 官方名(不拿岗位标题冒充);teer 优先统计表,缺行退 NOC 码第 2 位(2021 版编码即 TEER,结构事实)
    pool.query(
      `SELECT COALESCE(s.title_en, d.title, '') title, s.teer
       FROM noc_descriptions d LEFT JOIN stats_occupation s ON s.noc = d.noc AND s.province = 'all'
       WHERE d.noc = $1 LIMIT 1`, [noc]).catch(() => ({ rows: [] })),
  ])
  const h = head.rows[0] ?? {}
  return {
    noc,
    title: h.title || noc,
    teer: h.teer != null ? Number(h.teer) : (/^\d{5}$/.test(noc) ? Number(noc[1]) : null),
    byProv: prov.rows.map((r: any) => ({ province: r.province, open: r.open ?? 0, named: r.named ?? 0 })),
    draws: draws.rows.map((r: any) => ({
      province: r.province ?? '', drawDate: String(r.draw_date ?? ''), stream: r.stream ?? '', score: num(r.score),
    })),
    scoreProvinces: scoreProv.rows.map((r: any) => String(r.province)),
    fetched: TODAY(),
  }
}
