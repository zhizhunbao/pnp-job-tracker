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
import { NO_LIST_PROVINCES, provListCoverage, type MatchDims, type ProvListCoverage } from '../match'
// ⚠️ 单向依赖:planTimeline 只 `import type` 本文件(编译期擦除),所以这条运行时的边不成环。
// 要往回加一个**值**引用之前先想清楚:那会变成真的循环依赖。
import { buildPlan, type Plan, type PlanPathInput } from '../planTimeline'
// ⚠️ 这条边只能是**单向**的:pathVerdict 对本文件只 `import type`(编译期擦除),
// 所以这里拿它的**值**(pathVerdict/pathLevers)不成环。往 pathVerdict 里加一个指回本文件的值引用之前先想清楚。
import {
  pathLevers, pathVerdict,
  type DesignatedEmployerRow, type OccupationRow, type PathwayVerdict,
  type VerdictData, type VerdictDrawRow, type VerdictLever, type VerdictProfile,
} from '../pathVerdict'
import { assembleReportFacts } from '../reportFacts'
import { evaluateRequirements, type Requirement, type ReqSubject, type RuleProfile, type RuleVerdict } from '../rules'
import type { ScoreFactor } from '../pnpSelfScore'
import type { EeGridRow } from '../crsEstimate'
import { checkedAt } from '../jobsSql'
import * as SQL from '../db/sql'   // SQL 文本全在那儿,本文件只管取数与组装

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
 *   not-published   官方制度性不公布(如官方原文明确说不发布某项数据)—— 不是我们没查
 *                   ⚠️ 这一态是**最容易说谎的一态**:说「官方不公布」而官方其实公布了,比说「我不知道」
 *                   坏得多(中介正好钻这个空子)。写进 *_POLICY 之前必须**在 data/crawl 的 html_cache 里
 *                   找到官方原句**并把 URL + 原句抄进注释,爬完一个目录不算爬完全站。
 *                   两次翻车都在这上头:MB「不发运营统计」(2026-08-04 推翻)、SK「不公布逐轮抽选」
 *                   (同日推翻 —— 官方 EOI 页自己挂着结果下载件)。
 *   not-collected   本站未收录(官方有或未核实)—— **不得说成「没有」**
 *   not-applicable  查询本身不适用(如 QC 不走 PNP,或私人销售承诺不是一项政府数据)
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
/**
 * 两个 ISO 日之间的**整月数**(向下取整)。只用库里的日期算,不读系统时钟 ——
 * 「多久没开过」的计时终点是**本站已知的最新一轮**,不是「今天」:今天到最新一轮之间可能又开过
 * 一轮而本站还没抓,拿今天当终点就是替官方宣布「这期间没开过」。同理不折成小数(21.4 个月是
 * 我们没有的精度)。日期格式不对返回 null —— 宁可不说,不猜。
 */
const monthsBetween = (from: string, to: string): number | null => {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from || '')
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to || '')
  if (!a || !b) return null
  const m = (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]))
  return Number(b[3]) < Number(a[3]) ? m - 1 : m
}

// ── 政策事实表(人工核对,非数据推断;惯例同 match.ts 的 MAIN_LIST_COVERAGE)─────────
// 核对依据:docs/design/未结问题清单-20260803.md B4-3 / B4-5(2026-08-03 逐省爬站核过)。
// 政策变了改这里 —— 库里"查不到"与官方"本来就没有"永远不能靠行数推断。

/** 抽选:哪些省制度上就没有"等抽选"这一步 / 官方不公布逐轮记录 */
const DRAWS_POLICY: Record<string, { availability: Availability; note: string; url: string }> = {
  SK: {
    // 2026-08-04 复核(data/crawl/sk-sinp/html_cache,ISW EOI System 页)——原来这条写 not-published
    // 「SINP 不公布逐轮抽选记录」,**是错的**:官方同一页的「EOI Selection Results」节挂着结果下载件
    //   「Download SINP ISW EOI Selection Results」
    //   → https://publications.saskatchewan.ca/api/v1/products/102708/formats/113850/download
    // 官方只说**事前**不预告:「The dates of the selections will not be posted before they take place.」
    // 事后公布 ≠ 不公布,所以降级成 not-collected(本站还没把这份下载件入库)。
    // 后半句「Employment Offer 子类不进池」有据,同页原文:
    //   「If you are eligible under the Occupations In-Demand or Express Entry, you will be able to
    //     submit an Expression of Interest (EOI).」—— 名单里没有 Employment Offer,故保留。
    availability: 'not-collected',
    note: 'SINP 官方在 EOI 页挂「SINP ISW EOI Selection Results」下载件公布逐轮结果(只是不预告下一轮日期),本站尚未收录这份下载件 —— 不是官方没有。另:International Skilled Worker 的 Employment Offer 子类**不递 EOI、不进池**(官方 EOI 页明示只有 Occupations In-Demand 与 Express Entry 递 EOI)—— 有雇主 offer 即直接递申请,不存在"被抽中"这一步',
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
    note: 'BC PNP 官方发 Skills Immigration 注册池按 SIRS 分数段的人数分布(三省分母里颗粒度最细),配合同页最近一轮最低邀请分即可读出自己压着多少人。「<5」为官方隐私抑制值,原样保留不猜。**处理时长也发**:通道页印着「约 80% 的案子」在 申请 3 个月 / 提名后请求 1 个月 / 复核 6 个月 内办完(官方给的单位是月,本站不折算成周)',
  },
  MB: {
    // 2026-08-04 更正:原来这条写着 published:false「MB 官方不发处理时长/池子统计」——**是错的**。
    // 病根:那轮爬取的种子只圈了 immigratemanitoba.com/mpnp/,/resources/data/ 整个目录没进去,
    // 「这一轮没爬到」被写成了「官方不公布」。MB 其实是披露最厚的省之一(2018–2026 月度页 + 2017–2024 年报)。
    published: true,
    url: 'https://immigratemanitoba.com/resources/data/monthly-data-2026',
    note: 'MPNP 官方发**月度运营数据**(年度配额、年初至今提名/增强提名/拒/LAA/收件、在审与待审库存,逐月)与**年报 §9 处理时长**(逐通道 批准/拒/总体 平均天数 + 「6 个月内评估完整申请」的服务承诺)。天数是官方原单位,本站不折算;库存是该月首个工作日的快照,不是「当前」',
  },
  ON: {
    // 2026-08-04 更正:改成 published:true —— ON 确实没有处理时长/池子统计页,但**年度配额是公布的**
    // (2026-02-06 OINP updates:「The province's 2026 allocation is 14,119 nominations.」)。
    // 留 false 会让工具答「ON 官方不公布配额」,那是假话;改 true 后没数据即 not-collected(本站未收录),
    // 这才是实情。要转 ok 只差一个从 updates 公告页抓配额的 builder(G6 遗留项)。
    published: true,
    url: 'https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates',
    note: 'ON 没有处理时长/池子统计页,运营数据只有抽选史(多为改制前旧 stream)与公告页;**年度配额在公告页发**(2026-02-06:14,119 nominations)—— 本站尚未收录这一条',
  },
  // 全表唯一的 published:false。它**永远产不出 not-published** —— lookupOps 里 QC 在这个判断之前
  // 就被短路成 not-applicable(魁省不走 PNP,不是"官方藏着数据不发")。留 false 只是别让它掉进
  // 「本站未收录」那句(那会暗示魁省有一份 PNP 运营统计等我们去抓)。
  QC: { published: false, url: '', note: '魁省自有体系,不属 PNP' },
}

// ── ① lookupThresholds:官方门槛九省对照(rules.ts × pnp_requirements)──────────

export type ThresholdRow = {
  factor: string                 // language / income / experience / wage / empYears / empRevenue / empStaff …
  subject: ReqSubject
  /** 官方通道原名。一个省的规则可能来自多条互不等价的通道，消费端必须据此避免把门槛硬拼成一条路。 */
  stream?: string
  /**
   * 阈值口径(rules.ts 原样带出)。**说这一行之前先看它**:
   * basis='employerTenure'(MB SWM)量的是「在**这家**雇主连续全职多久」,不是「N 个月技术工作经验」——
   * 用错话术,句子本身就是假的(所以这类行的 verdict 恒 unknown,have 恒空)。
   * basis='occMedian'(ON 工资档)则表示阈值不是绝对数,而是该职业该地区的官方中位。
   */
  basis?: string
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
        const source = reqs.find((q) => q.label === r.evidence.label && q.url === r.evidence.url)
        const evidence: Evidence = {
          url: r.evidence.url || fallback,
          fetched: r.evidence.fetched, label: r.evidence.label, section: r.evidence.section, effective: r.evidence.effective,
        }
        // 档位回到 pnp_requirements 里认领自己那一行(factor + 档名唯一定位),认不到就只留 url。
        // 档名对雇主侧是区域(appliesArea),对 MB SWM 在职时长是非地域条件(appliesCondition)——
        // 认错行 = 拿这一档的官方原句去配另一档的数,就是撒谎(见 ThresholdRow.tiers 注释)
        const tiers = r.tiers?.map((t) => {
          const own = reqs.find((q) => q.factor === r.factor && (q.appliesArea || q.appliesCondition || '') === t.area)
          return {
            ...t,
            evidence: own
              ? { url: own.url || own.pageUrl || fallback, fetched: own.fetched, label: own.label, section: own.section, effective: own.effective }
              : { url: evidence.url, fetched: evidence.fetched },
          }
        }).filter((t) => !!t.evidence.url)
        return {
          factor: r.factor, subject: r.subject, stream: source?.stream ?? '',
          ...(r.basis ? { basis: r.basis } : {}), verdict: r.verdict,
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

type CoverageHit = { stream: string; label: string; type: string; evidence: Evidence }
type ProvCoverage = {
  province: string
  coverage: ProvListCoverage      // listed / partial / exclusion / uncovered / qc(复用 match.ts 单一来源)
  availability: Availability
  hits: CoverageHit[]             // 具名命中;type='ineligible' = 命中的是**排除**清单
  excluded: boolean               // 命中的是排除清单(官方点名不受理)
  note: string
}
type CoverageResult = { noc: string; provinces: ProvCoverage[] }

/** 「哪个省的清单收了我」。ON 这类省返回 not-published(官方制度性不公布清单),**不是空清单**。 */
export async function lookupCoverage(pool: any, args: { noc: string; provs?: string[] }): Promise<CoverageResult> {
  const noc = (args.noc || '').trim()
  const { rows } = await pool.query(
    SQL.PNP_OCCUPATIONS_FLAT,
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
      // ON 这条 not-published 有据(data/crawl/on-oinp/html_cache,OINP Employer Job Offer 雇主指南
      // https://www.ontario.ca/page/oinp-employer-job-offer-streams-employer-guide 「Eligible occupation」节):
      //   「Under the Ontario Workforce Priority stream, the job offered can be in any location in Ontario
      //     and in any National Occupational Classification (NOC) occupation.」
      // 官方明写"任何 NOC 都行"= 没有职业清单可公布,不是我们没抓到清单页。
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

type JobsRow = {
  province: string
  open: number
  named: number          // 命中具名省提名通道的在招数
  apprentice: number     // 学徒友好岗(apprentice_friendly,ETL 标好的)
  medianWage: number | null
  evidence: Evidence
}
type JobsResult = {
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
  args: { noc: string; prov?: string },
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
  return {
    noc,
    availability: /^\d{5}$/.test(noc) ? 'ok' : 'not-collected',
    scope: '本站索引口径:Job Bank 全国全职业日更增量 + Kanata ATS;0 表示本站当前索引里没有在招,不代表该省没有空缺',
    checkedAt: at,
    // 🔴 **永远按 open 排序,永远不按 apprentice 过滤**(2026-08-05 撤掉的旧行为,见下)。
    //   旧版:0 经验时 `rows.filter(r => r.apprentice > 0)` + 按 apprentice 排序。两处都错:
    //   ① `apprentice_friendly` 只统计「雇主**明说**不要经验」(etl/clean/05e:33-35:Job Bank 结构化
    //      Experience 字段命中 will-train/no-experience,或标题含 apprenti)。**未声明 ≠ 要经验** ——
    //      NOC 72310 在安省 129 个在招里只有 4 个带这个标,而木工证在魁省之外是自愿的,
    //      那 125 个没标的岗 0 经验照样能投。把 129 说成 4,等于替雇主写了一条他没写的门槛。
    //   ② 拿这个近乎噪声的数当排序键再截断,会**整省消失**:NL 只有 4 个带标的岗排到第 9,
    //      于是「NL 有 18 个木工岗」这句话从来没机会进对话 —— 而 NL 恰是人工复盘里的第一路径。
    //   学徒岗仍然有用(它是更容易上手的那一档),但它是**子集**,由消费端另外标注,不在这里当闸门。
    rows: rows.sort((a, b) => b.open - a.open),
  }
}

// ── ④ lookupDraws:省抽选史(pnp_draws)──────────────────────────────────────

type DrawRow = {
  province: string
  drawDate: string
  stream: string
  score: number | null
  scale: string          // 分制名(SIRS/WEOI/MPNP EOI);各省分制互不相通,摆分数必须带它
  invitations: number | null
  evidence: Evidence
}
/** 本站收录的抽选窗口。**「多久没开过」的分母** —— 没有它,「0 轮」就分不清是停了还是我们没抓。 */
type DrawWindow = {
  from: string           // 本站收录的最早一轮(窗口更早的轮次不在库里)
  to: string             // 最近一轮 —— 计时终点用它,不是「今天」(见 monthsBetween)
  rounds: number         // 窗口内总轮数
}

/**
 * 一类轮次的小结。存在的理由只有一个:**空数组与「这类轮次停了」是两件事**。
 * 案例 C02 §4-4 的原型:「联邦常规轮次 480~530」——常规(general)轮次在本站 56 轮的窗口里
 * 一次都没出现,而 CEC 12 轮全在 507–518。返回空数组会让上层以为「没数据」,于是它照抄了中介的数。
 */
type DrawStreamStat = {
  /** 分类键 = **库里已有的字段**(FED 是 label:cec/pnp/french/trade…;省级退回官方轮次名)。本层不给轮次归类,认不出就原样返回追问的那个词 */
  key: string
  stream: string         // 官方轮次名原文(该类最近一轮的写法)
  scale: string          // 分制名(FED=CRS,与各省 SIRS/WEOI/MPNP EOI 互不相通)
  rounds: number         // 窗口内该类的轮数;0 = 一轮都没有
  lastDrawDate: string   // 窗口内该类最近一轮;'' = 窗口内 0 轮
  /**
   * 「隔了多久」的计时起点:有轮次 = lastDrawDate;0 轮 = **窗口起点**(本站只知道到这天为止)。
   * 配 sinceIsWindowStart 一起读 —— 后者为 true 时上层只许说「**至少** N 个月没开过」。
   */
  since: string
  sinceIsWindowStart: boolean
  monthsSince: number | null   // since → window.to 的整月数(不含今天,见 monthsBetween)
  scoreLow: number | null      // 窗口内该类的分数线区间(min/max,不是平均、不排名)
  scoreHigh: number | null
  availability: Availability   // ok=窗口内有轮次;not-collected=窗口内 0 轮,上一轮在窗口之前,本站没有它的日期
  note: string
  evidence: Evidence
}

export type DrawsResult = {
  province: string
  availability: Availability
  rows: DrawRow[]
  note?: string
  scale?: string             // 该省/FED 的分制(全表同一个分制时给出;摆分数必须带它)
  window?: DrawWindow        // 有记录时给出
  streams?: DrawStreamStat[] // 不给 stream 参数=库里每一类各一行;给了=只回追问的那一类(含 0 轮的那一行)
}

/**
 * 「多久抽一轮 / 分数线」。无记录 ≠ 0 轮:SK 是制度上没有这一步,NS/NB/PE 是本站未收录。
 *
 * `prov='FED'` = 联邦 Express Entry 轮次(同一张 pnp_draws,province='FED',分制 **CRS**)。
 * `stream` 按**库里已有的** label / 官方轮次名过滤('cec' / 'Canadian Experience' 都能命中);
 * 追问的那一类窗口内 0 轮时,**不返回空数组了事** —— streams 里给一行「至少 N 个月没开过」
 * (availability=not-collected:更早的轮次不在本站窗口内,上一轮是哪天本站没有,不许编)。
 */
export async function lookupDraws(pool: any, args: { prov: string; limit?: number; stream?: string }): Promise<DrawsResult> {
  const province = upper(args.prov)
  const limit = Math.min(Math.max(args.limit ?? 12, 1), 60)
  const q = (args.stream || '').trim().toLowerCase()
  // 不再在 SQL 里 LIMIT:窗口(最早一轮 / 总轮数)要按**全部**记录算,limit 只截最终 rows。
  // pnp_draws 全表百行量级,一次取完比多跑一条 count 查询便宜。
  const { rows } = await pool.query(
    SQL.PNP_DRAWS_BY_PROV, [province],
  ).catch(() => ({ rows: [] }))
  const kept = (rows ?? []).filter((r: any) => !!r.url)   // 无出处的抽选行不返回(铁律 ①)
  const evOf = (r: any): Evidence => ({ url: r.url, fetched: r.fetched ?? '', label: r.label ?? '' })
  const dateOf = (r: any) => String(r.draw_date ?? '').slice(0, 10)
  const rowOf = (r: any): DrawRow => ({
    province: r.province ?? province,
    drawDate: dateOf(r),
    stream: r.stream ?? '',
    score: numOf(r.score),
    scale: r.scale ?? '',
    invitations: numOf(r.invitations),
    evidence: evOf(r),
  })
  const all: DrawRow[] = kept.map(rowOf)
  const win: DrawWindow | null = all.length
    ? { from: all[all.length - 1].drawDate, to: all[0].drawDate, rounds: all.length }
    : null
  const scales = Array.from(new Set(all.map((r) => r.scale).filter(Boolean)))
  const scale = scales.length === 1 ? scales[0] : ''
  // 分类键取库里已有的 label(FED 由 ETL 的 CAT_MAP 归好),省级没有 label 就退回官方轮次名 —— 本层不新造分类
  const keyOf = (r: any) => String(r.label || r.stream || '').trim()
  const hit = (r: any) => !q || keyOf(r).toLowerCase() === q || String(r.stream ?? '').toLowerCase().includes(q)

  const stat = (key: string, rs: any[], w: DrawWindow): DrawStreamStat => {
    const scores = rs.map((r) => numOf(r.score)).filter((n): n is number => n != null)
    const last = rs[0]                                     // kept 已按 draw_date DESC
    const lastDate = dateOf(last)
    const m = monthsBetween(lastDate, w.to)
    return {
      key, stream: last.stream ?? '', scale: last.scale ?? '', rounds: rs.length,
      lastDrawDate: lastDate, since: lastDate, sinceIsWindowStart: false, monthsSince: m,
      scoreLow: scores.length ? Math.min(...scores) : null,
      scoreHigh: scores.length ? Math.max(...scores) : null,
      availability: 'ok',
      note: `本站收录这类 ${rs.length} 轮,最近一轮 ${lastDate}${m == null ? '' : `(距本站已知的最新一轮 ${w.to} ${m} 个月)`}`,
      evidence: evOf(last),
    }
  }
  /** 窗口内 0 轮:摆「至少多久没开过」+ 说清上一轮的日期本站没有(不是「没有这类轮次」) */
  const silent = (key: string, w: DrawWindow): DrawStreamStat => {
    const m = monthsBetween(w.from, w.to)
    return {
      key, stream: '', scale, rounds: 0,
      lastDrawDate: '', since: w.from, sinceIsWindowStart: true, monthsSince: m,
      scoreLow: null, scoreHigh: null,
      availability: 'not-collected',
      note: `本站收录的 ${province} 抽选窗口(${w.from} 起 ${w.rounds} 轮)里没有一轮匹配「${key}」——`
        + ` 按这份记录**至少** ${m ?? '?'} 个月没开过这类轮次;`
        + `更早的轮次不在本站窗口内,上一轮是哪天、多少分,本站没有(不许拿别处的数字填)`,
      // 出处 = 该省抽选记录的官方页:「这一类没出现」正是在这一页上看出来的
      evidence: { url: all[0].evidence.url, fetched: all[0].evidence.fetched },
    }
  }

  let streams: DrawStreamStat[] | undefined
  if (win) {
    const groups = new Map<string, any[]>()
    for (const r of kept) {
      const k = keyOf(r)
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(r)
    }
    const matched = [...groups].filter(([, rs]) => rs.some(hit))
    streams = matched.length ? matched.map(([k, rs]) => stat(k, rs, win)) : [silent((args.stream || '').trim(), win)]
  }

  // 过滤走**原始行**(分类键 label 只在原始行上,DrawRow 里没有它 —— 拿 DrawRow 去筛 'cec' 会全军覆没)
  const out = kept.filter(hit).map(rowOf).slice(0, limit)
  if (out.length) {
    return {
      province, availability: 'ok', rows: out, ...(scale ? { scale } : {}), ...(win ? { window: win } : {}), streams,
      ...(province === 'FED'
        ? { note: '联邦 Express Entry 轮次,分制是 CRS —— 与各省的 SIRS/WEOI/MPNP EOI 互不相通,分数不能互换' }
        : {}),
    }
  }
  // 有记录、只是没有匹配这一类:是「这类停了」,**不是**「本站没有这个省的数据」——两句话在用户那里意思相反
  if (win && streams) return { province, availability: 'not-collected', rows: [], note: streams[0].note, ...(scale ? { scale } : {}), window: win, streams }
  const policy = DRAWS_POLICY[province]
  return {
    province,
    availability: policy?.availability ?? 'not-collected',
    rows: [],
    note: policy?.note ?? `本站未收录 ${province} 的抽选记录 —— 不等于该省没有抽选`,
  }
}

// ── ⑤ lookupOps:官方运营统计(处理时长 / 配额 / 池内人数 / 池分布)────────────────

type OpsMetric = {
  /**
   * metric 词表(ETL 只产这些):
   *   AB  allocation / issued / remaining / to_process / assessing_up_to / eoi_pool(_total)
   *   SK  processing_weeks / allocation / nominations_ytd / capped_pct / capped_spots / priority_sector
   *   BC  sirs_pool / processing_months
   *   MB  allocation / nominations_ytd / nominations_enhanced_ytd / refusals_ytd / laa_ytd /
   *       applications_received_ytd / in_assessment / pending_assessment / inventory /
   *       processing_days(_approved/_refused)/ processing_commitment
   * ⚠️ 处理时长的后缀 = **官方发布的单位**,不换算(SK 发周、BC 发月、MB 发天)——
   *    3 个月折成 13 周是替官方编了个它没给的精度。
   */
  key: string
  scope: string          // 适用范围值(通道名 / 行业 / SIRS 分数段 / 阶段名;省级为空串)
  scopeKind: string      // stream / sector / category / scoreRange / stage(省级为空串)—— 说明 scope 是哪一类
  /**
   * 跨指标 join 的键(ETL 在 mart 侧归一,本层只读不算 —— 清洗下沉,见 09_build_mart.stream_key)。
   * 为什么要它:官网两张表对同一条通道措辞不同(streams[]「Accelerated Tech Pathway (eligible list…)」
   * vs eoiPool[]「Accelerated Tech Pathway」),编排层拿 scope 字符串等值拼「配额+池内人数+积压游标」会**静默漏配**。
   * 只对 scopeKind='stream' 非空;**不展示给用户**(要引用就用 scope/label 的官方原文)。
   */
  streamKey: string
  label: string          // 官方原文
  /**
   * 🔴 可空是本字段的立身之本(建表 SQL 同款红线):官方的**隐私抑制值**(AB「Less than 10」)
   * 与「本项不适用」(Not applicable)、纯文本游标(assessing_up_to 恒 null)一律 value=null,
   * 原文进 valueText。**null 不是 0** —— 折成 0 就是替官方编了个数字,报告会说出「已发 0」这种假话。
   * 本层绝不用 `?? 0` 兜底;调用方看到 null 就该念 valueText,不许自己填数。
   */
  value: number | null
  valueText: string      // value=null 时的官方原文("Less than 10" / "Not applicable" / "May 8, 2026 …")
  unit: string           // people / weeks / months / days / nominations / applications / invitations / percent / spots / text / flag
  asOf: string           // 官方口径日(AB 与 BC 池分布有);SK/MB 与 BC 处理时长没有,看 period
  period: string         // 统计期(SK "2026Q2" / MB "2026 Jan-Jun"、"2026-06"、"2024";AB 与 BC 为空)
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
 * availability 按**查到的行**说话:有行=ok;没行但官方公布(AB/SK/BC/MB/ON)=not-collected
 * (本站未收录,不是「没有」);官方确实不公布=not-published;QC 不走这套体系=not-applicable。
 * 2026-08-04 起运营统计这一路**没有 not-published 的省** —— 九省逐个核过,能查到的官方披露都进了库
 * 或至少落在 not-collected(ON 的年度配额)。再往 OPS_POLICY 里写 published:false 前先拿出实证。
 */
export async function lookupOps(pool: any, args: { prov: string }): Promise<OpsResult> {
  const province = upper(args.prov)
  const p = OPS_POLICY[province]
  const { rows } = await pool.query(
    // stream_key 走 to_jsonb 取:列缺失时返回 NULL 而不是 42703。additive 列上生产**之前**这段代码
    // 也能照常查(否则整表查询报错 → 全省回落 not-collected,DDL/push 谁先谁后就成了线上开关)。
    SQL.PNP_OPS_METRICS, [province],
  ).catch(() => ({ rows: [] }))
  const metrics: OpsMetric[] = (rows ?? []).map((r: any) => ({
    key: r.metric ?? '', scope: r.scope ?? '', scopeKind: r.scope_kind ?? '',
    streamKey: r.stream_key ?? '', label: r.label ?? '',
    value: r.value == null ? null : numOf(r.value),   // 🔴 null 原样带出,永远不 `?? 0`
    valueText: r.value_text ?? '', unit: r.unit ?? '', asOf: r.as_of ?? '', period: r.period ?? '',
    evidence: { url: r.url, fetched: r.fetched ?? '', label: r.label ?? '', ...(r.section ? { section: r.section } : {}) },
  }))
  // 一个省可能有**多个官方源**(BC:池分布页 + 通道页的处理时长;MB:月度数据页 + 年报)——
  // officialUrl 取「行数最多的那一页」= 该省运营统计的主页面,而不是排序碰巧排在前面的那一行,
  // 否则加一个小节(3 行处理时长)就能把主出处顶掉,报告里的「官方页」链接随之漂移。
  // 逐个数字的出处一律看 metric.evidence.url,本字段只是给「去哪看」用的便利入口。
  const urlCount = new Map<string, number>()
  for (const m of metrics) if (m.evidence.url) urlCount.set(m.evidence.url, (urlCount.get(m.evidence.url) ?? 0) + 1)
  const officialUrl = [...urlCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || p?.url || ''
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

type EeRow = {
  category: string
  label: string
  teer: number | null
  drawCrs: number | null      // 该类别最近一次类别抽选的最低 CRS(null = 该类别本站无抽选记录)
  drawDate: string
  drawSize: number | null
  evidence: Evidence
}
type EeResult = {
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
    SQL.EE_CATEGORIES_BY_NOC, [noc],
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

// ── ⑦ lookupPermit:联邦工签规则(pnp_requirements 的 FED 行)────────────────────

type PermitRule = {
  program: string        // PGWP / PR-fees …(库里的 program 字段,原样带出)
  stream: string         // 官方分档:masters / short / long / degree / college;'' = 不分档的通则
  factor: string         // pgwpLength / pgwpCombine / pgwpOnce / pgwpWindow / pgwpMinProgram / pgwpLanguage
  op: string             // >= / <= / = / rule('rule' = 是条规则不是道门槛,别拿 value 去比大小)
  /** 🔴 可空同 OpsMetric:'rule' 行与「跟课程一样长」这类没有绝对数的行 value 恒 null,**不许 ?? 0** */
  value: number | null
  valueText: string      // 官方原句(quote-anchored:ETL 每轮验证它仍在页面上)——引用一律用这句
  unit: string           // months / days / CLB / lifetime / ''
  basis: string          // 口径速记(permit=36;minProgramMonths=24 …)。说这一行之前先看它,口径不同话就是假的
  label: string
  evidence: Evidence
}

/** 官方规则之间确有明确断层时才登记；不能把同一官方页面「工签有效期」下连续列出的分档误拆成断层。 */
type PermitGap = {
  kind: 'not-written'    // 官方原文没写这一跳。**不是「不允许」也不是「允许」** —— 只有 IRCC 能填这个空
  between: string[]      // 断层两端各自的官方事实(factor 或 factor|stream)
  claim: string          // 民间常见的那条推论(原样写出来,好让上层点名说「这一条没有官方依据」)
  note: string
  evidence: Evidence[]   // 两端各自的出处:两条都在,**中间没有桥**
}

export type PermitResult = {
  program: string
  availability: Availability
  rules: PermitRule[]
  gaps: PermitGap[]      // 空数组 = 这个 program 本站没登记断层,**不代表官方写全了**
  note: string
}

const PERMIT_GAPS: Record<string, { between: string[]; claim: string; note: string }[]> = {}

/**
 * 「我的工签能有多久 / 有哪些硬条件」= SELECT pnp_requirements WHERE province='FED'。
 * PGWP 是**联邦**规则,与省无关(所以不收 prov 参数);九条规则本来就在库里,只是前六个工具都读不到。
 * 本层照旧**不判定**:不问用户读了几年、不算他能拿几年 —— 只摆官方分档 + 原句 + 出处,
 * 外加官方**没写**的那一跳(gaps)。按 program / factor 过滤,不加其他参数。
 */
export async function lookupPermit(pool: any, args: { program?: string; factor?: string } = {}): Promise<PermitResult> {
  const program = (args.program || 'PGWP').trim()
  const factor = (args.factor || '').trim()
  const { rows } = await pool.query(
    SQL.PERMIT_RULES, [program],
  ).catch(() => ({ rows: [] }))
  const all: PermitRule[] = (rows ?? [])
    .filter((r: any) => !!(r.url || r.page_url))          // 无出处的规则不返回(铁律 ①)
    .map((r: any): PermitRule => ({
      program: r.program ?? program, stream: r.stream ?? '', factor: r.factor ?? '', op: r.op ?? '',
      value: r.value == null ? null : numOf(r.value),     // 🔴 null 原样带出,永远不 `?? 0`
      valueText: r.value_text ?? '', unit: r.unit ?? '', basis: r.basis ?? '', label: r.label ?? '',
      evidence: {
        url: r.url || r.page_url, fetched: r.fetched ?? '', label: r.value_text ?? '',
        ...(r.section ? { section: r.section } : {}), ...(r.effective ? { effective: r.effective } : {}),
      },
    }))
  // 断层按**全量**行认领(不受 factor 过滤影响):只查 pgwpLength 的人同样得看见「合并那一跳官方没写」
  const idOf = (r: PermitRule) => (r.stream ? `${r.factor}|${r.stream}` : r.factor)
  const gaps: PermitGap[] = (PERMIT_GAPS[program] ?? [])
    .map((g) => ({ ...g, ends: g.between.map((id) => all.find((r) => idOf(r) === id || r.factor === id)) }))
    .filter((g) => g.ends.every(Boolean))                 // 两端都在库里才敢说「中间没有桥」
    .map((g): PermitGap => ({
      kind: 'not-written', between: g.between, claim: g.claim, note: g.note,
      evidence: g.ends.map((r) => r!.evidence),
    }))
  const rules = factor ? all.filter((r) => r.factor === factor) : all
  if (!rules.length) {
    return {
      program, availability: 'not-collected', rules: [], gaps,
      note: factor
        ? `本站未收录 ${program} 的 ${factor} 条款 —— 不等于官方没有这一条`
        : `本站未收录 ${program} 的官方条款 —— 不等于官方没有这个项目`,
    }
  }
  return {
    program, availability: 'ok', rules, gaps,
    note: `${program} 是联邦规则(与省提名无关),以上每条都挂官方原句`
      + (gaps.length ? ';官方没写的接口另列在 gaps 里' : ''),
  }
}

// ── ⑧ lookupCrs:联邦计分表(ee_points_grid)──────────────────────────────────

type CrsGrid = 'CRS' | 'FSW67'
type CrsRow = {
  grid: CrsGrid
  section: string
  sectionLabel: string
  kind: string
  tableNo: number | null
  heading: string
  factor: string
  criterion: string
  columnLabel: string
  /** 官方写 n/a / Not eligible to apply 时恒 null,原文在 pointsText；绝不能折成 0。 */
  points: number | null
  pointsText: string
  seq: number | null
  evidence: Evidence
}
export type CrsLookupArgs = {
  grid: CrsGrid | string
  section?: string
  kind?: 'summary' | 'detail'
  factor?: string
  criterion?: string
  limit?: number
}
export type CrsResult = {
  grid: string
  availability: Availability
  rows: CrsRow[]
  note: string
}

/**
 * 「CRS 这一档几分 / FSW 67 分怎么给」= ee_points_grid。
 *
 * 🔴 CRS 与 FSW67 是官方定义的两套分:前者是进池后的排名分,后者是 FSW 够不够资格进池的
 * 67/100 选择因素。本查询的 SQL 第一条约束永远是 `grid = $1`,其余筛选只能排在它后面；
 * 返回前再按 grid 防御性过滤一次,避免测试替身或上游误实现把两套分混进同一结果。
 * `points` 可空:官方的 n/a / Not eligible to apply 原样放在 pointsText,不拿 0 冒充。
 */
export async function lookupCrs(pool: any, args: CrsLookupArgs): Promise<CrsResult> {
  const grid = upper(args.grid)
  if (grid !== 'CRS' && grid !== 'FSW67') {
    return { grid, availability: 'not-applicable', rows: [], note: '只支持 CRS 排名分与 FSW67 资格分,这不是其中一套分制' }
  }
  const section = (args.section || '').trim()
  const kind = (args.kind || '').trim()
  const factor = (args.factor || '').trim()
  const criterion = (args.criterion || '').trim()
  const limit = Math.min(Math.max(args.limit ?? 240, 1), 240)
  const result = await pool.query(
    SQL.EE_POINTS_GRID, [grid, section, kind, factor, criterion, limit],
  ).catch(() => null)
  if (!result) return { grid, availability: 'not-collected', rows: [], note: `本站 ${grid} 官方计分表暂不可用` }
  const rows: CrsRow[] = (result.rows ?? [])
    .filter((r: any) => upper(r.grid) === grid && !!r.url) // SQL 已先筛 grid；这里是第二道防混表护栏
    .map((r: any): CrsRow => ({
      grid: grid as CrsGrid,
      section: r.section ?? '', sectionLabel: r.section_label ?? '', kind: r.kind ?? '',
      tableNo: numOf(r.table_no), heading: r.heading ?? '', factor: r.factor ?? '',
      criterion: r.criterion ?? '', columnLabel: r.column_label ?? '',
      points: r.points == null ? null : numOf(r.points), // null 原样带出,真 0 仍是 0
      pointsText: r.points_text ?? '', seq: numOf(r.seq),
      evidence: { url: r.url, fetched: r.fetched ?? '', label: r.heading ?? '' },
    }))
  if (!rows.length) {
    return {
      grid, availability: 'not-collected', rows: [],
      note: `本站未收录 ${grid} 计分表中符合这组筛选的档位 —— 不等于官方没有`,
    }
  }
  return {
    grid, availability: 'ok', rows,
    note: grid === 'CRS'
      ? 'CRS 是进池后的排名分,不能与 FSW 67 分资格线相加'
      : 'FSW67 是 FSW 入池资格的 67/100 选择因素,不能与 CRS 排名分相加',
  }
}

// ── ⑨ checkClaims:外部主张对账三分法 ────────────────────────────────────────

/**
 * 主张能落到哪张官方表上。前六个各对应一个查询工具;`private-promise` 是**第七个桶,它不查任何表** ——
 * 「某省有合作公司 / 内部渠道 / 保 offer / 我认识人」这类私人承诺,库里根本没有对应的事实。
 *
 * 为什么必须单列(2026-08-04 实录):用户说「中介说曼省有合作公司让我去曼省」,编排层把它归到 ops,
 * checkClaims 就真去查 MPNP 月度运营统计,答出来是「MPNP 发不发月度运营数据」——
 * **问的是"有没有合作公司",答的是"发不发统计报表"**。硬查一张不相干的表再把结果当答复,
 * 比说"核不了"坏得多:数据一变(MB 运营数据进库那天)这条主张就从"官方不公布"变成了"ok",
 * 等于替中介的承诺背了书。
 */
export type ClaimTopic = 'coverage' | 'thresholds' | 'jobs' | 'draws' | 'ops' | 'ee' | 'private-promise'
/** 中介/朋友的一句话。text 原样带回(不改写别人的话);topic/province 由编排层从自然语言里抽。 */
export type Claim = { text: string; topic: ClaimTopic; province?: string }
type ClaimCheck = {
  claim: Claim
  bucket: 'checked' | 'uncheckable'
  availability: Availability
  facts: unknown          // 对应工具的返回原样嵌入(数字都带 evidence)
  why?: string            // uncheckable 时说清是"官方不公布"还是"本站没收录"
}
/** 第三格:他没说的 —— 同一个职业,本站查得到但这些主张一个字没提的省 */
type UnsaidItem = { province: string; facts: ProvCoverage }
type ClaimsResult = { noc: string; checked: ClaimCheck[]; uncheckable: ClaimCheck[]; unsaid: UnsaidItem[] }

/**
 * 私人承诺的判据 = **原话**,不是编排层给的 topic。
 * topic 是模型猜的:遇到「有合作公司」它只会在六个官方 topic 里挑一个最像的(实测挑了 ops),
 * 于是一条核不了的主张被硬塞进一张查得到的表。这里按原话兜底改判,任何 topic 进来都先过这道筛。
 * 只收**承诺私人关系/内部通道/打包票**的词;「两个月就下来」(ops)、「曼省缺木匠」(coverage)
 * 这些是能对账的事实主张,不许被吃掉。
 */
export const PRIVATE_PROMISE =
  /合作(公司|企业|雇主|单位|关系)|内部(渠道|名额|指标|关系|价)|内推名额|走关系|有关系|认识(人|领导|移民官)|特殊渠道|绿色通道|(?:老板|雇主).{0,12}(?:帮|协助).{0,8}(?:办|申请|提名|手续)|包(过|下来|拿)|包.{0,12}(offer|提名|省提名|pr\b)|保(过|证过|证拿|证能|你拿|你过)|包?保\s*offer|保证.{0,12}(offer|提名|批)|partner(ed|ship)? (compan|employer|firm)|inside (track|channel|connection)|guarantee\w*.{0,40}\b(offer|nomination|pr\b|approval)|(?:employer|boss|restaurant).{0,40}(?:help|handle|support).{0,30}(?:apply|application|nomination|paperwork|process)|보장.{0,20}(오퍼|지명|승인)|(오퍼|지명|승인).{0,30}보장|(고용주|사장).{0,30}(도와|돕|지원|처리).{0,20}(신청|절차|지명)?|특별 (경로|채널)|내부 (경로|채널)|special (channel|access)|connections? (at|with|inside)/i

/**
 * availability='ok' 时的 why:**一句结论**,不超过一行。
 * 消费端(facts.ts 的 fact())把 why 截到 110 字 —— 原来 ops 的 why 直接引 OPS_POLICY.note
 * (实测 200+ 字),截完是半句话。完整的官方原文注留在 facts 里(coverage.note / ops.note …),
 * 前端出处用那一份,这里只回一句"能对照,数字在上面"。
 */
const OK_WHY: Record<ClaimTopic, string> = {
  coverage: '这条能对照:官方职业清单本站已收录,收没收这个职业见上面的清单行',
  thresholds: '这条能对照:该省官方门槛条款本站已收录,逐条列在上面',
  jobs: '这条能对照:上面是本站职位板索引里的在招数(不是该省全部空缺)',
  draws: '这条能对照:该省官方抽选记录本站已收录,最近一轮见上面',
  ops: '这条能对照:该省官方运营统计本站已收录,数字与口径见上面',
  ee: '这条能对照:IRCC 类别抽选清单本站已收录,命中与否见上面',
  'private-promise': '',    // 私人承诺永远到不了 ok
}
/** 私人承诺不是一项政府数据:不推断“官方不公布”,只标明它不能当作官方保证。 */
const PRIVATE_PROMISE_WHY =
  '私人承诺本身不能当作官方资格或结果保证,需按官方清单和门槛逐项对照'

/**
 * 「中介说 X」。本工具**只对账,不评价**:每条主张挂上对应的官方事实与出处,
 * 核不了的说清核不了的原因,再把"他没提的省"单列一格(中介只会说他有渠道的那个省)。
 * 私人承诺(合作公司/内部渠道/保 offer)按原话改判进 private-promise 桶,**不查任何表**:
 * 拿一张不相干的官方表去应付它,答出来的就是答非所问(见 ClaimTopic 注释的实录)。
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
    // 原话优先于 topic:模型认不出私人承诺,只会挑一个最像的官方 topic(见 ClaimTopic 注释的实录)
    const topic: ClaimTopic =
      claim.topic === 'private-promise' || PRIVATE_PROMISE.test(claim.text || '') ? 'private-promise' : claim.topic
    let availability: Availability = 'not-collected'
    let facts: unknown = null
    let why = ''
    if (topic === 'private-promise') {
      // 一张表都不查:查了也只会查出一个不相干的答案(这就是本桶存在的理由)
      availability = 'not-applicable'
      why = PRIVATE_PROMISE_WHY
    } else if (topic === 'coverage') {
      const c = prov ? covOf(prov) : null
      availability = c?.availability ?? 'not-collected'
      facts = c ?? null
      why = c?.note ?? '主张没指明省份,查不了'
    } else if (topic === 'thresholds') {
      const t = thresholds?.provinces.find((r) => r.province === prov) ?? null
      availability = t?.availability ?? 'not-collected'
      facts = t
      why = t?.note ?? '主张没指明省份,查不了'
    } else if (topic === 'jobs') {
      const rows = prov ? jobs.rows.filter((r) => r.province === prov) : jobs.rows
      availability = jobs.availability
      facts = { scope: jobs.scope, checkedAt: jobs.checkedAt, rows }
    } else if (topic === 'draws') {
      const d = await lookupDraws(pool, { prov })
      availability = d.availability
      facts = d
      why = d.note ?? ''
    } else if (topic === 'ops') {
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
    // ok 的 why 一律换成一句结论(长注留在 facts 里给出处用),见 OK_WHY 注释
    if (availability === 'ok') why = OK_WHY[topic]
    // topic 带回**改判后**的值:原话说了算,消费端才知道这条为什么没去查表(text 仍是原话,一字不改)
    const row: ClaimCheck = { claim: { ...claim, topic }, bucket: availability === 'ok' ? 'checked' : 'uncheckable', availability, facts, ...(why ? { why } : {}) }
    ;(row.bucket === 'checked' ? checked : uncheckable).push(row)
  }

  // 他没说的:本站**查得到具名命中**、而这些主张一个字没提的省(不排序、不推荐,只列出来)
  const unsaid: UnsaidItem[] = coverage.provinces
    .filter((c) => !mentioned.has(c.province) && c.availability === 'ok' && c.hits.length > 0 && !c.excluded)
    .map((c) => ({ province: c.province, facts: c }))

  return { noc, checked, uncheckable, unsaid }
}

// ── ⑨ lookupPlan:时间线(C3 planTimeline.buildPlan 的薄封装)──────────────────

/**
 * 「我这条路大概要多久 / 走哪条更快」。
 *
 * 本工具**一行算术都不做**:入参由上面三个 lookup 原样装配(门槛 / 抽选 / 运营统计),
 * 算术全在 `planTimeline.buildPlan`(纯函数、有单测、四条红线写在它自己文件顶上)。
 * 之所以要这一层,是因为 buildPlan 不查库 —— 它的每个月数都得由**库里带 evidence 的行**喂进去,
 * 而喂给它什么正是这里的职责:喂错一张表,它照样算得出数,只是那个数没有出处撑着。
 *
 * 三件**故意不做**的事(都属红线 ①「不许编时长」):
 *  ① **不替用户挑通道**:省内按多条通道分别公布处理时长时(SK)不给 `processingScope`,
 *     buildPlan 会把这一段判成算不出。调用方真知道走哪条(用户说了)才按省传进来。
 *  ② **不设 noDrawStep**:「该通道不进池」是**通道级**事实(SINP 只有 Employment Offer 子类如此),
 *     光知道省份推不出来。宁可让抽选段落 not-collected,也不拿「库里没抽选记录」推成「不用抽选」。
 *  ③ **不带金额**:官方规费与中介报价是另一个题目(checkClaims 那条路),时间线不掺钱。
 */
export type PlanResult = {
  noc: string
  availability: Availability
  /** 口径:这条时间线**算的是哪几段**、不算哪些 —— 摆数字之前先把边界说清楚 */
  scope: string
  plan: Plan
  note: string
}

/** 一次最多铺几条路。上限不是性能顾虑而是可读性:四条以上没人对得过来,而每条都要两次查询。 */
const MAX_PLAN_PATHS = 4

export async function lookupPlan(
  pool: any,
  args: {
    noc: string
    teer?: number | null
    provs?: string[]
    profile?: Partial<RuleProfile>
    /** 省 → 官方处理时长口径原文(如 SK 的 'Employment Offer')。不给 = 不替你挑(见上面 ①) */
    processingScope?: Record<string, string>
  },
): Promise<PlanResult> {
  const noc = (args.noc || '').trim()
  // QC 不走 PNP,没有「省提名时间线」这回事(同 lookupCoverage 的短路)
  const provs = provList(args.provs).filter((p) => p !== 'QC').slice(0, MAX_PLAN_PATHS)
  const scope = '时间线只含三段:门槛缺口(还差多久)、官方开一轮抽选的间隔、官方公布的处理时长。'
    + '签证、体检、雇主招你花多久、你自己准备材料花多久 —— 本站没有官方数据,一律不在这条线里'
  if (!provs.length) {
    return {
      noc, availability: 'not-applicable', scope,
      plan: buildPlan({ thresholds: { noc, title: '', teer: args.teer ?? null, provinces: [] }, paths: [] }),
      note: '只点了魁省:魁省自有选拔体系,不属 PNP,没有省提名这条时间线可算',
    }
  }
  const thresholds = await lookupThresholds(pool, { noc, teer: args.teer, provs, profile: args.profile })
  const paths: PlanPathInput[] = await Promise.all(provs.map(async (province): Promise<PlanPathInput> => {
    const [draws, ops] = await Promise.all([lookupDraws(pool, { prov: province }), lookupOps(pool, { prov: province })])
    return {
      province,
      thresholds: thresholds.provinces.find((p) => p.province === province) ?? null,
      draws,
      ops,
      ...(args.processingScope?.[province] ? { processingScope: args.processingScope[province] } : {}),
    }
  }))
  const plan = buildPlan({ thresholds, paths })
  const steps = [...plan.ranked, ...plan.partial].flatMap((p) => p.steps)
  // 四态按**算出来的段**说话:有一段算得出就 ok(其余段各自带着自己的四态);
  // 一段都算不出时,只有**每一段都是官方不公布**才敢说 not-published —— 那是最容易撒谎的一态,
  // 混着「本站未收录」就一律按 not-collected 说(把我们的窟窿赖给官方,比说「不知道」坏得多)。
  const availability: Availability =
    steps.some((s) => s.months != null) ? 'ok'
      : steps.length && steps.every((s) => s.availability === 'not-published') ? 'not-published'
        : 'not-collected'
  return {
    noc, availability, scope, plan,
    note: availability === 'ok'
      ? '每段月数都挂着官方出处;算不出的段留空并说明是「官方不公布」还是「本站未收录」,不折成 0。'
        + '含未知段的路径只给**下界**,不给总数'
      : `本站算不出 ${provs.join('/')} 的时间线:三类数据(门槛 / 抽选 / 处理时长)没有一段能落到有出处的月数上`,
  }
}

// ── ⑩ lookupVerdict:路径裁决(C5b pathVerdict 的薄封装,C5c)────────────────────
//
// 本工具**一条判定规则都不写**:注册表、排除口径、tier 分档、估分全在 `lib/pathVerdict.ts`
// (纯函数 + rows 入参,29 条测试盯着)。这一层只干两件事:把六张表按 mart 的 snake_case 列查出来
// 喂进去、把结果原样带出来。理由同 lookupPlan —— 那边算术全在 buildPlan,这边判定全在 pathVerdict;
// 之所以还要这一层,是因为纯函数不查库,而**喂它哪张表**正是这里的职责(喂错一张,它照样算得出结果,
// 只是那个结果没有出处撑着)。
//
// 三件**故意不做**的事:
//   ① 不补默认档案:profile 里缺的槽原样传 null —— pathVerdict 会把该通道判成 needs-info,
//      那正是对的答案(编排层据此反问),不是让这里猜一个「一般人」的年龄/语言。
//   ② 不合并四态:库里一行门槛都没有 → not-collected(本站的缺口),**不说成「官方没有要求」**。
//   ③ 不排序、不挑「推荐哪条」:pathVerdict 自己按 open→needs-info→excluded 排好,本层原样返回。

export type VerdictResult = {
  availability: Availability
  /** 13 条通道的裁决,pathVerdict 排好序原样带出(open 按 tier 升序在前 → needs-info → excluded 沉底) */
  pathways: PathwayVerdict[]
  levers: VerdictLever[]
  /** 口径:这是按官方门槛做的粗筛信号,不是资格认定 */
  scope: string
  note: string
}

const VERDICT_SCOPE =
  '路径判定的口径:逐条通道拿官方门槛条文与这份档案对照,每条判定都挂官方原句与出处。'
  + '这是粗筛信号,不是资格认定 —— 各省还有自己的清单、语言与工资细则,最终以官方受理为准'

/**
 * 判定层的六张表一次读齐(pathVerdict 的 VerdictData)。
 * 从 lookupVerdict 抽出来单独导出:职位详情页的通道卡(/api/pathways)也要同一份数据,
 * 两处各写一遍 SELECT 迟早列名对不上。
 */
export async function loadVerdictData(pool: any): Promise<VerdictData> {
  const rowsOf = async (sql: string, params: unknown[] = []): Promise<any[]> => {
    const r = await pool.query(sql, params).catch(() => ({ rows: [] }))
    return (r?.rows ?? []) as any[]
  }
  const [reqRows, occRows, drawRows, factorRows, gridRows, empRows] = await Promise.all([
    // applies_condition 走 to_jsonb 取(同 reportFacts):列缺失时返回 NULL 而不是 42703 —— 
    // additive 列上生产**之前**这段也能照常查,不让 DDL/push 谁先谁后变成线上开关
    rowsOf(SQL.PNP_REQUIREMENTS_ALL),
    rowsOf(SQL.PNP_OCCUPATIONS_FULL),
    rowsOf(SQL.PNP_DRAWS_FULL),
    rowsOf(SQL.PNP_SCORE_FACTORS),
    rowsOf(SQL.EE_POINTS_GRID_2),
    // 指定雇主名录 3476 行里,pathVerdict 只读 NL 那一段(NLPNP 的 supporting fact:
    // 「名录里有几家申报过这个 NOC」,分母也是 NL 自己那 639 家)。整表拉回来纯属浪费带宽。
    rowsOf(SQL.DESIGNATED_BY_PROV_2),
  ])

  const data: VerdictData = {
    requirements: reqRows.map((r): Requirement => ({
      province: r.province ?? '', program: r.program ?? '', stream: r.stream ?? '', subject: r.subject,
      factor: r.factor ?? '', op: r.op ?? '', value: numOf(r.value), valueText: r.value_text ?? '', unit: r.unit ?? '',
      appliesTeer: r.applies_teer ?? '', appliesNoc: r.applies_noc ?? '', excludesNoc: r.excludes_noc ?? '',
      appliesArea: r.applies_area ?? '', appliesCondition: r.applies_condition ?? '',
      familySize: numOf(r.applies_family_size), basis: r.basis ?? '', label: r.label ?? '',
      section: r.section ?? '', effective: r.effective ?? '',
      url: r.url ?? '', pageUrl: r.page_url ?? '', fetched: r.fetched ?? '',
    })),
    occupations: occRows.map((r): OccupationRow => ({
      province: r.province ?? '', stream: r.stream ?? '', label: r.label ?? '', program: r.program ?? '',
      type: r.type ?? '', url: r.url ?? '', fetched: r.fetched ?? '', appliesTo: r.applies_to ?? '',
      noc: r.noc ?? '', name: r.name ?? '', gtaRestricted: !!r.gta_restricted,
    })),
    draws: drawRows.map((r): VerdictDrawRow => ({
      province: r.province ?? '', label: r.label ?? '', scale: r.scale ?? null, url: r.url ?? '',
      fetched: r.fetched ?? '', kind: r.kind ?? '', drawDate: String(r.draw_date ?? '').slice(0, 10),
      stream: r.stream ?? '', score: numOf(r.score), invitations: numOf(r.invitations), note: r.note ?? '',
    })),
    scoreFactors: factorRows.map((r): ScoreFactor => ({
      province: r.province ?? '', system: r.system ?? '', factor: r.factor ?? '', kind: r.kind ?? 'row',
      seq: Number(r.seq ?? 0), label: r.label ?? '', points: numOf(r.points), xorPrev: !!r.xor_prev, rule: r.rule ?? '',
      factorMax: numOf(r.factor_max), factorGroup: r.factor_group ?? '', groupMax: numOf(r.group_max),
      passMark: numOf(r.pass_mark), maxTotal: numOf(r.max_total),
      guideEffective: r.guide_effective ?? '', fetched: r.fetched ?? '', url: r.url ?? '',
    })),
    eeGrid: gridRows.map((r): EeGridRow => ({
      grid: r.grid ?? '', section: r.section ?? '', sectionLabel: r.section_label ?? '', kind: r.kind ?? '',
      tableNo: numOf(r.table_no), heading: r.heading ?? '', factor: r.factor ?? '', criterion: r.criterion ?? '',
      columnLabel: r.column_label ?? '', points: numOf(r.points), pointsText: r.points_text ?? '',
      seq: numOf(r.seq), url: r.url ?? '', fetched: r.fetched ?? '',
    })),
    designatedEmployers: empRows.map((r): DesignatedEmployerRow => ({
      name: r.name ?? '', province: r.province ?? '', location: r.location ?? '', isTech: !!r.is_tech,
      source: r.source ?? '', nocs: r.nocs ?? '', url: r.url ?? '', fetched: r.fetched ?? '',
    })),
  }
  return data
}

export async function lookupVerdict(
  pool: any, profile: VerdictProfile, opts: { clbTarget?: number; teerDowngradeNoc?: string } = {},
): Promise<VerdictResult> {
  const data = await loadVerdictData(pool)

  // 门槛条文一行都没有 = **本站的缺口**,不是「官方没有门槛」。这时不跑判定:
  // 跑出来的 13 条全是 needs-info,除了把这句话说十三遍没有别的信息。
  if (!data.requirements.length) {
    return {
      availability: 'not-collected', pathways: [], levers: [], scope: VERDICT_SCOPE,
      note: '本站未收录省提名门槛条文,这一轮判不了路径 —— 是本站的缺口,不等于官方没有要求',
    }
  }
  return {
    availability: 'ok',
    pathways: pathVerdict(profile, data),
    levers: pathLevers(profile, data, opts),
    scope: VERDICT_SCOPE,
    note: '每条通道的排除理由都带官方原句;库里缺门槛行的通道标 needs-info(本站未收录),不拿别处的记忆填',
  }
}
