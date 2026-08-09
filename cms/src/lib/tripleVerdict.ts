// #287 批C · 一键三合一判定的**组装器**(design/一键三合一判定-20260809.md §3「三关拼装,零新判定逻辑」)。
// 一个问题三问合一——「这个岗我投了、入职了,到底能不能帮我拿身份?」——三关各自已有判定件,
// 本文件只做拼装:挑行、摆结构、标免费/付费位、点名缺槽。**一条新的判定规则都不许在这里长出来。**
//
// 复用件(只调用,不修改):
//   职业关 = job 行的 08_score 口径字段(pnpStream / pnpEligible / teer / aip)+ pnp_occupations 具名清单
//   雇主关 = employerVerdict(#284)+ designated_employers 名录行 + companies.lmia_nocs(#286)
//   个人关 = rules.evaluateRequirements(与 report.requirementLines / chatTools.lookupThresholds 同一套挑行口径:
//            「该省全部门槛行 → 引擎」),比路 = pathVerdict(C5)的 13 通道注册表与 tier 语义
//
// 四条铁律(照抄上游,不新立):
//   ① 免费/付费切分照 design §5「锁合成不锁事实」:三关**事实**恒 free,
//      比路结论 / 差值 / 时间窗 / 换省对照 / 下一步 恒 paid —— tier 是这一层唯一的新概念。
//   ② 每行只存 key + params(三语文案归批D UI 配 i18n),`label` 是**英文调试串**,不是 UI 文案。
//      quote 只许来自数据行(Requirement.label / valueText、OccupationRow 的 stream+noc+name),
//      代码里一句手写的「官方原句」都没有(pathVerdict 铁律 ① 同款)。
//   ③ 判不了就 state='unknown' + followups 点名缺哪个档案槽(pathVerdict 的 needs-info 语义),
//      **不编结论**:库里没有那条通道的门槛行时,比路里它退化成缺口,永不冒充「最快」。
//   ④ 纯函数、无 IO:门槛/清单/名录行(VerdictData)与公司事实由调用方查好传入(DB 读取归调用方)。

import { employerVerdict, type EmployerFacts, type EmployerVerdict } from './employerVerdict'
import {
  pathVerdict,
  type DesignatedEmployerRow, type OccupationRow, type PathwayVerdict, type VerdictData, type VerdictProfile,
} from './pathVerdict'
import { evaluateRequirements, type Requirement, type RuleProfile, type RuleResult } from './rules'
// 只 import type(同 pathVerdict):编译期擦除,不给消费端加运行时边。
import type { Availability, Evidence } from './chatTools'

// ── 入参 ────────────────────────────────────────────────────────────────────

/** 一份 offer 的事实(jobs 行,08_score 口径;调用方按 API 侧现成读法喂进来,本层不查库) */
export type TripleJob = {
  id: number
  title: string
  noc: string | null
  /** 官方 NOC 职业名(noc_descriptions.title)——「代码不裸奔」,params 里跟着 noc 一起走 */
  nocName: string | null
  teer: number | null
  province: string
  city: string
  /** 08_score 口径的粗筛信号(≠ 资格认定) */
  pnpEligible: boolean
  /** 命中的本站具名清单短名(pnp_occupations.label,如「NS 紧缺空缺」);'' = 没命中具名清单 */
  pnpStream: string
  eeCategory: string
  /** 08_score 口径:这份岗在大西洋四省且职业不在排除清单。**不代表雇主被指定**(那是 designation) */
  aip: boolean
  employmentTerm: string
  employmentHours: string
}

/** 雇主事实(companies 行 + 名录命中行) */
export type TripleCompany = {
  id: number
  name: string
  /** employerVerdict 的入参形状,原样复用 */
  facts: EmployerFacts
  /**
   * designated_employers 名录里的命中行;**null = 本站没在名录里认出这家**(名录按名字匹配,
   * 认不出 ≠ 官方没指定)→ 判定落 unknown,不写「未被指定」。
   */
  designation: DesignatedEmployerRow | null
  /** companies.lmia_nocs(#286,近两年窗口的获批职业拆分);null = 该列未回填 */
  lmiaNocs: Record<string, number> | null
}

/** 档案:pathVerdict 的 VerdictProfile + 判定卡多要的三个槽(时间窗 / 换省对照 / AIP 资金档) */
export type TripleProfile = VerdictProfile & {
  /** 当前工签/学签剩余月数(PGWP 倒数);null = 未答 */
  permitMonthsLeft: number | null
  /** 档案填的目标省(换省对照行);[] = 未答 */
  targetProvinces: string[]
  /** 随行家庭人数(AIP 资金档 / BC 最低收入表);null = 未答 */
  familySize: number | null
}

// ── 出参 ────────────────────────────────────────────────────────────────────

export type TripleGate = 'occupation' | 'employer' | 'person'
/** design §5:三关事实 free,比路结论+差值+下一步 paid */
export type TripleTier = 'free' | 'paid'
/** pass=达标 / gap=差某项 / excluded=硬伤 / unknown=判不了(缺槽或库缺行) / info=摆事实不判定 */
export type TripleState = 'pass' | 'gap' | 'excluded' | 'unknown' | 'info'

export type TripleRow = {
  gate: TripleGate
  tier: TripleTier
  /** i18n 键(批D 配三语文案);本层不写死任何 UI 句子 */
  key: string
  params: Record<string, string | number | boolean | string[]>
  state: TripleState
  /** 英文调试串(金标可读用),**不是** UI 文案 */
  label: string
  /** 判不了时点名缺哪个档案槽(TripleProfile 的字段名) */
  followups?: string[]
  /** 官方原句:只来自数据行,永不手写 */
  quote?: string
  evidence?: Evidence
}

/** 比路一行:为什么这条线在比路里 + pathVerdict 给它的裁决 */
export type TripleCompareRole = 'current' | 'aip' | 'target'
export type TripleCompareRow = {
  key: string
  province: string
  stream: string
  role: TripleCompareRole
  verdict: PathwayVerdict['verdict']
  tier: PathwayVerdict['tier']
  availability: Availability
  /** pathVerdict 返回序里的名次(排序语义原样复用,本层不重排) */
  rank: number
  /** tier 最小的可判通道(并列时多条同时为 true —— 并列就说并列,不替用户挑) */
  fastest: boolean
}

export type TripleCard = {
  jobId: number
  noc: string | null
  nocName: string | null
  teer: number | null
  province: string
  rows: TripleRow[]
  compare: TripleCompareRow[]
  /** 原件输出照带,批D 要渲染细项(reasons / items)时不必二次查库 */
  employer: EmployerVerdict
  pathways: PathwayVerdict[]
  /** 全卡去重后的缺槽点名 */
  followups: string[]
  availability: Availability
}

// ── 小工具 ──────────────────────────────────────────────────────────────────

const evOfReq = (r: Requirement): Evidence => ({
  url: r.url || r.pageUrl, fetched: r.fetched, label: r.label, section: r.section, effective: r.effective,
})
const quoteOfReq = (r: Requirement): string => (r.valueText || r.label || '').trim()
const evOfOcc = (o: OccupationRow): Evidence => ({ url: o.url, fetched: o.fetched, label: `${o.stream} — ${o.noc} ${o.name}` })
const quoteOfOcc = (o: OccupationRow): string => `${o.stream} — ${o.noc} ${o.name}`

/** RuleResult 的三态 → 判定卡三态(fail 在这一层叫 gap,与 employerVerdict 的 short 同义) */
const STATE_OF_RULE: Record<RuleResult['verdict'], TripleState> = { pass: 'pass', fail: 'gap', unknown: 'unknown' }

/**
 * 判不了某个 factor 时该点名问哪个档案槽。**只在 verdict='unknown' 时挂**——
 * 达标/差多少都已经判出来了,再问一遍是骚扰。
 */
const SLOTS_OF_FACTOR: Record<string, string[]> = {
  language: ['clb'],
  experience: ['expCanadaMonths', 'expForeignMonths'],
  income: ['familySize'],
}

/** 官方 experience 的口径 = 同职业总经验(境内外都算),与 report.ts 喂 totalExpMonths 同源 */
const totalExpMonths = (p: TripleProfile): number | null =>
  p.expCanadaMonths == null || p.expForeignMonths == null ? null : p.expCanadaMonths + p.expForeignMonths

// ── 三关 ────────────────────────────────────────────────────────────────────

/** 职业关(全 free):具名清单命中 / 排除清单命中 / TEER 粗筛档。零新判定,全是查表。 */
function occupationRows(job: TripleJob, occs: OccupationRow[]): TripleRow[] {
  const out: TripleRow[] = []
  const nocName = job.nocName || ''
  const mine = job.noc ? occs.filter((o) => o.noc === job.noc && o.province === job.province) : []

  for (const o of mine.filter((o) => o.type === 'ineligible')) {
    out.push({
      gate: 'occupation', tier: 'free', key: 'tv.occ.excluded', state: 'excluded',
      params: { noc: o.noc, nocName: nocName || o.name, prov: job.province, stream: o.stream, list: o.label },
      label: `occupation ${o.noc} is on the ineligible list ${o.stream}`,
      quote: quoteOfOcc(o), evidence: evOfOcc(o),
    })
  }

  const listed = mine.filter((o) => o.type === 'indemand')
  for (const o of listed) {
    out.push({
      gate: 'occupation', tier: 'free', key: 'tv.occ.listed', state: 'pass',
      params: {
        noc: o.noc, nocName: nocName || o.name, prov: job.province, stream: o.stream, list: o.label,
        // 这一行是不是职位板 pnp 列显示的那张清单(两处口径一致才敢说「就是你在列表看到的那个」)
        matchesJobStream: o.label === job.pnpStream,
      },
      label: `occupation ${o.noc} is named on ${o.stream}`,
      quote: quoteOfOcc(o), evidence: evOfOcc(o),
    })
  }
  if (!listed.length) {
    out.push({
      gate: 'occupation', tier: 'free', key: 'tv.occ.notListed', state: 'info',
      params: { noc: job.noc ?? '', nocName, prov: job.province },
      label: `occupation ${job.noc ?? '?'} is not on any named list of ${job.province}`,
    })
  }

  out.push({
    gate: 'occupation', tier: 'free', key: 'tv.occ.teer',
    state: job.teer == null ? 'unknown' : job.pnpEligible ? 'pass' : 'gap',
    params: { teer: job.teer ?? '', prov: job.province, noc: job.noc ?? '', nocName },
    label: `TEER ${job.teer ?? '?'} — ${job.province} coarse screen ${job.pnpEligible ? 'in range' : 'out of range'}`,
  })
  return out
}

/** 雇主关(事实全 free,「怎么谈」那行 paid):指定名录 + employerVerdict 的年限/雇员数 + LMIA 职业拆分。 */
function employerRows(job: TripleJob, company: TripleCompany, ev: EmployerVerdict, reqs: Requirement[]): TripleRow[] {
  const out: TripleRow[] = []
  const d = company.designation

  if (d) {
    out.push({
      gate: 'employer', tier: 'free', key: 'tv.emp.designated', state: 'pass',
      params: { name: d.name, prov: d.province, program: d.source },
      label: `${d.name} is on the ${d.source} designated employer list (${d.province})`,
      // 名录 mart 行不带 url/fetched(pathVerdict 已留痕的同一个数据缺口)→ 挂不上就不挂
      ...(d.url && d.fetched ? { evidence: { url: d.url, fetched: d.fetched, label: `${d.source} designated employers` } } : {}),
    })
  } else {
    out.push({
      gate: 'employer', tier: 'free', key: 'tv.emp.designationUnknown', state: 'unknown',
      params: { name: company.name, prov: job.province },
      // 「名录里没认出」≠「官方没指定」(CLAUDE.md:官方不公布是需要举证的断言)
      label: `${company.name} not matched in the designated employer list — site gap, not proof of non-designation`,
    })
  }

  const reqOf = (factor: string) =>
    reqs.find((r) => r.province === job.province && r.subject === 'employer' && r.factor === factor)
  for (const item of ev.items) {
    const src = reqOf(item.factor === 'years' ? 'empYears' : 'empStaff')
    out.push({
      gate: 'employer', tier: 'free', key: `tv.emp.${item.factor}`,
      state: item.verdict === 'pass' ? 'pass' : item.verdict === 'fail' ? 'gap' : 'unknown',
      params: {
        need: item.need ?? '', have: item.have ?? '', short: item.short ?? '',
        unit: item.unit, evidence: item.evidence, name: company.name, prov: job.province,
      },
      label: `employer ${item.factor}: need ${item.need ?? '?'} ${item.unit}, has ${item.have ?? '?'} → ${item.verdict}`,
      ...(src ? { quote: quoteOfReq(src), evidence: evOfReq(src) } : {}),
    })
  }
  // 该省没收录雇员数门槛(NS 就是)但本站有估算 → 摆成旁证事实行,不冒充判定
  if (!ev.items.some((i) => i.factor === 'staff') && company.facts.staffEst != null) {
    out.push({
      gate: 'employer', tier: 'free', key: 'tv.emp.staffFact', state: 'info',
      params: { staff: company.facts.staffEst, src: company.facts.staffEstSrc ?? '', name: company.name },
      label: `employer size estimate: ${company.facts.staffEst} employees (no ${job.province} staff threshold on file)`,
    })
  }
  if (ev.state === 'public') {
    out.push({
      gate: 'employer', tier: 'free', key: 'tv.emp.publicSector', state: 'info',
      params: { name: company.name },
      label: `${company.name} is a public-sector employer — private-company thresholds bypassed`,
    })
  }

  // 「对这家怎么谈」(design §2 下一步行,付费位):全部由数据在不在决定,不写任何劝说
  const sameNoc = job.noc && company.lmiaNocs ? company.lmiaNocs[job.noc] ?? 0 : 0
  out.push({
    gate: 'employer', tier: 'paid', key: 'tv.next.employer',
    state: d || sameNoc > 0 ? 'info' : 'unknown',
    params: {
      name: company.name, noc: job.noc ?? '', nocName: job.nocName ?? '',
      program: d?.source ?? '', lmiaSameNoc: sameNoc, lmiaKnown: company.lmiaNocs != null,
    },
    label: `next step with ${company.name}: designation=${d?.source ?? 'unknown'}, LMIA approvals for ${job.noc ?? '?'}=${company.lmiaNocs == null ? 'not-collected' : sameNoc}`,
  })
  return out
}

/** 个人关(全 paid):该省门槛行 × 档案 → rules.evaluateRequirements 的结构化结果,逐条摆。 */
function personRows(job: TripleJob, profile: TripleProfile, provReqs: Requirement[]): TripleRow[] {
  const rp: RuleProfile = {
    // 语言/经验挑行按**这份 offer** 的职业与 TEER(卡片判的就是手上这份岗),不按档案自报的职业
    noc: job.noc ?? undefined,
    teer: job.teer,
    clb: profile.clb,
    canadianExpMonths: profile.expCanadaMonths,
    totalExpMonths: totalExpMonths(profile),
    familySize: profile.familySize,
    annualIncome: null,
    incomeIsOccMedian: false,
    area: null,
  }
  return evaluateRequirements(provReqs, rp)
    // 雇主侧那几行 evaluateRequirements 恒 unknown(它没有公司事实)—— 雇主关由 employerVerdict 判,不重复摆
    .filter((r) => r.subject === 'applicant')
    .map((r): TripleRow => {
      const slots = r.verdict === 'unknown' ? SLOTS_OF_FACTOR[r.factor] : undefined
      return {
        gate: 'person', tier: 'paid', key: `tv.person.${r.factor}`, state: STATE_OF_RULE[r.verdict],
        params: {
          need: r.need ?? '', needLow: r.needLow ?? '', have: r.have ?? '', short: r.short ?? '',
          unit: r.unit, prov: job.province, ...(r.basis ? { basis: r.basis } : {}),
        },
        label: `${r.factor}: need ${r.need ?? '?'} ${r.unit}, you ${r.have ?? 'unanswered'} → ${r.verdict}`,
        ...(slots?.length ? { followups: slots } : {}),
        quote: r.evidence.label, evidence: { ...r.evidence },
      }
    })
}

// ── 时间窗 / 换省对照 / 比路(全 paid)────────────────────────────────────────

function timeRow(profile: TripleProfile): TripleRow {
  const m = profile.permitMonthsLeft
  return {
    gate: 'person', tier: 'paid', key: 'tv.time.permit', state: m == null ? 'unknown' : 'info',
    params: { months: m ?? '', status: profile.status ?? '' },
    label: `permit runway: ${m == null ? 'unanswered' : `${m} months left`} (status=${profile.status ?? '?'})`,
    ...(m == null ? { followups: ['permitMonthsLeft'] } : {}),
  }
}

/** 换省对照:目标省有没有这个职业的具名清单。**只摆事实作对照**,判定仍按手上这份岗算。 */
function crossProvinceRows(job: TripleJob, profile: TripleProfile, occs: OccupationRow[]): TripleRow[] {
  const out: TripleRow[] = []
  if (!profile.targetProvinces.length) {
    out.push({
      gate: 'person', tier: 'paid', key: 'tv.compare.noTarget', state: 'unknown',
      params: { basisProv: job.province }, followups: ['targetProvinces'],
      label: 'no target province on file — nothing to compare against',
    })
    return out
  }
  for (const prov of profile.targetProvinces) {
    if (prov === job.province) continue
    const hits = job.noc ? occs.filter((o) => o.noc === job.noc && o.province === prov && o.type === 'indemand') : []
    if (!hits.length) {
      out.push({
        gate: 'person', tier: 'paid', key: 'tv.compare.notListed', state: 'info',
        params: { prov, basisProv: job.province, noc: job.noc ?? '', nocName: job.nocName ?? '' },
        label: `target ${prov}: ${job.noc ?? '?'} is not on any named list there`,
      })
      continue
    }
    for (const o of hits) {
      out.push({
        gate: 'person', tier: 'paid', key: 'tv.compare.listed', state: 'info',
        params: { prov, basisProv: job.province, noc: o.noc, nocName: job.nocName || o.name, stream: o.stream, list: o.label },
        label: `target ${prov}: ${o.noc} is named on ${o.stream} — offer in hand is in ${job.province}, verdict still runs on this job`,
        quote: quoteOfOcc(o), evidence: evOfOcc(o),
      })
    }
  }
  return out
}

/**
 * 比路:哪几条线值得摆 + 谁最快。
 * 名次与 tier 全部来自 pathVerdict(排序语义原样复用);本层只做**入选**与**并列标记**:
 *   入选 = 手上这份岗所在省的通道 ∪(雇主已被 AIP 名录指定时的 AIP 线)∪ 目标省的通道;
 *   最快 = tier 最小的**可判**通道(availability='ok' 且非 excluded)。并列就都标 true。
 * 🔴 库里没有那条通道的门槛行 → pathVerdict 给 availability='not-collected',这里永远选不上它当最快
 *    —— 这就是「AIP 行抽掉后必须退化成缺口」的实现点,不是靠文案兜。
 * 🔴 目标省的线(role='target')**不参与「最快」评比**:pathVerdict 的 tier 语义是「offer 到手后还要等多久」,
 *    而他手上的 offer 在这份岗的省 —— 拿一份他没有的 offer 去跟手上这份比谁快,是替他排队。
 *    目标省只摆事实作对照(design §2 换省对照行同款口径)。
 */
function compareRows(job: TripleJob, company: TripleCompany, profile: TripleProfile, paths: PathwayVerdict[]): TripleCompareRow[] {
  const targets = new Set(profile.targetProvinces.filter((p) => p !== job.province))
  const aipDesignated = company.designation?.source === 'AIP'
  const rows: TripleCompareRow[] = []
  paths.forEach((v, rank) => {
    let role: TripleCompareRole | null = null
    if (v.key === 'AIP') role = aipDesignated ? 'aip' : null
    else if (v.province === job.province) role = 'current'
    else if (targets.has(v.province)) role = 'target'
    if (!role) return
    rows.push({
      key: v.key, province: v.province, stream: v.stream, role,
      verdict: v.verdict, tier: v.tier, availability: v.availability, rank, fastest: false,
    })
  })
  const judgeable = rows.filter((r) => r.role !== 'target' && r.availability === 'ok' && r.verdict !== 'excluded' && r.tier != null)
  if (judgeable.length) {
    const min = Math.min(...judgeable.map((r) => r.tier as number))
    for (const r of judgeable) if (r.tier === min) r.fastest = true
  }
  return rows
}

// ── 主函数 ──────────────────────────────────────────────────────────────────

/**
 * 岗 × 雇主 × 档案 → 一张判定卡的结构化行(纯函数;门槛/清单/名录行与公司事实由调用方查好传入)。
 * @param data 与 chatTools.loadVerdictData 同一个 VerdictData(判定层六张表),不另起数据面。
 */
export function tripleVerdict(
  job: TripleJob,
  company: TripleCompany,
  profile: TripleProfile,
  data: VerdictData,
  opts: { nowYear?: number } = {},
): TripleCard {
  const nowYear = opts.nowYear ?? new Date().getFullYear()
  const provReqs = data.requirements.filter((r) => r.province === job.province)
  const emp = employerVerdict(company.facts, job.province, data.requirements, nowYear)
  const paths = pathVerdict(profile, data)

  const rows: TripleRow[] = [
    ...occupationRows(job, data.occupations),
    ...employerRows(job, company, emp, data.requirements),
    ...personRows(job, profile, provReqs),
    timeRow(profile),
    ...crossProvinceRows(job, profile, data.occupations),
  ]

  const compare = compareRows(job, company, profile, paths)
  const fastest = compare.filter((c) => c.fastest)
  rows.push({
    gate: 'person', tier: 'paid', key: 'tv.route.fastest',
    state: fastest.length ? 'info' : 'unknown',
    params: {
      keys: fastest.map((c) => c.key),
      tier: fastest[0]?.tier ?? '',
      tied: fastest.length > 1,
      considered: compare.length,
    },
    label: fastest.length
      ? `fastest after offer: ${fastest.map((c) => c.key).join(', ')} (tier ${fastest[0]?.tier}${fastest.length > 1 ? ', tied' : ''})`
      : `no judgeable pathway among ${compare.length} compared — thresholds not on file, no conclusion offered`,
  })

  const followups = Array.from(new Set(rows.flatMap((r) => r.followups ?? [])))
  return {
    jobId: job.id, noc: job.noc, nocName: job.nocName, teer: job.teer, province: job.province,
    rows, compare, employer: emp, pathways: paths, followups,
    availability: provReqs.length ? 'ok' : 'not-collected',
  }
}
