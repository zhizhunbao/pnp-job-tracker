// 报告 facts 组装层(L2-01 施工件):SQL 聚合 → ReportFacts。取数与映射,不做判定 —— 单一职责;
// 查询口径全部与既有页面同源:byProv 的 named 与职位板 pnp_stream 口径同、draws 与 /pathways
// 抽选块同表、scoreProvinces=pnp_score_factors 实际覆盖的省(BC/SK),不写死。
//
// **为什么住在 chat/**(2026-08-19 从 lib/ 顶层搬来):唯一的消费者是同目录的 tools.ts
// —— 它原先喂的 lib/report.ts 纯函数引擎早已退役,顶层那个位置只剩历史。
// 只有一个消费者的东西不该住共享叶子;同理它**不上 chat 的桶**:这是模块内件,不是对外接口。
// 当天它没能进 verdict/(域上更像那边),是因为那会造出 chat → verdict → chat 的运行时环
// (见 lib/ruling/server.ts 顶注);搬到消费者身边,一条新边都不加。
import type { ScoreFactor } from '../points'
import type { Requirement } from '../gauge'
import * as SQL from '../db/sql'   // SQL 文本全在那儿,本文件只管取数与映射

// ── 事实契约(判定合一批2:report.ts 引擎退役,类型搬回事实层自己家)────────────
type OccProvFacts = { province: string; open: number; named: number; apprentice?: number; medianWage?: number | null }
// scale = 该轮抽选用的**分制名**(pnp_draws.scale:BC=SIRS / AB=WEOI / MB=MPNP EOI)。
// 各省分制互不相通(AB 52–65 与 MB 632–825 不是一把尺),摆区间必须带它,否则读起来像数据错乱。
type ReportDraw = { province: string; drawDate: string; stream: string; score: number | null; invitations?: number | null; scale?: string | null }
// 省移民难度(E12-07 stats.difficulty):tier 三档=04e 产出(easy/mid/tight);comp=国际生存量÷提名配额
type ProvDifficulty = { province: string; tier: string; comp: number | null; asOf?: string }
type ReportFacts = {
  noc: string
  title: string                     // NOC 官方名(noc_descriptions,不拿岗位标题冒充)
  teer: number | null
  byProv: OccProvFacts[]
  draws: ReportDraw[]               // pnp_draws(省抽选;FED 行=联邦 EE,省节不取)
  medianSalary?: number | null
  scoreFactors?: ScoreFactor[]      // 官方分值表整张(pnp_score_factors)
  scoreProvinces?: string[]         // 有官方分值表的省(由 scoreFactors 派生,如 BC/SK/ON)
  scores?: Record<string, { total: number; passMark: number | null; system: string; url: string; fetched: string }>
  requirements?: Requirement[]      // 官方门槛(pnp_requirements;规则引擎的输入)
  difficulty?: ProvDifficulty[]
  fetched?: string                  // 事实聚合的数据日期
}

// 注意:这是**报告生成日**(请求当天),不是数据的新鲜度 —— 各条事实的真实日期跟着自己的出处走
// (清单 fetched / 分值表 fetched / 抽选轮次日期),报告里也是逐条列在「依据与链接」。
// 2026-08-01 起卡头不再拿它冒充「数据日期」,只留在打印页眉当文件生成日。
const TODAY = () => new Date().toISOString().slice(0, 10)
const EMPTY: ReportFacts = { noc: '', title: '', teer: null, byProv: [], draws: [], scoreProvinces: [], requirements: [], fetched: '' }

export async function assembleReportFacts(pool: any, noc: string): Promise<ReportFacts> {
  if (!/^\d{5}$/.test(noc)) return { ...EMPTY, fetched: TODAY() }
  const num = (v: any) => (v == null ? null : Number(v))
  const [prov, draws, scoreProv, head, reqs, wages, diff] = await Promise.all([
    pool.query(
      SQL.PROV_OPEN_BY_PROV, [noc]),
    // 省抽选(FED=联邦轮次在引擎里走 EE 独立信号,这里不带);近 120 行足够覆盖各省近 6 次
    pool.query(
      // scale=分制名(SIRS/WEOI/MPNP EOI):PnpDraws collection 自己写着「展示必须带 scale」——
      // 各省分制互不相通,报告摆区间时要印进句子(2026-08-04)
      SQL.PNP_DRAWS_SCORED).catch(() => ({ rows: [] })),
    // 官方分值表整张取回(120 行级):换省对照节(L2-08)要按行匹档位,不只要省名 ——
    // 省名由这张表派生,原先那条 SELECT DISTINCT 撤掉,少一次往返
    pool.query(
      SQL.PNP_SCORE_FACTORS).catch(() => ({ rows: [] })),
    // 职业名=NOC 官方名(不拿岗位标题冒充);teer 优先统计表,缺行退 NOC 码第 2 位(2021 版编码即 TEER,结构事实)
    pool.query(
      SQL.NOC_TITLE_TEER, [noc]).catch(() => ({ rows: [] })),
    // 官方门槛(规则引擎输入):全表也就几十行,整张取回,按省的筛选交给引擎(纯函数好测)
    pool.query(
      // applies_condition 走 to_jsonb 取:列缺失时返回 NULL 而不是 42703 —— additive 列上生产**之前**
      // 这段代码也能照常查(否则整表查询报错 → 门槛全省回落「本站未收录」,DDL/push 谁先谁后成了线上开关)
      SQL.PNP_REQUIREMENTS).catch(() => ({ rows: [] })),
    // 最低收入门槛的对照基准=该职业在该省的 ESDC 官方中位年薪(岗位自带的事实,不问用户)
    pool.query(
      SQL.OCC_MEDIAN_BY_PROV, [noc])
      .catch(() => ({ rows: [] })),
    // 省难度(E12-07;与 /stats DifficultyCard、地点弹框同一行 broad='all',不 fork 口径)
    pool.query(
      SQL.PROV_DIFFICULTY)
      .catch(() => ({ rows: [] })),
  ])
  const h = head.rows[0] ?? {}
  // 官方分值表一行 → ScoreFactor(命名换成驼峰,值一分不改)
  const factorRows: ScoreFactor[] = scoreProv.rows.map((r: any): ScoreFactor => ({
    province: r.province ?? '', system: r.system ?? '', factor: r.factor ?? '', kind: r.kind ?? 'row',
    seq: Number(r.seq ?? 0), label: r.label ?? '', points: num(r.points), xorPrev: !!r.xor_prev, rule: r.rule ?? '',
    factorMax: num(r.factor_max), factorGroup: r.factor_group ?? '', groupMax: num(r.group_max),
    passMark: num(r.pass_mark), maxTotal: num(r.max_total),
    guideEffective: r.guide_effective ?? '', fetched: r.fetched ?? '', url: r.url ?? '',
  }))
  const wageOf = new Map<string, number | null>(wages.rows.map((r: any) => [r.province, num(r.median_wage_annual)]))
  return {
    noc,
    title: h.title || noc,
    teer: h.teer != null ? Number(h.teer) : (/^\d{5}$/.test(noc) ? Number(noc[1]) : null),
    byProv: prov.rows.map((r: any) => ({ province: r.province, open: r.open ?? 0, named: r.named ?? 0, apprentice: r.apprentice ?? 0, medianWage: wageOf.get(r.province) ?? null })),
    // difficulty 列是 04e 写进 stats 的 json:{tier, factors:[{key:'comp',value,asOf},…]}
    difficulty: diff.rows.map((r: any) => {
      const d = r.difficulty ?? {}
      const comp = (d.factors ?? []).find((f: any) => f.key === 'comp')
      return { province: r.province, tier: d.tier ?? '', comp: comp ? Number(comp.value) : null, asOf: comp?.asOf ?? '' }
    }).filter((d: any) => d.tier),
    requirements: reqs.rows.map((r: any): Requirement => ({
      province: r.province ?? '', program: r.program ?? 'PNP', stream: r.stream ?? '',
      subject: r.subject === 'employer' ? 'employer' : 'applicant',
      factor: r.factor ?? '', op: r.op ?? '>=', value: num(r.value), valueText: r.value_text ?? '', unit: r.unit ?? '',
      appliesTeer: r.applies_teer ?? '', appliesNoc: r.applies_noc ?? '', excludesNoc: r.excludes_noc ?? '',
      appliesArea: r.applies_area ?? '', appliesCondition: r.applies_condition ?? '',
      familySize: num(r.applies_family_size),
      basis: r.basis ?? '', label: r.label ?? '', section: r.section ?? '',
      effective: r.effective ?? '', url: r.url ?? '', pageUrl: r.page_url ?? '', fetched: r.fetched ?? '',
    })),
    draws: draws.rows.map((r: any) => ({
      province: r.province ?? '', drawDate: String(r.draw_date ?? ''), stream: r.stream ?? '', score: num(r.score), scale: r.scale ?? '', invitations: num(r.invitations),
    })),
    scoreFactors: factorRows,
    scoreProvinces: Array.from(new Set(factorRows.map((f) => f.province))),
    fetched: TODAY(),
  }
}
