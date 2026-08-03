// 报告 facts 组装层(L2-01 施工件):SQL 聚合 → ReportFacts,喂 lib/report.ts 纯函数引擎。
// 引擎不碰库、这里不做判定 —— 单一职责;查询口径全部与既有页面同源:
//   byProv 的 named 与职位板 pnp_stream 口径同、draws 与 /pathways 抽选块同表、
//   scoreProvinces=pnp_score_factors 实际覆盖的省(BC/SK),不写死。
import { NO_LIST_PROVINCES } from './match'   // 不公布清单的省(ON):雇主线索改用粗筛可提名口径
import type { ScoreFactor } from './pnpSelfScore'
import type { ReportFacts } from './report'
import type { Requirement } from './rules'

// 注意:这是**报告生成日**(请求当天),不是数据的新鲜度 —— 各条事实的真实日期跟着自己的出处走
// (清单 fetched / 分值表 fetched / 抽选轮次日期),报告里也是逐条列在「依据与链接」。
// 2026-08-01 起卡头不再拿它冒充「数据日期」,只留在打印页眉当文件生成日。
const TODAY = () => new Date().toISOString().slice(0, 10)
const EMPTY: ReportFacts = { noc: '', title: '', teer: null, byProv: [], draws: [], scoreProvinces: [], requirements: [], fetched: '' }

// 职业级统计(卡①找工作 / 卡⑥职业规划共用):stats_occupation 是 mart 算好的表,这里只 SELECT。
// 缺表容错同 loadOccStats 先例(42P01/42703 → 回空,报告少两条结论,页面不炸)。
export type OccStat = {
  noc: string; province: string; titleEn: string; titleZh: string; titleKo: string; teer: number | null; broad: string; mid: string; fine: string
  open: number; named: number; medianWage: number | null; medianPosted: number | null
}
// 雇主线索一行(锁区正文):**全是可核验的事实**,一条推断都不放 ——
// 「这家发过命中省提名清单的岗」「近两年 ESDC 批过多少 LMIA」「是不是 AIP 指定雇主」「最近还在发」。
// 红线:不出现「这家好签/容易担保」这类判断,雇主愿不愿意担保只有雇主自己知道。
export type Sponsor = {
  name: string; slug: string
  named: number            // 命中具名清单通道的在招岗数(清单式省:BC/SK/MB/NS/AB)
  eligible: number         // 粗筛可提名的在招岗数(**不公布清单的省**只有这个口径,见下面 WHERE 的说明)
  city: string; province: string
  lastPosted: string       // 最近一条在招岗的发布日
  lmiaPositions: number | null; lmiaQuarter: string   // ESDC 正面 LMIA 历史(公司级,E6-02)
  aip: boolean             // AIP 指定雇主名单在册
}
export type OccStats = {
  self: OccStat | null            // 全国行(province='all')
  byProv: OccStat[]               // 该职业各省行
  peers: OccStat[]                // 相邻职业(NOC 官方 minor group 同门,全国行,按在招降序)
  sponsors: number                // 该职业命中具名通道的岗涉及多少家雇主(免费层只给这个数)
  sponsorList: Sponsor[]          // 名单本体(付费层;gateReport 在服务端裁掉,免费响应里根本没有)
}
const EMPTY_OCC: OccStats = { self: null, byProv: [], peers: [], sponsors: 0, sponsorList: [] }
const SPONSOR_CAP = 12   // 名单上限:给得完够用,不把整张表倒出去

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
    const [mine, peers, sponsors, sponsorRows] = await Promise.all([
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
      // 计数与下面的名单**必须同一个 WHERE**(2026-08-01 实撞:计数只算具名、名单还收了 ON 的粗筛可提名岗,
      // 结果「有 83 家」与名单里的 ON 雇主对不上号)
      pool.query(
        `SELECT count(DISTINCT company_id)::int n FROM jobs
         WHERE COALESCE(status,'open') <> 'closed' AND noc = $1 AND company_id IS NOT NULL
           AND ((pnp_stream IS NOT NULL AND pnp_stream <> '')
                OR (province = ANY($2::text[]) AND COALESCE(pnp_eligible, false)))`, [noc, [...NO_LIST_PROVINCES]])
        .catch(() => ({ rows: [] })),
      // 雇主线索名单:按雇主聚合,挂上公司级的 LMIA / AIP 事实。
      // **两种口径都要收**(2026-08-01 实撞:ON 一条都出不来):
      //   · 清单式省(BC/SK/MB/NS/AB):命中具名通道的岗 → named;
      //   · 不公布清单的省(ON,NO_LIST_PROVINCES):0 具名是**制度性**的,该省用粗筛可提名口径 → eligible。
      // 两个数分开存,显示层各说各的话 —— 把 ON 的岗说成「命中清单」就是撒谎。
      // 排序=命中岗多的在前,同数看谁最近还在发(「还在招」比「历史上招过」有用)。
      pool.query(
        `SELECT co.name, co.slug, co.is_designated_employer aip, co.lmia_positions, co.lmia_last_quarter,
                count(*) FILTER (WHERE j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')::int named,
                count(*) FILTER (WHERE COALESCE(j.pnp_eligible, false))::int eligible,
                (array_agg(j.province ORDER BY j.date_posted DESC NULLS LAST))[1] province,
                (array_agg(j.city      ORDER BY j.date_posted DESC NULLS LAST))[1] city,
                max(j.date_posted)::text last_posted
         FROM jobs j JOIN companies co ON co.id = j.company_id
         WHERE COALESCE(j.status,'open') <> 'closed' AND j.noc = $1
           AND ((j.pnp_stream IS NOT NULL AND j.pnp_stream <> '')
                OR (j.province = ANY($2::text[]) AND COALESCE(j.pnp_eligible, false)))
         GROUP BY co.id, co.name, co.slug, co.is_designated_employer, co.lmia_positions, co.lmia_last_quarter
         ORDER BY named DESC, eligible DESC, max(j.date_posted) DESC NULLS LAST
         LIMIT ${SPONSOR_CAP}`, [noc, [...NO_LIST_PROVINCES]]).catch(() => ({ rows: [] })),
    ])
    const rows: OccStat[] = mine.rows.map(row)
    return {
      self: rows.find((r) => r.province === 'all') ?? null,
      byProv: rows.filter((r) => r.province !== 'all'),
      peers: peers.rows.map(row),
      sponsors: Number(sponsors.rows[0]?.n ?? 0),
      sponsorList: sponsorRows.rows.map((r: any): Sponsor => ({
        name: r.name ?? '', slug: r.slug ?? '', named: Number(r.named ?? 0), eligible: Number(r.eligible ?? 0),
        city: r.city ?? '', province: r.province ?? '', lastPosted: String(r.last_posted ?? '').slice(0, 10),
        lmiaPositions: num(r.lmia_positions), lmiaQuarter: r.lmia_last_quarter ?? '', aip: !!r.aip,
      })),
    }
  } catch (e: any) {
    if (e?.code !== '42P01' && e?.code !== '42703') throw e
    return EMPTY_OCC
  }
}

export async function assembleReportFacts(pool: any, noc: string): Promise<ReportFacts> {
  if (!/^\d{5}$/.test(noc)) return { ...EMPTY, fetched: TODAY() }
  const num = (v: any) => (v == null ? null : Number(v))
  const [prov, draws, scoreProv, head, reqs, wages, diff] = await Promise.all([
    pool.query(
      `SELECT province, count(*)::int open,
              count(*) FILTER (WHERE pnp_stream IS NOT NULL AND pnp_stream <> '')::int named,
              count(*) FILTER (WHERE apprentice_friendly)::int apprentice
       FROM jobs WHERE COALESCE(status,'open') <> 'closed' AND noc = $1 AND COALESCE(province,'') <> ''
       GROUP BY province`, [noc]),
    // 省抽选(FED=联邦轮次在引擎里走 EE 独立信号,这里不带);近 120 行足够覆盖各省近 6 次
    pool.query(
      `SELECT province, draw_date, stream, score, invitations FROM pnp_draws
       WHERE score IS NOT NULL AND COALESCE(draw_date,'') <> '' AND province <> 'FED'
       ORDER BY draw_date DESC LIMIT 120`).catch(() => ({ rows: [] })),
    // 官方分值表整张取回(120 行级):换省对照节(L2-08)要按行匹档位,不只要省名 ——
    // 省名由这张表派生,原先那条 SELECT DISTINCT 撤掉,少一次往返
    pool.query(
      `SELECT province, system, factor, kind, seq, label, points, xor_prev, rule,
              factor_max, factor_group, group_max, pass_mark, max_total, guide_effective, url, fetched
       FROM pnp_score_factors ORDER BY province, factor, seq`).catch(() => ({ rows: [] })),
    // 职业名=NOC 官方名(不拿岗位标题冒充);teer 优先统计表,缺行退 NOC 码第 2 位(2021 版编码即 TEER,结构事实)
    pool.query(
      `SELECT COALESCE(s.title_en, d.title, '') title, s.teer
       FROM noc_descriptions d LEFT JOIN stats_occupation s ON s.noc = d.noc AND s.province = 'all'
       WHERE d.noc = $1 LIMIT 1`, [noc]).catch(() => ({ rows: [] })),
    // 官方门槛(规则引擎输入):全表也就几十行,整张取回,按省的筛选交给引擎(纯函数好测)
    pool.query(
      `SELECT province, program, stream, subject, factor, op, value, value_text, unit,
              applies_teer, applies_noc, excludes_noc, applies_area, applies_family_size, basis, label, section, effective, url, page_url, fetched
       FROM pnp_requirements ORDER BY province, seq`).catch(() => ({ rows: [] })),
    // 最低收入门槛的对照基准=该职业在该省的 ESDC 官方中位年薪(岗位自带的事实,不问用户)
    pool.query(
      `SELECT province, median_wage_annual FROM stats_occupation WHERE noc = $1 AND province <> 'all'`, [noc])
      .catch(() => ({ rows: [] })),
    // 省难度(E12-07;与 /stats DifficultyCard、地点弹框同一行 broad='all',不 fork 口径)
    pool.query(
      `SELECT province, difficulty FROM stats
       WHERE broad = 'all' AND (mid = 'all' OR mid IS NULL) AND difficulty IS NOT NULL`)
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
      appliesArea: r.applies_area ?? '', familySize: num(r.applies_family_size),
      basis: r.basis ?? '', label: r.label ?? '', section: r.section ?? '',
      effective: r.effective ?? '', url: r.url ?? '', pageUrl: r.page_url ?? '', fetched: r.fetched ?? '',
    })),
    draws: draws.rows.map((r: any) => ({
      province: r.province ?? '', drawDate: String(r.draw_date ?? ''), stream: r.stream ?? '', score: num(r.score), invitations: num(r.invitations),
    })),
    scoreFactors: factorRows,
    scoreProvinces: Array.from(new Set(factorRows.map((f) => f.province))),
    fetched: TODAY(),
  }
}
