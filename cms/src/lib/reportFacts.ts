// 报告 facts 组装层(L2-01 施工件):SQL 聚合 → ReportFacts,喂 lib/report.ts 纯函数引擎。
// 引擎不碰库、这里不做判定 —— 单一职责;查询口径全部与既有页面同源:
//   byProv 的 named 与职位板 pnp_stream 口径同、draws 与 /pathways 抽选块同表、
//   scoreProvinces=pnp_score_factors 实际覆盖的省(BC/SK),不写死。
import type { ReportFacts } from './report'

const TODAY = () => new Date().toISOString().slice(0, 10)
const EMPTY: ReportFacts = { noc: '', title: '', teer: null, byProv: [], draws: [], scoreProvinces: [], fetched: '' }

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
