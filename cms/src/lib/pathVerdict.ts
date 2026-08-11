// C5b · 判定层 pathVerdict —— 一套档案进,13 条通道的裁决出。
// 契约照抄 docs/implementation/C5-判定层pathVerdict-20260805.md §三(定稿,不许改形状);
// 通道知识的人肉核对版见 docs/design/案例C01-马龙木匠路径-路径分析-20260805.md §二/§三/§九。
//
// 总红线(与 chatTools.ts 同一条):**判定、数字、出处一律从这一层出,LLM 只组稿**。
// 本文件自己的四条铁律:
//   ① reasons 里的 `quote` 只许来自数据行的 valueText / label / note —— 代码里**一句手写的「官方原句」都不许有**。
//      PNP 门槛行的 valueText 多为空,官方原文落在 label(见 rules.ts 的 Requirement.label 注释),故 quote = valueText || label。
//   ② 库里没有的门槛(如 AIP 的经验门槛行)→ verdict='needs-info' + availability='not-collected',
//      **不许拿案例文档的记忆(1,560 小时)当库**。「本站未收录」和「官方没有这条」是两件事。
//   ③ 四态(ok / not-published / not-collected / not-applicable)不合并;每个数字带 evidence。
//   ④ 分值一分都不许在这里编:CRS 走 crsEstimate(ee_points_grid)、MPNP 走 mbEoiEstimate(pnp_score_factors),
//      抽选线走 pnp_draws。本文件只负责「挑对哪一行 / 对照哪条线」。
//
// verdict 语义(实施文档 C5b 定稿,消 C01 文档里「已排除」的双关):
//   excluded  = 有**攒时间补不齐**的硬伤(分数鸿沟:语言拉满后的上界仍够不着抽选线;或职业清单型硬伤)
//   open+tier = 未达门槛的全是可积累项(经验 / 居住),tier = offer 到手后还要等多久
//               (0=Day0 / 1=3-6 月 / 2=12 月 / 3=24 月)
//   needs-info= 缺档案槽,**或库里缺这条通道的门槛行**(后者 availability='not-collected')。
//               其 tier = **潜力上界**(缺槽的门槛按 0 经验/0 居住的最坏情况记档;库缺行 = null)
//
// 纯函数 + rows 显式入参(不连库、不调 LLM)。消费方(C5c lookupVerdict)自己喂 mart 行进来。

import { evaluateRequirements, teerHit, type Requirement, type RuleProfile, type RuleResult } from './rules'
import { estimateCrs, type CrsEstimateProfile, type EeGridRow } from './crsEstimate'
import { estimateMbEoi, type MbEduKey, type MbProfile } from './mbEoiEstimate'
import { streamMatches, type ScoreFactor } from './pnpSelfScore'
import type { EduKey } from './pnpSelfScore'
// 只 import type:编译期擦除,不给 chatTools(它拉着 match/planTimeline/reportFacts)加运行时边。
import type { Availability, Evidence } from './chatTools'

// ── 契约(实施文档 §三,照抄)──────────────────────────────────────────────────

export type VerdictProfile = {
  age: number | null
  married: boolean | null            // 配偶是否随行申请(CRS 单身/已婚两套表)
  clb: number | null                 // 四项最低(站内口径,同 RuleProfile.clb)
  edu: EduKey | null                 // 沿用 pnpSelfScore 阶梯
  eduYears: number | null            // 学制年数(2 年制 → PGWP 3 年)
  canadaStudy: boolean | null        // 有无加拿大学历
  studyProvince: string | null
  noc: string | null
  teer: number | null
  expCanadaMonths: number | null     // 同职业加拿大受雇经验(自雇不计的口径由通道规则判)
  expForeignMonths: number | null
  foreignExpSelfEmployed: boolean | null   // 海外经验是否全为自雇(C01:开商店=自雇→多通道记 0)
  status: string | null              // pgwp / study / worker / other
  province: string | null            // 现居省
}

export type VerdictReason = {
  kind: 'excluded' | 'gap' | 'met' | 'needs-info'
  text: string                       // 人话一句(措辞层再翻译)
  quote?: string                     // 官方原句(excluded 必带)
  evidence?: Evidence
}

export type PathwayVerdict = {
  key: string                        // 'FED-EE' / 'ON-workforce' / 'MB-swm' / 'SK-offer' / 'AIP' / ...
  province: string                   // 'FED' 或省码
  stream: string                     // 官方通道名
  verdict: 'excluded' | 'open' | 'needs-info'
  tier: 0 | 1 | 2 | 3 | null         // offer 后等多久:0=Day0 / 1=3-6月 / 2=12月 / 3=24月;excluded=null
  /** 被**攒时间补不了**的门槛卡住(语言差档 / 自雇经历不计)。不是 excluded ——
   *  考一次试就能过,但**现在**走不了。先前这类缺口只生成一条理由、不进 gaps,
   *  于是 tier=0 + verdict=open,CLB 4 的厨师也能把联邦 EE 顶到方案第一位
   *  (2026-08-11 Frank 两次实拍点名)。排序与标签都要看它。 */
  blockedBy?: 'language' | 'selfEmployed'
  reasons: VerdictReason[]
  score?: {
    system: string; value: number; ceiling: number | null
    refLine: number | null; refLabel: string; evidence: Evidence
  }
  availability: Availability
}

// ── mart 行类型(按 data/mart/*.json 的实况字段声明,不多不少)──────────────────

/** data/mart/pnp_occupations.json(630 行)。type: 'ineligible' | 'indemand';appliesTo 空=该省全通道。 */
export type OccupationRow = {
  province: string
  stream: string          // 官方清单名(如 'SINP Occupations In-Demand / Express Entry')
  label: string           // 本站中文短名(**不是官方原文**,永不进 quote)
  program: string
  type: string
  url: string
  fetched: string
  appliesTo: string       // '' | 'OID/EE' | 'Employment Offer'
  noc: string
  name: string            // 官方 NOC 职业名
  gtaRestricted: boolean
}

/** data/mart/pnp_draws.json(145 行)。pnpSelfScore.DrawRow 的超集(结构兼容,可直接喂 streamMatches)。 */
export type VerdictDrawRow = {
  province: string
  label: string
  scale: string | null
  url: string
  fetched: string
  kind: string
  drawDate: string
  stream: string
  score: number | null
  invitations: number | null
  note: string
}

/**
 * data/mart/designated_employers.json(3476 行)。
 * ⚠️ 数据缺口(2026-08-06 实测):mart 行**不带 url / fetched**(raw/pnp/nl-employers.json 里有,
 * 09_build_mart 没带出来)。所以「NL 有 N 家指定雇主申报过该 NOC」这条 supporting fact 目前挂不上 evidence ——
 * 本文件如实不挂,并在句子里点明出处是本站名录;url/fetched 一旦补进 mart,这里自动开始挂(可选字段)。
 */
export type DesignatedEmployerRow = {
  name: string
  province: string
  location: string
  isTech: boolean
  source: string
  nocs: string            // 逗号分隔的 NOC 码
  url?: string
  fetched?: string
}

export type VerdictData = {
  requirements: Requirement[]
  occupations: OccupationRow[]
  draws: VerdictDrawRow[]
  scoreFactors: ScoreFactor[]
  eeGrid: EeGridRow[]
  designatedEmployers: DesignatedEmployerRow[]
}

// ── 杠杆(顶层第二个导出函数;PathwayVerdict 形状是定稿,不往里塞字段)────────────

export type VerdictLever = {
  key: string                       // 'teer-downgrade' | 'clb-boost'
  text: string
  /** 受影响的通道 key(teer-downgrade:接 TEER 5 岗后判定会掉档的通道) */
  affected?: string[]
  /** 查表得出的分数增量(clb-boost) */
  gains?: { province: string; system: string; from: number; to: number; delta: number; evidence: Evidence }[]
  reasons?: VerdictReason[]
}

// ── 小工具 ──────────────────────────────────────────────────────────────────

const evOfReq = (r: Requirement): Evidence => ({
  url: r.url, fetched: r.fetched, label: r.label, section: r.section, effective: r.effective,
})
/** quote 的唯一来源:官方原文优先取 valueText(联邦页),PNP 页的原文落在 label。 */
const quoteOfReq = (r: Requirement): string => (r.valueText || r.label || '').trim()

const evOfOcc = (r: OccupationRow): Evidence => ({ url: r.url, fetched: r.fetched, label: `${r.stream} — ${r.noc} ${r.name}` })
const evOfDraw = (d: VerdictDrawRow): Evidence => ({
  url: d.url, fetched: d.fetched, label: `${d.stream}(${d.drawDate}${d.note ? ' · ' + d.note : ''})`,
})
const evOfFactor = (f: ScoreFactor): Evidence => ({ url: f.url, fetched: f.fetched, label: f.system, effective: f.guideEffective })

/** `windowYears=3;minYears=1;hoursPerWeek=30` → 取一个键的值 */
const basisParam = (basis: string, key: string): string | null => {
  for (const kv of (basis || '').split(';')) {
    const i = kv.indexOf('=')
    if (i > 0 && kv.slice(0, i).trim() === key) return kv.slice(i + 1).trim()
  }
  return null
}

/** 门槛行 → 月数。op='none' = 官方明说这条通道不设门槛 → 0 个月(**不是**「没查到」)。 */
const monthsOfReq = (r: Requirement): number | null => {
  if (r.op === 'none') return 0
  if (r.value == null) return null
  if (r.unit === 'months') return r.value
  if (r.unit === 'years') return r.value * 12
  if (r.unit === 'hours') {
    const y = basisParam(r.basis, 'minYears')          // 1,560 小时 = 官方自己写的「1 年」,不拿小时数除工时猜
    return y ? Number(y) * 12 : null
  }
  return null
}

/** offer 到手后还要等多久:0=Day0 / 1=3-6 月 / 2=12 月 / 3=24 月 */
const tierOfMonths = (m: number): 0 | 1 | 2 | 3 => (m <= 0 ? 0 : m <= 6 ? 1 : m <= 12 ? 2 : 3)

/** 标签里的最高 CLB 档(天花板估分用;档位从官方标签自己解析,不写死) */
const maxClbIn = (labels: string[]): number | null => {
  let max: number | null = null
  for (const l of labels) {
    const m = /clb\s*(?:level\s*)?(\d+)/i.exec(l || '')
    if (m) { const v = Number(m[1]); if (max == null || v > max) max = v }
  }
  return max
}

/**
 * 非地域适用条件是否成立。返回 null = 判不了(缺槽)——**不猜**。
 * 官方口径:带条件的那一行是通用条款的**例外**,条件成立时它覆盖通用行(同 rules.ts nocScore 的「最具体优先」)。
 */
const conditionHolds = (cond: string, p: VerdictProfile, province: string): boolean | null => {
  if (!cond) return true
  if (p.canadaStudy == null) return null
  if (cond === 'recent-on-graduate') {
    // 官方:近 3 年安省院校毕业 + 2 年制以上文凭/研究生证书/硕博。本站档案没有毕业日期槽,
    // 只用「加拿大学历 + 学习省 + 学制年数」判 —— 判不了就返回 null(缺槽),不按「大概是」放行。
    if (p.canadaStudy !== true) return false
    if (p.studyProvince == null || p.eduYears == null) return null
    return p.studyProvince === province && p.eduYears >= 2
  }
  if (cond === 'grad-other-province') {
    if (p.canadaStudy !== true) return false
    if (p.studyProvince == null) return null
    return p.studyProvince !== province
  }
  return null                                          // 不认识的条件 → 判不了
}

// ── 通道注册表(13 条,C01 §二/§三)──────────────────────────────────────────
// reqStream 用**子串**匹配而不是字面相等:mart 里的通道名带 em dash,写死全串等于把编码问题埋进代码。

type PathwaySpec = {
  key: string
  province: string                 // 'FED' 或省码(PathwayVerdict.province)
  stream: string                   // 官方通道名(显示用)
  reqProvince: string              // 去 pnp_requirements 挑行时用的省码
  reqPrograms?: string[]           // FED 行按 program 挑(CEC/FSW/FST/RCIP)
  reqStream?: RegExp               // PNP 行按 stream 子串挑
  drawStream?: string              // 对照抽选线时的通道名(喂 streamMatches)
  /** 该省抽选行没有子通道字段时,准不准退回「全省最近一轮有分线的抽选」。
   *  只对 MB 开:MPNP 是**单池单分制**(所有 selection 抽的是同一个 EOI 池、同一把尺子),
   *  BC 是**逐通道设线**(Build 97 / Care 96 / 偏远医疗 50)—— 对 BC 退回全省线就是拿医疗线量木匠,
   *  pnpSelfScore.ts 里已为这条踩过的坑立过红线。 */
  drawFallbackProvinceWide?: boolean
  scorer?: 'CRS' | 'MB'
  /** 门槛是否认可境外经验(库里没有 workLocation=canada 行的默认认;employerTenure 行另有口径) */
  countsForeign: boolean
  /** 该通道有没有「不在清单就不合格」的明文(PE 的 OID 子通道;其余省的 indemand 清单只是定向信号) */
  listRequired?: { province: string; streamRe: RegExp }
  note?: string
}

const REGISTRY: PathwaySpec[] = [
  {
    key: 'FED-EE', province: 'FED', stream: 'Express Entry(CEC / FSW / FST)',
    reqProvince: 'FED', reqPrograms: ['CEC', 'FSW', 'FST'],
    drawStream: 'Canadian Experience Class', scorer: 'CRS', countsForeign: true,
  },
  {
    key: 'ON-workforce', province: 'ON', stream: 'Ontario Workforce Priority stream',
    reqProvince: 'ON', reqStream: /workforce priority/i,
    drawStream: 'Ontario Workforce Priority stream', countsForeign: false,
    // ⚠️ ON 官方第三档(近 5 年同 NOC 2 年经验)本站未收录(C5b-0 留痕),这里只判已入库的两档。
  },
  {
    key: 'NB-sw', province: 'NB', stream: 'New Brunswick Skilled Worker stream(NB Experience pathway)',
    reqProvince: 'NB', reqStream: /new brunswick skilled worker/i,
    drawStream: 'Skilled Worker (NB Experience)', countsForeign: false,
  },
  {
    key: 'NS-sw', province: 'NS', stream: 'Nova Scotia Nominee Program — Skilled Worker stream',
    reqProvince: 'NS', reqStream: /nova scotia nominee/i, countsForeign: true,
  },
  {
    key: 'SK-offer', province: 'SK', stream: 'SINP International Skilled Worker: Employment Offer',
    reqProvince: 'SK', reqStream: /sinp international skilled worker/i, countsForeign: true,
  },
  {
    key: 'AIP', province: 'FED', stream: 'Atlantic Immigration Program',
    reqProvince: 'FED', reqPrograms: ['AIP'], countsForeign: true,
    note: 'AIP 门槛数字只在联邦 canada.ca 页,现有 crawl 无覆盖(C5b-0 如实留缺口)',
  },
  {
    key: 'RCIP', province: 'FED', stream: 'Rural Community Immigration Pilot',
    reqProvince: 'FED', reqPrograms: ['RCIP'], countsForeign: true,
  },
  {
    key: 'MB-swm', province: 'MB', stream: 'MPNP Skilled Worker Stream — Skilled Worker in Manitoba (SWM)',
    reqProvince: 'MB', reqStream: /skilled worker in manitoba/i,
    drawStream: 'MPNP Skilled Worker Stream', drawFallbackProvinceWide: true,
    scorer: 'MB', countsForeign: false,
  },
  {
    key: 'AB-opportunity', province: 'AB', stream: 'AAIP Alberta Opportunity Stream',
    reqProvince: 'AB', reqStream: /alberta opportunity/i,
    drawStream: 'Alberta Opportunity Stream', countsForeign: true,
  },
  {
    key: 'BC-sw', province: 'BC', stream: 'BC PNP Skilled Worker stream',
    reqProvince: 'BC', reqStream: /bc pnp skill/i,
    drawStream: 'BC PNP Skilled Worker stream', countsForeign: true,
  },
  {
    key: 'BC-build', province: 'BC', stream: 'BC PNP Build: construction trades targeted ITA',
    reqProvince: 'BC', reqStream: /bc pnp skill/i,
    drawStream: 'BC PNP Build: construction trades targeted ITA', countsForeign: true,
    note: 'Build 是 Skills Immigration 池里的定向抽选,资格门槛与 Skilled Worker 同一套',
  },
  {
    key: 'NL-intl-grad', province: 'NL', stream: 'NLPNP International Graduate Category',
    reqProvince: 'NL', reqStream: /international graduate/i, countsForeign: false,
  },
  {
    key: 'PE-sw', province: 'PE', stream: 'PEI PNP Workforce — Skilled Worker / Occupations in Demand',
    reqProvince: 'PE', reqStream: /pei pnp workforce/i, countsForeign: true,
    listRequired: { province: 'PE', streamRe: /occupations in demand/i },
  },
]

// ── 每条通道的评估 ──────────────────────────────────────────────────────────

const reqsOf = (spec: PathwaySpec, all: Requirement[]): Requirement[] =>
  all.filter((r) => r.province === spec.reqProvince
    && (spec.reqPrograms ? spec.reqPrograms.includes(r.program) : true)
    && (spec.reqStream ? spec.reqStream.test(r.stream) : true))

/** 该通道认可的可计经验月数(null=判不了)。employerTenure 口径另算,见 pickGate。 */
function countableMonths(spec: PathwaySpec, p: VerdictProfile, selfEmpExcluded: boolean): number | null {
  const can = p.expCanadaMonths
  if (!spec.countsForeign) return can
  const foreign = selfEmpExcluded && p.foreignExpSelfEmployed === true ? 0 : p.expForeignMonths
  if (can == null || foreign == null) return null
  return can + foreign
}

type GateEval = {
  rows: Requirement[]                    // 参与判定的门槛行(可能两行:ON 的 6 月 + 毕业生 3 月)
  picked: Requirement | null             // 最终按哪一行判(最具体的那行)
  need: number | null
  have: number | null
  gap: number | null                     // null = 判不了
  tenure: boolean
  unknownCond: Requirement[]             // 条件判不了的行(缺槽)
}

function pickGate(spec: PathwaySpec, rows: Requirement[], p: VerdictProfile, selfEmpExcluded: boolean): GateEval {
  const gateRows = rows
    .filter((r) => (r.factor === 'experience' || r.factor === 'workHours') && r.subject === 'applicant')
    .filter((r) => teerHit(r, p.teer))
  if (!gateRows.length) return { rows: [], picked: null, need: null, have: null, gap: null, tenure: false, unknownCond: [] }

  const unknownCond: Requirement[] = []
  const applicable: Requirement[] = []
  for (const r of gateRows) {
    const ok = conditionHolds(r.appliesCondition || '', p, spec.reqProvince)
    if (ok === null) { unknownCond.push(r); continue }
    if (ok) applicable.push(r)
  }
  // 最具体优先:条件行成立时覆盖通用行(ON 毕业生 3 月覆盖通用 6 月;MB 外省毕业 12 月覆盖通用 6 月)
  const conditional = applicable.filter((r) => (r.appliesCondition || '') !== '')
  const pool = conditional.length ? conditional : applicable
  // 联邦三子通道并列(CEC/FSW/FST 任一达标即可入池)→ 取门槛最低的那条当 picked
  const withMonths = pool.map((r) => ({ r, m: monthsOfReq(r) })).filter((x): x is { r: Requirement; m: number } => x.m != null)
  const picked = withMonths.length ? withMonths.reduce((a, b) => (b.m < a.m ? b : a)).r : (pool[0] ?? null)
  const need = picked ? monthsOfReq(picked) : null

  const tenure = picked?.basis === 'employerTenure'
  let have: number | null
  if (tenure) {
    // 口径隔离(rules.ts 同款):这类行量的是「在**这家**雇主连续全职干了多久」,不是同职业总经验。
    // 加拿大经验为 0 时可以确定在职时长也是 0(没在加拿大受雇过);>0 且现居就是本省时,
    // 用它作**上界**(可能分散在几家雇主 → 措辞层要点明);在别省攒的经验对本省雇主在职时长记 0。
    if (p.expCanadaMonths == null) have = null
    else if (p.expCanadaMonths === 0) have = 0
    else have = p.province === spec.reqProvince ? p.expCanadaMonths : 0
  } else {
    have = countableMonths(spec, p, selfEmpExcluded)
  }
  // 🔴 need=0(op='none':官方明说不设门槛)时 gap 恒 0,**不看 have**:一道不存在的闸不许因为
  //    「缺经验月数」把通道拖成 needs-info(2026-08-06 §4.5:NL 正是这么被挤出第一轮答复的)。
  const gap = need == null ? null : need === 0 ? 0 : have == null ? null : Math.max(0, need - have)
  return { rows: pool, picked, need, have, gap, tenure, unknownCond }
}

/** 居住门槛(NB 的「过去 6 个月住在 NB」)。现居省不是本省 → 0 个月,是本省 → 判不了时长(缺槽)。 */
function residenceGap(spec: PathwaySpec, rows: Requirement[], p: VerdictProfile): { row: Requirement; need: number; gap: number | null } | null {
  const row = rows.find((r) => r.factor === 'residence' && r.subject === 'applicant')
  if (!row) return null
  const need = monthsOfReq(row)
  if (need == null) return null
  if (p.province == null) return { row, need, gap: null }
  return { row, need, gap: p.province === spec.reqProvince ? null : need }
}

/** 抽选参照线:先按通道名匹配;匹配不上且该省允许(MB 单池单分制)才退回全省最近一轮有分线的抽选。 */
function refDraw(spec: PathwaySpec, draws: VerdictDrawRow[]): VerdictDrawRow | null {
  const scored = draws
    .filter((d) => d.province === (spec.province === 'FED' ? 'FED' : spec.reqProvince) && d.kind === 'draw' && d.score != null)
    .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
  if (spec.drawStream) {
    const hit = scored.find((d) => streamMatches(d.stream, spec.drawStream as string))
    if (hit) return hit
  }
  return spec.drawFallbackProvinceWide ? (scored[0] ?? null) : null
}

const EDU_TO_MB: Record<EduKey, MbEduKey> = {
  doctorate: 'masterOrDoctorate', master: 'masterOrDoctorate', bachelor: 'oneProgram3yPlus',
  tradeCert: 'tradeCert', diploma2y: 'oneProgram2y', cert1y: 'oneYearProgram', highschool: 'none',
}
const mbEduOf = (edu: EduKey, years: number | null): MbEduKey => {
  if (edu === 'diploma2y' || edu === 'bachelor') {
    if (years == null) return EDU_TO_MB[edu]
    return years >= 3 ? 'oneProgram3yPlus' : years >= 2 ? 'oneProgram2y' : 'oneYearProgram'
  }
  return EDU_TO_MB[edu]
}

/** MPNP EOI 档案映射。workMonths 传的是「门槛达成态」(见调用处注释),不是今天的月数。 */
function mbProfileOf(p: VerdictProfile, workMonths: number, clb: number): MbProfile {
  return {
    clb,
    secondLangClb5Plus: false,                        // 档案无「第二官方语言」槽 → 不猜,按不加分算
    age: p.age as number,
    workMonthsSameOcc: workMonths,
    employerLicenseRecognized: false,                 // 同上,不猜
    edu: mbEduOf(p.edu as EduKey, p.eduYears),
    adapt: {
      demand: true,                                   // SWM 的门槛本身就是「曼省持续就业 + 长期 offer」,达标即触发该档
      closeRelative: false, priorMbWork6moPlus: false,
      mbEduYears: p.canadaStudy === true && p.studyProvince === 'MB' ? ((p.eduYears ?? 0) >= 2 ? 2 : 1) : 0,
      closeFriendOrDistantRelative: false, regionalOutsideWinnipeg: false,
    },
    riskForeignWork: (p.expCanadaMonths ?? 0) > 0 && p.province !== 'MB',
    riskForeignStudy: p.canadaStudy === true && p.studyProvince != null && p.studyProvince !== 'MB',
  }
}

const ruleProfileOf = (p: VerdictProfile, total: number | null): RuleProfile => ({
  noc: p.noc ?? undefined,
  teer: p.teer,
  clb: p.clb,
  canadianExpMonths: p.expCanadaMonths,
  totalExpMonths: total,
  familySize: null,
  annualIncome: null,
  incomeIsOccMedian: false,
  area: null,
})

/**
 * 联邦三子通道的语言行:appliesTeer 是空的,TEER 档写在 stream 键里(teer-0-1 / teer-2-3 / teer-0-3 / teer-4)。
 *
 * 🔴 `teer-a-b` 是**闭区间**,不是两个端点的枚举(2026-08-09 批C 实证的 bug):
 *    CEC/FSW 的 teer-0-1 / teer-2-3 恰好端点=全集,当枚举读从没炸过;批B 灌进 AIP 的
 *    teer-0-3(CLB 5)/ teer-2-4 后,TEER 1 与 TEER 2 的 job offer **一条语言门槛行都挑不到**,
 *    上游 langRowsSeen=0 于是输出「本站尚未收录 AIP 的语言门槛条文」—— 库里明明有,这是一句假话。
 *    改法:恰好两个数字 = 闭区间展开(两元枚举形态天然兼容,既有判定零变化);
 *    三个及以上数字仍按枚举读(库里目前没有这种写法,不为它猜区间语义)。
 */
const fedLangApplies = (r: Requirement, teer: number | null): boolean => {
  const m = /^teer-([\d-]+)$/.exec(r.stream || '')
  if (!m) return true                                  // first-official / speaking-listening / reading-writing:该子通道通用
  if (teer == null) return false
  const parts = m[1].split('-').map(Number)
  if (parts.length === 2) {
    const [lo, hi] = parts[0] <= parts[1] ? parts : [parts[1], parts[0]]
    return teer >= lo && teer <= hi
  }
  return parts.includes(teer)
}

// ── 主函数 ──────────────────────────────────────────────────────────────────

function evaluateOne(spec: PathwaySpec, p: VerdictProfile, data: VerdictData): PathwayVerdict {
  const rows = reqsOf(spec, data.requirements)
  const reasons: VerdictReason[] = []
  const missingSlots: string[] = []

  // ── 库里根本没有这条通道的行 → needs-info + not-collected(**不拿文档记忆当库**)
  if (!rows.length) {
    reasons.push({
      kind: 'needs-info',
      text: `本站尚未收录 ${spec.stream} 的门槛条文${spec.note ? `(${spec.note})` : ''} —— 这是本站的缺口,不等于官方没有要求`,
    })
    return { key: spec.key, province: spec.province, stream: spec.stream, verdict: 'needs-info', tier: null, reasons, availability: 'not-collected' }
  }

  const selfEmpRows = rows.filter((r) => r.factor === 'workSelfEmployed' || r.factor === 'experienceExcluded')
  const selfEmpExcluded = selfEmpRows.length > 0
  const gate = pickGate(spec, rows, p, selfEmpExcluded)

  // ── ① 职业清单 ────────────────────────────────────────────────────────────
  // 排除清单命中 = 硬伤;定向/在需清单只是信号(**不在清单 ≠ 不合格**),除非该通道明文要求在清单(PE OID)。
  let listExcluded = false
  if (p.noc) {
    const ineligible = data.occupations.filter((o) => o.province === spec.reqProvince && o.type === 'ineligible' && o.noc === p.noc)
      // appliesTo 先过滤:SK 那 152 条只服务 OID/EE 子类,管不着 Employment Offer
      .filter((o) => !o.appliesTo || o.appliesTo.toLowerCase().includes('employment offer') === /employment offer/i.test(spec.stream))
    for (const o of ineligible) {
      listExcluded = true
      reasons.push({
        kind: 'excluded',
        text: `${p.noc} 在「${o.stream}」这张不合格清单上`,
        quote: `${o.stream} — ${o.noc} ${o.name}`,   // 全部来自数据行字段(stream/noc/name),没有一个字是手写的
        evidence: evOfOcc(o),
      })
    }
    const indemand = data.occupations.filter((o) => o.province === spec.reqProvince && o.type === 'indemand' && o.noc === p.noc)
    for (const o of indemand) {
      reasons.push({ kind: 'met', text: `${p.noc} ${o.name} 在「${o.stream}」清单上(定向/受理信号,不是资格认定)`, evidence: evOfOcc(o) })
    }
    // 明文要求「必须在清单上」的通道(PE 的 Occupations in Demand 子通道)
    if (spec.listRequired) {
      const list = data.occupations.filter((o) => o.province === spec.listRequired!.province && o.type === 'indemand'
        && spec.listRequired!.streamRe.test(o.stream))
      const onList = list.some((o) => o.noc === p.noc)
      if (list.length && !onList) {
        listExcluded = true
        const anchor = rows.find((r) => r.factor === 'experience') ?? rows[0]
        reasons.push({
          kind: 'excluded',
          text: `${p.noc} 不在 ${list[0].stream} 清单上(该清单共 ${list.length} 个职业)—— 走得快的那条子通道(12 个月)对本职业关着`,
          quote: quoteOfReq(anchor),               // 官方原文自己写明 OID 子通道「limited to its named NOC list」
          evidence: evOfReq(anchor),
        })
      }
    }
  } else {
    missingSlots.push('noc')
  }

  // ── ② 语言 ───────────────────────────────────────────────────────────────
  let blockedBy: PathwayVerdict['blockedBy']
  let langRowsSeen = 0
  if (spec.reqPrograms) {
    // 联邦:三子通道各自一套语言行,逐条摆
    for (const prog of spec.reqPrograms) {
      for (const r of rows.filter((x) => x.program === prog && x.factor === 'language' && fedLangApplies(x, p.teer))) {
        langRowsSeen += 1
        if (p.clb == null) { missingSlots.push('clb'); continue }
        const ok = r.value == null || p.clb >= r.value
        if (!ok) blockedBy = blockedBy ?? 'language'
        reasons.push({
          kind: ok ? 'met' : 'gap',
          text: `${prog} 语言门槛 CLB ${r.value}${ok ? `,你 CLB ${p.clb} 达标` : `,你 CLB ${p.clb},差 ${(r.value as number) - p.clb} 档`}`,
          quote: quoteOfReq(r), evidence: evOfReq(r),
        })
      }
    }
    if (!langRowsSeen) {
      reasons.push({ kind: 'needs-info', text: `本站尚未收录 ${spec.stream} 的语言门槛条文 —— 不等于这条通道不要求语言` })
    }
  } else {
    const langRows = rows.filter((r) => r.subject === 'applicant')
    const results: RuleResult[] = evaluateRequirements(langRows, ruleProfileOf(p, countableMonths(spec, p, selfEmpExcluded)))
    const lang = results.find((r) => r.factor === 'language')
    if (lang) {
      if (lang.verdict === 'unknown') {
        missingSlots.push('clb')
        reasons.push({ kind: 'needs-info', text: '语言门槛判不了:档案没有 CLB 成绩', evidence: lang.evidence })
      } else if (lang.verdict === 'pass') {
        reasons.push({
          kind: 'met',
          text: lang.need == null ? '官方明说这一档不要求语言成绩' : `语言门槛 CLB ${lang.need},你 CLB ${lang.have} 达标`,
          quote: lang.evidence.label, evidence: lang.evidence,
        })
      } else {
        blockedBy = blockedBy ?? 'language'
        reasons.push({ kind: 'gap', text: `语言门槛 CLB ${lang.need},你 CLB ${lang.have},差 ${lang.short} 档`, quote: lang.evidence.label, evidence: lang.evidence })
      }
    } else {
      reasons.push({ kind: 'needs-info', text: `本站尚未收录 ${spec.stream} 的语言门槛条文 —— 不等于这条通道不要求语言` })
    }
  }

  // ── ③ 经验 / 居住(可积累项,决定 tier)────────────────────────────────────
  // 缺槽判不出 gap 时,把 need 记进 gaps —— needs-info 的 tier 因此是「最坏情况的上界」
  // (按 0 经验 / 0 居住算)。这就是 §4.5 说的 **tier 潜力**:NL(need=0)最坏也是 tier0,
  // ON(3-6 月)最坏 tier1 —— 排序按它,缺槽的通道才不会全挤成一堆无差别的 0。
  const gaps: number[] = []
  if (!gate.picked) {
    reasons.push({ kind: 'needs-info', text: `本站尚未收录 ${spec.stream} 的工作经验门槛条文 —— 这是本站的缺口,不等于官方不要求经验` })
  }
  if (gate.gap != null) gaps.push(gate.gap)
  else if (gate.need != null) gaps.push(gate.need)
  if (gate.have == null && gate.picked && gate.need !== 0) missingSlots.push('expCanadaMonths')
  const res = residenceGap(spec, rows, p)
  if (res) {
    if (res.gap != null) gaps.push(res.gap)
    else { gaps.push(res.need); missingSlots.push('province') }
  }

  // ── ④ 估分 + 参照线 ──────────────────────────────────────────────────────
  const draw = refDraw(spec, data.draws)
  let score: PathwayVerdict['score'] | undefined
  try {
  if (spec.scorer === 'CRS' && p.age != null && p.clb != null && p.edu != null) {
    const crsProfile: CrsEstimateProfile = {
      age: p.age, married: p.married, clb: p.clb, edu: p.edu, eduYears: p.eduYears,
      canadaStudy: p.canadaStudy,
      expCanadaMonths: p.expCanadaMonths,
      // 自雇经验多数通道不计 → 上游把 expForeignMonths 折成 0 的口径在这里也照用
      expForeignMonths: selfEmpExcluded && p.foreignExpSelfEmployed === true ? 0 : p.expForeignMonths,
    }
    const now = estimateCrs(crsProfile, data.eeGrid)
    const maxClb = maxClbIn(data.eeGrid.filter((r) => r.grid === 'CRS' && /first official language/i.test(r.heading)).map((r) => r.criterion))
    const ceil = maxClb == null ? null : estimateCrs({ ...crsProfile, clb: maxClb }, data.eeGrid).total
    const head = data.eeGrid.find((r) => r.grid === 'CRS')
    score = {
      system: 'CRS', value: now.total, ceiling: ceil,
      refLine: draw?.score ?? null,
      refLabel: draw ? `最近一轮 ${draw.stream}(${draw.drawDate},${draw.invitations ?? '—'} 人)` : '本站未收录可对照的抽选线',
      evidence: head ? { url: head.url, fetched: head.fetched, label: 'Comprehensive Ranking System(官方分值表)' } : { url: '', fetched: '' },
    }
  }
  if (spec.scorer === 'MB' && p.age != null && p.clb != null && p.edu != null && data.scoreFactors.some((f) => f.province === 'MB')) {
    // 估的是**门槛达成态**:MPNP SWM 的门槛本身就是「在曼省同一雇主连续全职 N 个月 + 长期 offer」,
    // 所以按「攒够那 N 个月」算分才是这条路走通时的分 —— refLabel/reasons 里点明这一点,不装成今天的分。
    const workMonths = Math.max(gate.have ?? 0, gate.need ?? 0)
    const mbNow = estimateMbEoi(data.scoreFactors, mbProfileOf(p, workMonths, p.clb))
    const maxClb = maxClbIn(data.scoreFactors.filter((f) => f.province === 'MB' && f.factor === 'language' && f.kind === 'row').map((f) => f.label))
    const ceil = maxClb == null ? null : estimateMbEoi(data.scoreFactors, mbProfileOf(p, workMonths, maxClb)).total
    const head = data.scoreFactors.find((f) => f.province === 'MB') as ScoreFactor
    score = {
      system: mbNow.system, value: mbNow.total, ceiling: ceil,
      refLine: draw?.score ?? null,
      refLabel: draw
        ? `攒够门槛后的估分;对照最近一轮有分线的抽选 ${draw.stream}(${draw.drawDate}${draw.note ? ' · ' + draw.note : ''})`
        : '攒够门槛后的估分;本站未收录可对照的抽选线',
      evidence: evOfFactor(head),
    }
    // 三条 warning(C01 §二曼省节):外省学习 −100 / 再叠外省工作 −100 / 天花板与抽选线对照
    const riskRows = data.scoreFactors.filter((f) => f.province === 'MB' && f.factor === 'risk' && f.kind === 'bonus')
    const studyRow = riskRows.find((f) => /studies in another province/i.test(f.label))
    const workRow = riskRows.find((f) => /work experience in another province/i.test(f.label))
    const base = mbProfileOf(p, workMonths, p.clb)
    if (base.riskForeignStudy && studyRow) {
      reasons.push({
        kind: 'gap',
        text: `曼省对外省学习倒扣 ${Math.abs(studyRow.points ?? 0)} 分(全国唯一一个把外省经历算负分的省),已计入 ${mbNow.total} 分`,
        quote: studyRow.label, evidence: evOfFactor(studyRow),
      })
    }
    if (!base.riskForeignWork && workRow) {
      const worse = estimateMbEoi(data.scoreFactors, { ...base, riskForeignWork: true }).total
      reasons.push({
        kind: 'gap',
        text: `若先在曼省以外的省份上班再转曼省,再扣 ${Math.abs(workRow.points ?? 0)} 分 → ${worse} 分`,
        quote: workRow.label, evidence: evOfFactor(workRow),
      })
    }
    const mbScored = data.draws.filter((d) => d.province === 'MB' && d.kind === 'draw' && d.score != null)
      .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
    if (mbScored.length) {
      const lines = mbScored.map((d) => `${d.score}(${d.drawDate}${d.note ? ' · ' + d.note : ''})`).join('、')
      reasons.push({
        kind: 'gap',
        text: `估分 ${mbNow.total}、天花板 ${ceil ?? '—'}(语言拉到官方最高档);本站收录的有分线抽选是 ${lines}`,
        evidence: evOfDraw(mbScored[0]),
      })
    }
  }
  } catch (e) {
    // 估分器挑不出行(档案落在官方表的档位之外)→ 如实说判不了,不给一个编出来的分
    score = undefined
    reasons.push({ kind: 'needs-info', text: `本站的估分器对这份档案挑不出官方档位(${(e as Error).message}),这条通道不给估分` })
  }
  // 没有自评估分器、但有该通道的抽选线时,把线摆出来(不冒充成「你的分」)
  if (!score && draw && draw.score != null) {
    reasons.push({
      kind: 'met',
      text: `最近一轮 ${draw.stream}(${draw.drawDate})的最低邀请分是 ${draw.score}${draw.scale ? `(${draw.scale} 分制)` : ''};本站没有这条通道的自评估分器,不替你算分`,
      evidence: evOfDraw(draw),
    })
  }

  // ── ⑤ 裁决 ───────────────────────────────────────────────────────────────
  // 分数鸿沟:语言拉满后的上界仍够不着最近一轮抽选线 = 攒时间也补不齐(≠ 差一点点)
  const scoreGulf = !!(score && score.ceiling != null && score.refLine != null && score.ceiling < score.refLine)
  const excluded = listExcluded || scoreGulf
  if (scoreGulf && score) {
    reasons.push({
      kind: 'gap',
      text: `估分 ${score.value}、把语言拉到官方最高档的上界也只有 ${score.ceiling},对照 ${score.refLabel} 的 ${score.refLine} 分 —— 这个差距不是靠攒时间能补的`,
      evidence: draw ? evOfDraw(draw) : score.evidence,
    })
  }

  // 经验的差距句。
  //   · 分数鸿沟型排除(FED-EE):「现在连池都进不去」本身就是官方门槛判出来的排除 → kind='excluded'(带官方 quote);
  //   · 清单型排除(PE):经验差距是**另一件事**,仍按可积累的 gap 摆(C01 金标「24 月另列 gap」)。
  const hardKind: VerdictReason['kind'] = scoreGulf ? 'excluded' : 'gap'
  for (const r of gate.rows) {
    const need = monthsOfReq(r)
    if (need == null) continue
    // need=0 = 官方明说无门槛 → 恒达标(缺经验月数也一样:一道不存在的闸没有「判不了」)
    const met = need === 0 || (gate.have != null && gate.have >= need)
    const tenureNote = r.basis === 'employerTenure' ? '(官方量的是「在这家雇主连续全职多久」,不是同职业总经验)' : ''
    reasons.push({
      kind: met ? 'met' : gate.have == null ? 'needs-info' : hardKind,
      text: r.op === 'none'
        ? '官方明说这条通道不设工作经验门槛 —— 「没有门槛」不等于「本站没查到」'
        : gate.have == null
          ? `工作经验门槛 ${need} 个月${tenureNote},档案缺经验月数,判不了`
          : met
            ? `工作经验门槛 ${need} 个月${tenureNote},你 ${gate.have} 个月,达标`
            : `工作经验门槛 ${need} 个月${tenureNote},你 ${gate.have} 个月,还差 ${need - gate.have} 个月`,
      quote: quoteOfReq(r), evidence: evOfReq(r),
    })
  }
  for (const r of gate.unknownCond) {
    reasons.push({
      kind: 'needs-info',
      text: `另有一档门槛(适用条件:${r.appliesCondition})判不了 —— 档案缺判定这个条件所需的信息`,
      quote: quoteOfReq(r), evidence: evOfReq(r),
    })
  }
  if (res) {
    reasons.push({
      kind: res.gap == null ? 'needs-info' : res.gap > 0 ? hardKind : 'met',
      text: res.gap == null
        ? `居住门槛 ${res.need} 个月,档案只知道现居省、不知道住了多久`
        : `居住门槛 ${res.need} 个月,你现居 ${p.province},还差 ${res.gap} 个月`,
      quote: quoteOfReq(res.row), evidence: evOfReq(res.row),
    })
  }
  for (const r of selfEmpRows) {
    if (p.foreignExpSelfEmployed !== true) continue
    blockedBy = blockedBy ?? 'selfEmployed'
    reasons.push({ kind: 'gap', text: '你的海外经历是自雇,这条通道明文不计入工作经验', quote: quoteOfReq(r), evidence: evOfReq(r) })
  }

  // NL:指定雇主名录里申报过这个 NOC 的雇主数(supporting fact)
  if (spec.reqProvince === 'NL' && p.noc) {
    const hits = data.designatedEmployers.filter((e) => e.province === 'NL' && (e.nocs || '').split(',').map((s) => s.trim()).includes(p.noc as string))
    const src = hits.find((e) => e.url && e.fetched)
    reasons.push({
      kind: hits.length ? 'met' : 'gap',
      text: `本站收录的 ${data.designatedEmployers.filter((e) => e.province === 'NL').length} 家 NL 指定雇主里,有 ${hits.length} 家申报过 ${p.noc}${hits.length ? `(${hits.map((e) => e.name).join('、')})` : ''}`,
      // mart 的 designated_employers 行不带 url/fetched(见类型注释的数据缺口)→ 挂不上就不挂,不借别的页的出处充数
      ...(src ? { evidence: { url: src.url as string, fetched: src.fetched as string, label: 'NLPNP designated employers' } } : {}),
    })
  }

  const tier: PathwayVerdict['tier'] = excluded ? null : tierOfMonths(gaps.length ? Math.max(...gaps) : 0)
  const needsInfo = !excluded && (!gate.picked || gate.gap == null || missingSlots.length > 0)
  const verdict: PathwayVerdict['verdict'] = excluded ? 'excluded' : needsInfo ? 'needs-info' : 'open'
  const availability: Availability = !gate.picked ? 'not-collected' : 'ok'

  return {
    key: spec.key, province: spec.province, stream: spec.stream,
    verdict, tier: verdict === 'needs-info' && !gate.picked ? null : tier,
    ...(blockedBy && !excluded ? { blockedBy } : {}),
    reasons, ...(score ? { score } : {}), availability,
  }
}

/**
 * 档案 → 13 条通道的裁决。
 * 排序:open 在前(按 tier 升序)→ needs-info(按 **tier 潜力**升序:缺槽的门槛按 0 经验/0 居住的
 * 上界记档,tier0 潜力浮顶、库缺行的 null 沉底 —— §4.5 的 NL 掉桶修复,C6 选项卡推荐位同一套序)
 * → excluded 沉底(tier 恒 null → 注册表原序)。
 * **同 tier 不再排序**(v1 没有配额/竞争度入参,按注册表原序保持稳定 —— 编个次序出来等于替用户拿主意)。
 */
export function pathVerdict(profile: VerdictProfile, data: VerdictData): PathwayVerdict[] {
  const out = REGISTRY.map((spec, i) => ({ v: evaluateOne(spec, profile, data), i }))
  // 四档:现在就能走 → 被硬门槛卡住(考试能补,但**现在**走不了) → 缺档案判不了 → 排除。
  // 先前只有三档,「差 3 档语言」和「全部达标」并列 tier0,谁在注册表里靠前谁第一。
  const rank = (v: PathwayVerdict) =>
    (v.verdict === 'open' ? (v.blockedBy ? 1 : 0) : v.verdict === 'needs-info' ? 2 : 3)
  out.sort((a, b) => {
    if (rank(a.v) !== rank(b.v)) return rank(a.v) - rank(b.v)
    const ta = a.v.tier ?? 9, tb = b.v.tier ?? 9
    if (ta !== tb) return ta - tb
    return a.i - b.i
  })
  return out.map((x) => x.v)
}

// ── 职业级通道行(C6 职位详情页通道卡的无档案态)────────────────────────────
//
// 一个 NOC+TEER 进,13 条通道的**职业级**事实出(不含任何个人档案):
// 经验门槛月数(排序键)、门槛口径(同雇主在职时长另标)、清单点名/排除、availability。
// 有档案时详情卡不走这条 —— 直接用上面 pathVerdict 的序(设计 §五「双态」)。

export type JobPathwayRow = {
  key: string
  province: string
  stream: string
  /** 经验门槛月数(无条件档里最低的一档;op='none'=0)。null 仅当 availability≠ok */
  months: number | null
  /** true = 门槛量的是「同雇主连续在职时长」(MB SWM),不是同职业总经验 —— 口径必须标出 */
  tenure: boolean
  /** 官方在需/定向清单点名本职业(信号,不是资格认定) */
  listedIn: boolean
  /** 清单型硬伤:排除清单命中,或明文要求在清单而本职业不在(PE OID) */
  excludedByList: boolean
  availability: Availability
}

const EMPTY_PROFILE: VerdictProfile = {
  age: null, married: null, clb: null, edu: null, eduYears: null, canadaStudy: null,
  studyProvince: null, noc: null, teer: null, expCanadaMonths: null, expForeignMonths: null,
  foreignExpSelfEmployed: null, status: null, province: null,
}

/** 排序:可判的按经验门槛升序 → 门槛未收录 → 清单排除沉底;同档按注册表原序(与卡片效果图一致)。 */
export function jobPathways(noc: string | null, teer: number | null, data: VerdictData): JobPathwayRow[] {
  const p: VerdictProfile = { ...EMPTY_PROFILE, noc, teer }
  const out = REGISTRY.map((spec, i) => {
    const rows = reqsOf(spec, data.requirements)
    // 清单判定与 evaluateOne ① 同口径(那边还要造 quote/evidence,这里只要布尔,不共函数)
    let listedIn = false
    let excludedByList = false
    if (noc) {
      excludedByList = data.occupations.some((o) => o.province === spec.reqProvince && o.type === 'ineligible' && o.noc === noc
        && (!o.appliesTo || o.appliesTo.toLowerCase().includes('employment offer') === /employment offer/i.test(spec.stream)))
      listedIn = data.occupations.some((o) => o.province === spec.reqProvince && o.type === 'indemand' && o.noc === noc)
      if (spec.listRequired) {
        const list = data.occupations.filter((o) => o.province === spec.listRequired!.province && o.type === 'indemand'
          && spec.listRequired!.streamRe.test(o.stream))
        if (list.length && !list.some((o) => o.noc === noc)) excludedByList = true
      }
    }
    if (!rows.length) {
      return { row: { key: spec.key, province: spec.province, stream: spec.stream, months: null, tenure: false, listedIn, excludedByList, availability: 'not-collected' as Availability }, i }
    }
    const selfEmpExcluded = rows.some((r) => r.factor === 'workSelfEmployed' || r.factor === 'experienceExcluded')
    const gate = pickGate(spec, rows, p, selfEmpExcluded)
    return {
      row: {
        key: spec.key, province: spec.province, stream: spec.stream,
        months: gate.picked ? gate.need : null, tenure: gate.tenure, listedIn, excludedByList,
        availability: (gate.picked ? 'ok' : 'not-collected') as Availability,
      },
      i,
    }
  })
  const rank = (r: JobPathwayRow) => (r.excludedByList ? 2 : r.availability !== 'ok' || r.months == null ? 1 : 0)
  out.sort((a, b) => rank(a.row) - rank(b.row) || (a.row.months ?? 99) - (b.row.months ?? 99) || a.i - b.i)
  return out.map((x) => x.row)
}

/**
 * 杠杆:哪一个动作最值钱、哪一个动作最毁事。
 * @param clbTarget 语言目标档(默认 8:雅思一次提两档是最常见的可行目标)。**分值仍全部查表**,
 *                  这里给的只是「问哪一档」的场景参数,不是官方数字。
 */
export function pathLevers(profile: VerdictProfile, data: VerdictData, opts: { clbTarget?: number; teerDowngradeNoc?: string } = {}): VerdictLever[] {
  const levers: VerdictLever[] = []

  // ① 接低 TEER 的岗(如 75110 construction trades helpers and labourers,TEER 5)会毁掉哪些通道 ——
  //    不写死结论:拿改过 TEER 的同一份档案重跑一遍注册表,看哪几条从 open 掉出来。
  const downNoc = opts.teerDowngradeNoc ?? '75110'
  if (profile.teer != null && profile.teer < 5 && profile.noc) {
    const before = pathVerdict(profile, data)
    const after = pathVerdict({ ...profile, noc: downNoc, teer: 5 }, data)
    const byKey = new Map(after.map((v) => [v.key, v]))
    const affected = before.filter((v) => v.verdict === 'open' && byKey.get(v.key)?.verdict !== 'open').map((v) => v.key)
    const teerRows = data.requirements.filter((r) => r.factor === 'experience' && r.appliesTeer && !teerHit(r, 5))
    if (affected.length) {
      levers.push({
        key: 'teer-downgrade',
        text: `把岗位换成 ${downNoc}(TEER 5)后,${affected.length} 条现在开着的通道判定会掉档:${affected.join('、')} —— 低 TEER 的经验匹配不上高 TEER 的门槛,这一年是白干`,
        affected,
        reasons: teerRows.slice(0, 4).map((r) => ({
          kind: 'excluded' as const,
          text: `${r.province} ${r.stream}:该门槛只认 TEER ${r.appliesTeer}`,
          quote: quoteOfReq(r), evidence: evOfReq(r),
        })),
      })
    }
  }

  // ② 语言提档:同一套官方分值表查两次,报差值(ON 单行=总分;MB 四项各查一次,走 mbEoiEstimate)
  const target = opts.clbTarget ?? 8
  if (profile.clb != null && profile.clb < target) {
    const gains: NonNullable<VerdictLever['gains']>[number][] = []
    const onRows = data.scoreFactors.filter((f) => f.province === 'ON' && f.factor === 'language' && f.kind === 'row')
    const pickOn = (clb: number): ScoreFactor | null => {
      const scored = onRows.map((f) => ({ f, th: maxClbIn([f.label]) })).filter((x): x is { f: ScoreFactor; th: number } => x.th != null)
      const ok = scored.filter((x) => x.th <= clb)
      return ok.length ? ok.reduce((a, b) => (b.th > a.th ? b : a)).f : null
    }
    const onFrom = pickOn(profile.clb), onTo = pickOn(target)
    if (onFrom && onTo) {
      gains.push({
        province: 'ON', system: onFrom.system, from: onFrom.points ?? 0, to: onTo.points ?? 0,
        delta: (onTo.points ?? 0) - (onFrom.points ?? 0), evidence: evOfFactor(onTo),
      })
    }
    if (data.scoreFactors.some((f) => f.province === 'MB') && profile.age != null && profile.edu != null) {
      const mbGate = data.requirements.filter((r) => r.province === 'MB' && /skilled worker in manitoba/i.test(r.stream) && r.factor === 'experience')
      const need = Math.max(...mbGate.map((r) => monthsOfReq(r) ?? 0), 0)
      const work = Math.max(profile.expCanadaMonths ?? 0, need)
      const from = estimateMbEoi(data.scoreFactors, mbProfileOf(profile, work, profile.clb))
      const to = estimateMbEoi(data.scoreFactors, mbProfileOf(profile, work, target))
      const head = data.scoreFactors.find((f) => f.province === 'MB') as ScoreFactor
      gains.push({ province: 'MB', system: from.system, from: from.total, to: to.total, delta: to.total - from.total, evidence: evOfFactor(head) })
    }
    if (gains.length) {
      levers.push({
        key: 'clb-boost',
        text: `把语言从 CLB ${profile.clb} 提到 CLB ${target}:${gains.map((g) => `${g.province} +${g.delta}`).join('、')}(官方分值表查表得出)`,
        gains,
      })
    }
  }

  return levers
}
