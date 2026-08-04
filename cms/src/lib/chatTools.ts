/**
 * 对话工具层 v1(设计《对话即产品-20260803》§三,C1 批)。
 *
 * 总红线:LLM 只负责听懂与说人话,**判定、数字、出处一律从这里出**。
 * 这一层是既有资产(rules.ts / match.ts / reportFacts.ts / mart 表)的**薄封装**,不新造判定逻辑。
 *
 * 三条自己的铁律:
 *   ① 每个数字都挂 evidence{url, fetched, ...} —— 拿不到出处的数字**宁可不返回**;
 *   ② 「官方不公布」「本站未收录」「查过没有」是三件事,用 availability 分开表达,
 *      **绝不拿 0 或空数组冒充「没有」**(拿 PR 报告出「在招 0 岗」还说这省有优势就是这么来的);
 *   ③ 工具不下结论、不排序、不打分 —— 只摆事实和出处,合成留给编排层。
 *
 * 形状照 reportFacts.ts:纯函数 + 显式 pool 入参,无全局状态、无 LLM 调用。
 */
import { NO_LIST_PROVINCES, provListCoverage, type MatchDims, type ProvListCoverage } from './match'
import { assembleReportFacts } from './reportFacts'
import { evaluateRequirements, type ReqSubject, type RuleProfile, type RuleVerdict } from './rules'
import { checkedAt } from './jobsSql'

// ── 公共类型 ────────────────────────────────────────────────────────────────

/** 出处。url 为空 = 这个数字不许出现在答案里(铁律 ①),调用方不必再判断:本层已经把它滤掉了。 */
export type Evidence = {
  url: string
  fetched: string          // 本站抓取日(不是"今天")
  label?: string           // 官方原文 / 清单名
  section?: string         // 官方节号
  effective?: string       // 官方生效日
}

/**
 * 数据可得性(铁律 ②)。四态互不替代:
 *   ok              有数据,可以直接说
 *   not-published   官方制度性不公布(ON 不公布职业清单、MB 不发运营统计)—— 不是我们没查
 *   not-collected   本站未收录(官方有或未核实)—— **不得说成「没有」**
 *   not-applicable  该省不走这套制度(QC 自有体系)
 */
export type Availability = 'ok' | 'not-published' | 'not-collected' | 'not-applicable'

/** 九省 = PNP 省(QC 走自己的体系,不属 PNP;与 ProfileForm/OnboardingWizard 的目标省同一套) */
export const PNP_PROVINCES = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE']

const upper = (s: string) => (s || '').trim().toUpperCase()
const provList = (provs?: string[]) => (provs?.length ? Array.from(new Set(provs.map(upper).filter(Boolean))) : PNP_PROVINCES)
const numOf = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// ── 政策事实表(人工核对,非数据推断;惯例同 match.ts 的 MAIN_LIST_COVERAGE)─────────
// 核对依据:docs/design/未结问题清单-20260803.md B4-3 / B4-5(2026-08-03 逐省爬站核过)。
// 政策变了改这里 —— 库里"查不到"与官方"本来就没有"永远不能靠行数推断。

/** 抽选:哪些省制度上就没有"等抽选"这一步 / 官方不公布逐轮记录 */
const DRAWS_POLICY: Record<string, { availability: Availability; note: string; url: string }> = {
  SK: {
    availability: 'not-published',
    note: 'SINP 不公布逐轮抽选记录;且 International Skilled Worker 的 Employment Offer 子类**不递 EOI、不进池**(官方 EOI 页明示只有 Occupations In-Demand 与 Express Entry 递 EOI)—— 有雇主 offer 即直接递申请,不存在"被抽中"这一步',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-eoi-system',
  },
  NS: { availability: 'not-collected', note: '本站未收录 NS 抽选记录(官方是否公布逐轮数据待核,B4-3)', url: '' },
  NB: { availability: 'not-collected', note: '本站未收录 NB 抽选记录(官方是否公布逐轮数据待核,B4-3)', url: '' },
  PE: { availability: 'not-collected', note: '本站未收录 PE 抽选记录(官方是否公布逐轮数据待核,B4-3)', url: '' },
  QC: { availability: 'not-applicable', note: '魁省自有选拔体系,不属 PNP,没有省提名抽选', url: '' },
}

/** 运营统计(处理时长 / 配额 YTD / 池内人数 / 池分布):published=官方发不发 */
const OPS_POLICY: Record<string, { published: boolean; url: string; note: string }> = {
  AB: {
    published: true,
    url: 'https://www.alberta.ca/aaip-processing-information',
    note: 'AAIP 官方发逐 stream 配额/已发/剩余/待处理、积压游标(assessing_up_to,纯文本)与 **EOI 池内人数**(全国唯一发分母的省)。「Less than 10」「Not applicable」是官方的隐私抑制/不适用,本站存 value=null + 原文,不折成 0',
  },
  SK: {
    published: true,
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/sinp-processing-statistics',
    note: 'SINP 官方发季度处理时长(80% 分位)、分行业配额与 Nominations YTD。SK 只给统计期不给口径日 —— 看 period(如 2026Q2),asOf 恒空',
  },
  BC: {
    // url 必须与 etl/pnp/build_bc_stats.py 抓的那一页一致(数字真正的来源页),别写导航别名
    published: true,
    url: 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply',
    note: 'BC PNP 官方发 Skills Immigration 注册池按 SIRS 分数段的人数分布(三省分母里颗粒度最细),配合同页最近一轮最低邀请分即可读出自己压着多少人。「<5」为官方隐私抑制值,原样保留不猜',
  },
  MB: {
    published: false,
    url: 'https://immigratemanitoba.com/',
    note: 'MB 官方不发处理时长/池子统计(2026-08-03 全站 324 页爬完确认),只有逐轮抽选页与年度年报',
  },
  ON: {
    published: false,
    url: 'https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates',
    note: 'ON 无处理时长/配额页,运营数据只有抽选史(多为改制前旧 stream)与公告页',
  },
  QC: { published: false, url: '', note: '魁省自有体系,不属 PNP' },
}

// ── ① lookupThresholds:官方门槛九省对照(rules.ts × pnp_requirements)──────────

export type ThresholdRow = {
  factor: string                 // language / income / experience / wage / empYears / empRevenue / empStaff …
  subject: ReqSubject
  verdict: RuleVerdict           // pass / fail / unknown —— 判定出自 rules.ts,本层不改
  need: number | null
  needLow: number | null
  have: number | null
  short: number | null
  unit: string
  // 分档因素的完整档位(ON 营业额 GTA/指定普查区/其余三档)。**每档挂自己那一行的官方原文** ——
  // 引用任何一档都是在报一个数字(铁律 ①);拿高档的原句去配低档的数 = 出处对不上号,等于撒谎。
  tiers?: { area: string; value: number | null; evidence: Evidence }[]
  evidence: Evidence
}
export type ProvThresholds = {
  province: string
  availability: Availability
  rows: ThresholdRow[]
  note?: string
}
export type ThresholdsResult = {
  noc: string
  title: string
  teer: number | null
  provinces: ProvThresholds[]
}

/**
 * 「我够不够格 / 差多少」。profile 不给 = 全部只摆官方门槛(verdict=unknown),不猜用户情况。
 * income 的对照基准沿用报告同一口径:该职业在该省的 ESDC 官方中位年薪(岗位自带的事实,不问用户)。
 */
export async function lookupThresholds(
  pool: any,
  args: { noc: string; teer?: number | null; provs?: string[]; profile?: Partial<RuleProfile> },
): Promise<ThresholdsResult> {
  const noc = (args.noc || '').trim()
  const facts = await assembleReportFacts(pool, noc)
  const teer = args.teer ?? facts.teer
  const wageOf = new Map(facts.byProv.map((r) => [r.province, r.medianWage ?? null]))
  const provinces = provList(args.provs).map((prov): ProvThresholds => {
    const reqs = (facts.requirements ?? []).filter((r) => r.province === prov)
    if (!reqs.length) {
      return { province: prov, availability: 'not-collected', rows: [], note: `本站未收录 ${prov} 的官方门槛条款,不能据此说该省"没有要求"` }
    }
    // 出处兜底:少数行 url 空但 page_url 有(取同省第一条能用的),两者都空的行整条丢掉(铁律 ①)
    const fallback = reqs.map((r) => r.url || r.pageUrl).find(Boolean) || ''
    const p: RuleProfile = {
      noc,
      teer,
      clb: args.profile?.clb ?? null,
      canadianExpMonths: args.profile?.canadianExpMonths ?? null,
      totalExpMonths: args.profile?.totalExpMonths ?? null,
      familySize: args.profile?.familySize ?? null,
      annualIncome: args.profile?.annualIncome ?? wageOf.get(prov) ?? null,
      incomeIsOccMedian: args.profile?.annualIncome == null,
      area: args.profile?.area ?? null,
    }
    const rows = evaluateRequirements(reqs, p)
      .map((r): ThresholdRow => {
        const evidence: Evidence = {
          url: r.evidence.url || fallback,
          fetched: r.evidence.fetched, label: r.evidence.label, section: r.evidence.section, effective: r.evidence.effective,
        }
        // 档位回到 pnp_requirements 里认领自己那一行(factor + appliesArea 唯一定位),认不到就只留 url
        const tiers = r.tiers?.map((t) => {
          const own = reqs.find((q) => q.factor === r.factor && q.appliesArea === t.area)
          return {
            ...t,
            evidence: own
              ? { url: own.url || own.pageUrl || fallback, fetched: own.fetched, label: own.label, section: own.section, effective: own.effective }
              : { url: evidence.url, fetched: evidence.fetched },
          }
        }).filter((t) => !!t.evidence.url)
        return {
          factor: r.factor, subject: r.subject, verdict: r.verdict,
          need: r.need, needLow: r.needLow, have: r.have, short: r.short, unit: r.unit,
          ...(tiers?.length ? { tiers } : {}),
          evidence,
        }
      })
      .filter((r) => !!r.evidence.url)
    return { province: prov, availability: rows.length ? 'ok' : 'not-collected', rows }
  })
  return { noc, title: facts.title, teer, provinces }
}

// ── ② lookupCoverage:省职业清单覆盖(match.ts 五态 × pnp_occupations)────────────

export type CoverageHit = { stream: string; label: string; type: string; evidence: Evidence }
export type ProvCoverage = {
  province: string
  coverage: ProvListCoverage      // listed / partial / exclusion / uncovered / qc(复用 match.ts 单一来源)
  availability: Availability
  hits: CoverageHit[]             // 具名命中;type='ineligible' = 命中的是**排除**清单
  excluded: boolean               // 命中的是排除清单(官方点名不受理)
  note: string
}
export type CoverageResult = { noc: string; provinces: ProvCoverage[] }

/** 「哪个省的清单收了我」。ON 这类省返回 not-published(官方制度性不公布清单),**不是空清单**。 */
export async function lookupCoverage(pool: any, args: { noc: string; provs?: string[] }): Promise<CoverageResult> {
  const noc = (args.noc || '').trim()
  const { rows } = await pool.query(
    `SELECT province, stream, label, type, noc, url, fetched FROM pnp_occupations`,
  ).catch(() => ({ rows: [] }))
  const dims: MatchDims = {
    pnpOccupations: rows.map((r: any) => ({ province: r.province ?? '', label: r.label ?? '', type: r.type ?? '', noc: r.noc ?? '', url: r.url ?? '', fetched: r.fetched ?? '' })),
    eeCategories: [],
  }
  const provinces = provList(args.provs).map((prov): ProvCoverage => {
    const coverage = provListCoverage(prov, dims)
    const mine = rows.filter((r: any) => r.province === prov && r.noc === noc)
    const hits: CoverageHit[] = mine
      .filter((r: any) => !!r.url)                       // 无出处的清单命中不返回(铁律 ①)
      .map((r: any): CoverageHit => ({
        stream: r.stream ?? '', label: r.label ?? '', type: r.type ?? '',
        evidence: { url: r.url, fetched: r.fetched ?? '', label: r.label ?? '' },
      }))
    const excluded = hits.some((h) => h.type === 'ineligible')
    if (hits.length) {
      return {
        province: prov, coverage, availability: 'ok', hits, excluded,
        note: excluded ? `${prov} 官方排除清单点名了 ${noc}` : `${prov} 官方清单收录了 ${noc}`,
      }
    }
    if (coverage === 'qc') return { province: prov, coverage, availability: 'not-applicable', hits, excluded, note: '魁省自有体系,不参加 PNP' }
    if (coverage === 'listed') return { province: prov, coverage, availability: 'ok', hits, excluded, note: `${prov} 公布全省主清单,查过:${noc} 不在上面` }
    if (coverage === 'exclusion') {
      return {
        province: prov, coverage, availability: 'not-published', hits, excluded,
        note: NO_LIST_PROVINCES.has(prov)
          ? `${prov} 官方**不公布**职业清单(2026-06 改制后排除集为空)—— 0 命中是制度性的,不等于"你不在清单上"`
          : `${prov} 主线不列职业(按 offer/TEER 判)或走排除清单 —— 没有"清单收不收你"这个问题`,
      }
    }
    if (coverage === 'partial') return { province: prov, coverage, availability: 'not-collected', hits, excluded, note: `本站只收录了 ${prov} 的专项通道清单,主线清单未核实 —— 不得说"查过不在"` }
    return { province: prov, coverage, availability: 'not-collected', hits, excluded, note: `本站未收录 ${prov} 的职业清单` }
  })
  return { noc, provinces }
}

// ── ③ lookupJobs:在招岗位计数(jobs mart)──────────────────────────────────

export type JobsRow = {
  province: string
  open: number
  named: number          // 命中具名省提名通道的在招数
  apprentice: number     // 学徒友好岗(apprentice_friendly,ETL 标好的)
  medianWage: number | null
  evidence: Evidence
}
export type JobsResult = {
  noc: string
  availability: Availability
  scope: string          // 口径:本站索引,不是该省全部空缺
  checkedAt: string      // 最近一次核对(seed)时刻
  rows: JobsRow[]
}

/**
 * 「哪里在招 / 有多少学徒岗」。**0 是本站索引里的 0,不是该省没有** —— scope 把这句写在返回值里。
 * prov 给了就只返回那个省(没有行也返回 0 行,因为本站索引覆盖全 10 省)。
 */
export async function lookupJobs(
  pool: any,
  args: { noc: string; prov?: string; apprentice?: boolean },
): Promise<JobsResult> {
  const noc = (args.noc || '').trim()
  const [facts, at] = await Promise.all([assembleReportFacts(pool, noc), checkedAt(pool).catch(() => '')])
  const want = args.prov ? [upper(args.prov)] : facts.byProv.map((r) => r.province)
  const rows = want.map((prov): JobsRow => {
    const f = facts.byProv.find((r) => r.province === prov)
    return {
      province: prov,
      open: f?.open ?? 0,
      named: f?.named ?? 0,
      apprentice: f?.apprentice ?? 0,
      medianWage: f?.medianWage ?? null,
      evidence: { url: `/?prov=${prov}&q=${noc}`, fetched: at, label: 'Offer2PR 职位板(Job Bank 全国日更 + ATS)' },
    }
  })
  // apprentice=true 只是把没有学徒岗的省摘掉(点名了省份就照给,0 也得让他看见)
  const filtered = args.apprentice && !args.prov ? rows.filter((r) => r.apprentice > 0) : rows
  return {
    noc,
    availability: /^\d{5}$/.test(noc) ? 'ok' : 'not-collected',
    scope: '本站索引口径:Job Bank 全国全职业日更增量 + Kanata ATS;0 表示本站当前索引里没有在招,不代表该省没有空缺',
    checkedAt: at,
    rows: filtered.sort((a, b) => (args.apprentice ? b.apprentice - a.apprentice : b.open - a.open)),
  }
}

// ── ④ lookupDraws:省抽选史(pnp_draws)──────────────────────────────────────

export type DrawRow = {
  province: string
  drawDate: string
  stream: string
  score: number | null
  scale: string          // 分制名(SIRS/WEOI/MPNP EOI);各省分制互不相通,摆分数必须带它
  invitations: number | null
  evidence: Evidence
}
export type DrawsResult = {
  province: string
  availability: Availability
  rows: DrawRow[]
  note?: string
}

/** 「多久抽一轮 / 分数线」。无记录 ≠ 0 轮:SK 是制度上没有这一步,NS/NB/PE 是本站未收录。 */
export async function lookupDraws(pool: any, args: { prov: string; limit?: number }): Promise<DrawsResult> {
  const province = upper(args.prov)
  const limit = Math.min(Math.max(args.limit ?? 12, 1), 60)
  const { rows } = await pool.query(
    `SELECT province, draw_date, stream, score, scale, invitations, url, fetched, label
     FROM pnp_draws WHERE province = $1 AND COALESCE(draw_date,'') <> ''
     ORDER BY draw_date DESC LIMIT ${limit}`, [province],
  ).catch(() => ({ rows: [] }))
  const out = rows
    .filter((r: any) => !!r.url)                          // 无出处的抽选行不返回(铁律 ①)
    .map((r: any): DrawRow => ({
      province: r.province ?? province,
      drawDate: String(r.draw_date ?? '').slice(0, 10),
      stream: r.stream ?? '',
      score: numOf(r.score),
      scale: r.scale ?? '',
      invitations: numOf(r.invitations),
      evidence: { url: r.url, fetched: r.fetched ?? '', label: r.label ?? '' },
    }))
  if (out.length) return { province, availability: 'ok', rows: out }
  const policy = DRAWS_POLICY[province]
  return {
    province,
    availability: policy?.availability ?? 'not-collected',
    rows: [],
    note: policy?.note ?? `本站未收录 ${province} 的抽选记录 —— 不等于该省没有抽选`,
  }
}

// ── ⑤ lookupOps:官方运营统计(处理时长 / 配额 / 池内人数 / 池分布)────────────────

export type OpsMetric = {
  key: string            // metric 词表:allocation/issued/remaining/to_process/assessing_up_to/eoi_pool(_total)/processing_weeks/nominations_ytd/capped_pct/capped_spots/priority_sector/sirs_pool
  scope: string          // 适用范围值(通道名 / 行业 / SIRS 分数段;省级为空串)
  scopeKind: string      // stream / sector / category / scoreRange(省级为空串)—— 说明 scope 是哪一类
  label: string          // 官方原文
  /**
   * 🔴 可空是本字段的立身之本(建表 SQL 同款红线):官方的**隐私抑制值**(AB「Less than 10」)
   * 与「本项不适用」(Not applicable)、纯文本游标(assessing_up_to 恒 null)一律 value=null,
   * 原文进 valueText。**null 不是 0** —— 折成 0 就是替官方编了个数字,报告会说出「已发 0」这种假话。
   * 本层绝不用 `?? 0` 兜底;调用方看到 null 就该念 valueText,不许自己填数。
   */
  value: number | null
  valueText: string      // value=null 时的官方原文("Less than 10" / "Not applicable" / "May 8, 2026 …")
  unit: string           // people / weeks / nominations / percent / spots / text / flag
  asOf: string           // 官方口径日(AB/BC 有);SK 没有,看 period
  period: string         // 统计期(SK 用 "2026Q2";AB/BC 为空)
  evidence: Evidence
}
export type OpsResult = {
  province: string
  availability: Availability
  officialUrl: string    // 官方页:优先取查到的行自己的 url(出处必须指向数字真正的来源页),查不到才回落常量表
  note: string
  metrics: OpsMetric[]   // 只在 availability='ok' 时非空;空数组**不表示"官方没有"**
}

/**
 * 「等多久 / 名额还剩多少 / 被捞概率」= SELECT pnp_ops_stats(G5,2026-08-04 起真查库)。
 * availability 按**查到的行**说话:有行=ok;没行但官方公布(AB/SK/BC)=not-collected(本站未收录,不是「没有」);
 * 官方不公布(MB/ON)=not-published;QC 不走这套体系=not-applicable。
 */
export async function lookupOps(pool: any, args: { prov: string }): Promise<OpsResult> {
  const province = upper(args.prov)
  const p = OPS_POLICY[province]
  const { rows } = await pool.query(
    `SELECT metric, scope, scope_kind, label, value, value_text, unit, as_of, period, url, fetched, section
     FROM pnp_ops_stats WHERE province = $1 AND COALESCE(url,'') <> ''
     ORDER BY metric, seq, scope`, [province],
  ).catch(() => ({ rows: [] }))
  const metrics: OpsMetric[] = (rows ?? []).map((r: any) => ({
    key: r.metric ?? '', scope: r.scope ?? '', scopeKind: r.scope_kind ?? '', label: r.label ?? '',
    value: r.value == null ? null : numOf(r.value),   // 🔴 null 原样带出,永远不 `?? 0`
    valueText: r.value_text ?? '', unit: r.unit ?? '', asOf: r.as_of ?? '', period: r.period ?? '',
    evidence: { url: r.url, fetched: r.fetched ?? '', label: r.label ?? '', ...(r.section ? { section: r.section } : {}) },
  }))
  const officialUrl = metrics[0]?.evidence.url || p?.url || ''
  if (metrics.length) return { province, availability: 'ok', officialUrl, note: p?.note ?? '', metrics }
  if (province === 'QC') return { province, availability: 'not-applicable', officialUrl, note: p!.note, metrics: [] }
  if (p && !p.published) return { province, availability: 'not-published', officialUrl, note: p.note, metrics: [] }
  return {
    province, availability: 'not-collected', officialUrl,
    note: p ? `${p.note};但本站库里此刻一行都没有 —— 是本站未收录,不是官方没有` : `本站未核实 ${province} 是否公布运营统计`,
    metrics: [],
  }
}

// ── ⑥ lookupEE:联邦 EE 类别(ee_categories)─────────────────────────────────

export type EeRow = {
  category: string
  label: string
  teer: number | null
  drawCrs: number | null      // 该类别最近一次类别抽选的最低 CRS(null = 该类别本站无抽选记录)
  drawDate: string
  drawSize: number | null
  evidence: Evidence
}
export type EeResult = {
  noc: string
  availability: Availability
  matched: boolean            // false 且 availability='ok' = 查过全表,这个职业不在任何类别里
  rows: EeRow[]
  note: string
}

/** 「联邦类别抽选走不走得通」。EE 是**联邦独立信号**,与省提名不是一条路。 */
export async function lookupEE(pool: any, args: { noc: string }): Promise<EeResult> {
  const noc = (args.noc || '').trim()
  if (!/^\d{5}$/.test(noc)) return { noc, availability: 'not-collected', matched: false, rows: [], note: '职业码不是 5 位 NOC,查不了' }
  const { rows } = await pool.query(
    `SELECT category, label, teer, draw_crs, draw_date, draw_size, url, fetched FROM ee_categories WHERE noc = $1`, [noc],
  ).catch(() => ({ rows: null }))
  if (rows == null) return { noc, availability: 'not-collected', matched: false, rows: [], note: '本站 EE 类别表暂不可用' }
  const out = rows
    .filter((r: any) => !!r.url)
    .map((r: any): EeRow => ({
      category: r.category ?? '', label: r.label ?? '', teer: numOf(r.teer),
      drawCrs: numOf(r.draw_crs), drawDate: String(r.draw_date ?? '').slice(0, 10), drawSize: numOf(r.draw_size),
      evidence: { url: r.url, fetched: r.fetched ?? '', label: r.label ?? '' },
    }))
  return {
    noc, availability: 'ok', matched: out.length > 0, rows: out,
    note: out.length
      ? '命中联邦 EE 类别抽选清单(类别抽选按类别单独发邀,分数线与全类别轮次不同)'
      : '查过 IRCC 类别抽选全表:这个职业不在任何类别里(仍可走全类别轮次,按 CRS 排队)',
  }
}

// ── ⑦ checkClaims:外部主张对账三分法 ────────────────────────────────────────

export type ClaimTopic = 'coverage' | 'thresholds' | 'jobs' | 'draws' | 'ops' | 'ee'
/** 中介/朋友的一句话。text 原样带回(不改写别人的话);topic/province 由编排层从自然语言里抽。 */
export type Claim = { text: string; topic: ClaimTopic; province?: string }
export type ClaimCheck = {
  claim: Claim
  bucket: 'checked' | 'uncheckable'
  availability: Availability
  facts: unknown          // 对应工具的返回原样嵌入(数字都带 evidence)
  why?: string            // uncheckable 时说清是"官方不公布"还是"本站没收录"
}
/** 第三格:他没说的 —— 同一个职业,本站查得到但这些主张一个字没提的省 */
export type UnsaidItem = { province: string; facts: ProvCoverage }
export type ClaimsResult = { noc: string; checked: ClaimCheck[]; uncheckable: ClaimCheck[]; unsaid: UnsaidItem[] }

/**
 * 「中介说 X」。本工具**只对账,不评价**:每条主张挂上对应的官方事实与出处,
 * 核不了的说清核不了的原因,再把"他没提的省"单列一格(中介只会说他有渠道的那个省)。
 */
export async function checkClaims(pool: any, args: { noc: string; teer?: number | null; claims: Claim[] }): Promise<ClaimsResult> {
  const noc = (args.noc || '').trim()
  const claims = args.claims ?? []
  const mentioned = new Set(claims.map((c) => upper(c.province ?? '')).filter(Boolean))
  const provs = Array.from(mentioned)
  // 三个工具一次装满:被点名的省逐条对账 + 全九省覆盖(第三格要用)
  const [coverage, thresholds, jobs] = await Promise.all([
    lookupCoverage(pool, { noc }),
    provs.length ? lookupThresholds(pool, { noc, teer: args.teer, provs }) : Promise.resolve(null),
    lookupJobs(pool, { noc }),
  ])
  const covOf = (p: string) => coverage.provinces.find((r) => r.province === p)

  const checked: ClaimCheck[] = []
  const uncheckable: ClaimCheck[] = []
  for (const claim of claims) {
    const prov = upper(claim.province ?? '')
    let availability: Availability = 'not-collected'
    let facts: unknown = null
    let why = ''
    if (claim.topic === 'coverage') {
      const c = prov ? covOf(prov) : null
      availability = c?.availability ?? 'not-collected'
      facts = c ?? null
      why = c?.note ?? '主张没指明省份,查不了'
    } else if (claim.topic === 'thresholds') {
      const t = thresholds?.provinces.find((r) => r.province === prov) ?? null
      availability = t?.availability ?? 'not-collected'
      facts = t
      why = t?.note ?? '主张没指明省份,查不了'
    } else if (claim.topic === 'jobs') {
      const rows = prov ? jobs.rows.filter((r) => r.province === prov) : jobs.rows
      availability = jobs.availability
      facts = { scope: jobs.scope, checkedAt: jobs.checkedAt, rows }
    } else if (claim.topic === 'draws') {
      const d = await lookupDraws(pool, { prov })
      availability = d.availability
      facts = d
      why = d.note ?? ''
    } else if (claim.topic === 'ops') {
      const o = await lookupOps(pool, { prov })
      availability = o.availability
      facts = o
      why = o.note
    } else {
      const e = await lookupEE(pool, { noc })
      availability = e.availability
      facts = e
      why = e.note
    }
    const row: ClaimCheck = { claim, bucket: availability === 'ok' ? 'checked' : 'uncheckable', availability, facts, ...(why ? { why } : {}) }
    ;(row.bucket === 'checked' ? checked : uncheckable).push(row)
  }

  // 他没说的:本站**查得到具名命中**、而这些主张一个字没提的省(不排序、不推荐,只列出来)
  const unsaid: UnsaidItem[] = coverage.provinces
    .filter((c) => !mentioned.has(c.province) && c.availability === 'ok' && c.hits.length > 0 && !c.excluded)
    .map((c) => ({ province: c.province, facts: c }))

  return { noc, checked, uncheckable, unsaid }
}
