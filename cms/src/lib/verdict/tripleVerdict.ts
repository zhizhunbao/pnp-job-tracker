// #287 批C · 一键三合一判定的**组装器**(design/一键三合一判定-20260809.md §3「三关拼装,零新判定逻辑」)。
// 一个问题三问合一——「这个岗我投了、入职了,到底能不能帮我拿身份?」——三关各自已有判定件,
// 本文件只做拼装:挑行、摆结构、标免费/付费位、点名缺槽。**一条新的判定规则都不许在这里长出来。**
//
// 复用件(只调用,不修改):
//   职业关 = job 行的 08_score 口径字段(pnpStream / pnpEligible / teer / aip)+ pnp_occupations 具名清单
//   雇主关 = employerVerdict(#284)+ designated_employers 名录行 + companies.lmia_nocs(#286)
//   个人关 = rules.evaluateRequirements(与 report.requirementLines / lib/chat/tools.lookupThresholds 同一套挑行口径:
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
  blockCost, pathVerdict,
  type DesignatedEmployerRow, type OccupationRow, type PathwayVerdict, type VerdictData, type VerdictProfile,
} from './pathVerdict'
import { evaluateRequirements, type Requirement, type RuleProfile, type RuleResult } from '../rules'
// 只 import type(同 pathVerdict):编译期擦除,不给消费端加运行时边。
import type { Availability, Evidence } from '../chat'

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
   * designated_employers 名录里**唯一**命中的行(口径=designationMatch 的完全匹配,见该文件抬头)。
   * **null = 没认出 或 多配**,两种情形由 designationMatches 区分:
   *   0 → 本站没在名录里认出这家(认不出 ≠ 官方没指定)→ 判定落 unknown,不写「未被指定」
   *   ≥2 → 同名/同链法人多家(连锁加盟:20 家 `… o/a Tim Hortons` 全是合法完全匹配),
   *        「哪一家是你这份岗的雇主」不可证 → 只报家数不点名(tv.emp.designatedMulti)
   */
  designation: DesignatedEmployerRow | null
  /** 名录里完全匹配到的法人数(0 / 1 / N);designation 为 null 时靠它区分「没认出」与「多配」 */
  designationMatches: number
  /** 多配时仍说得清是哪个名录(AIP…);没认出或多配行 source 不一致 → '' */
  designationSource: string
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

type TripleGate = 'occupation' | 'employer' | 'person'
/** design §5:三关事实 free,比路结论+差值+下一步 paid */
type TripleTier = 'free' | 'paid'
/** pass=达标 / gap=差某项 / excluded=硬伤 / unknown=判不了(缺槽或库缺行) / info=摆事实不判定 */
type TripleState = 'pass' | 'gap' | 'excluded' | 'unknown' | 'info'

type TripleRow = {
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
type TripleCompareRole = 'current' | 'aip' | 'target'
type TripleCompareRow = {
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

/**
 * 一句可复述的结论(设计 PR评估页三步重设计-20260812.md §2「跨步规矩 B3」)。
 *
 * 🔴 **由确定性层拼,不新增判定、不让 LLM 合成**(工具层红线)。原料只有两样,都是这张卡已经算出来的:
 *    ① 职业关的官方排除清单命中(硬伤);② `pathVerdict` 对**这份岗所在省**那几条通道的裁决。
 *    「差哪一项」的次序共用 pathVerdict 的 `blockCost`(offer 最好拆 → … → 加拿大学历最难),
 *    不另立一把尺子 —— 裁决、排序、结论句三处同源。
 * 🔴 免费/付费口径**没有变**:这几条通道的裁决在同一页的「你的初步方案」上本来就是免费的,
 *    这里只是把「这份岗所在省那条」摘出来说成一句人话。逐项差值(差几分/差几个月)仍在付费位。
 */
type TripleConclusionKind = 'ok' | 'blocked' | 'needs-info' | 'excluded' | 'not-collected'
type TripleConclusion = {
  kind: TripleConclusionKind
  key: string
  params: Record<string, string | number | boolean | string[]>
  /** 结论锚在哪条通道(能走的那条 / 被卡住的那条);not-collected 时为空 */
  pathway?: string
  /** blocked 时:最难拆的那道闸(offer / statusInCanada / credentialCanada / language / selfEmployed) */
  gate?: string
  /** 英文调试串,**不是** UI 文案 */
  label: string
}

export type TripleCard = {
  jobId: number
  /** 一句可复述的结论(见 TripleConclusion) */
  conclusion: TripleConclusion
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

/**
 * 一条通道**本站收录的门槛行**覆盖了哪几档 TEER(按 pnp_requirements.appliesTeer 聚合)。
 * 🔴 这是**收录范围的下界**,不是官方受理范围的全集 —— 所以它只有一个用途:
 *    否掉粗筛的对错符号(「我们有行的那条通道并不收这一档」),**永不**拿来下「你不行」的结论。
 *    (开放世界的表做封闭世界推理,正是 2026-08-12 判定口径根治要根治的那个病。)
 */
type TeerScope = { stream: string; teers: number[]; row: Requirement }

function teerScopes(provReqs: Requirement[]): TeerScope[] {
  const by = new Map<string, { teers: Set<number>; row: Requirement; span: number }>()
  for (const r of provReqs) {
    if (r.subject !== 'applicant' || !r.appliesTeer) continue
    const ts = r.appliesTeer.split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n))
    if (!ts.length) continue
    const cur = by.get(r.stream) ?? { teers: new Set<number>(), row: r, span: 0 }
    ts.forEach((n) => cur.teers.add(n))
    // 引哪一行的原句:覆盖面最宽的那行最能代表这条通道的档位表(PE 只有一行,NS/ON 取 0-3 那行)
    if (ts.length > cur.span) { cur.row = r; cur.span = ts.length }
    by.set(r.stream, cur)
  }
  return [...by.entries()].map(([stream, v]) => ({ stream, teers: [...v.teers].sort((a, b) => a - b), row: v.row }))
}

/** 该省的**具名(定向)清单**:一张清单一条,带它绑的官方通道名与清单里的职业数。 */
type NamedList = { label: string; stream: string; count: number; url: string; fetched: string }

function namedLists(province: string, occs: OccupationRow[]): NamedList[] {
  const by = new Map<string, NamedList>()
  for (const o of occs) {
    if (o.province !== province || o.type !== 'indemand') continue
    const cur = by.get(o.label)
    if (cur) cur.count += 1
    else by.set(o.label, { label: o.label, stream: o.stream, count: 1, url: o.url, fetched: o.fetched })
  }
  return [...by.values()]
}

// ── 三关 ────────────────────────────────────────────────────────────────────

/**
 * 职业关(全 free):具名清单命中 / 排除清单命中 / TEER 粗筛档。零新判定,全是查表。
 *
 * 举证标准三态(设计 docs/design/PR评估页三步重设计-20260812.md §2「跨步规矩」,与 gateManifest 同一套规矩):
 *   官方门槛行判出来 → 对错符号 + 官方原句 + 出处
 *   **本站粗筛**     → **不给对错符号**,明写是粗筛,并指向本站收录的真门槛
 *   库里没有         → 「本站未收录」,不拿「页上没写」当「官方不要求」
 */
function occupationRows(job: TripleJob, occs: OccupationRow[], provReqs: Requirement[]): TripleRow[] {
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
    // 「未命中该省任何具名清单」事实无误,但**读起来像判死** —— 定向清单只绑它自己那条通道
    // (PE 的 OID 就 8 个职业,该省另有技术工人/关键工人/国际毕业生几条不看清单的通道)。
    // 所以这一行必须带**适用范围**:哪张清单、多少个职业、绑哪条通道;一张都没收录时说「未收录」而不是「未命中」。
    // **「官方不设清单」是要举证的断言**(2026-08-14 Frank 实拍 NL:「本站未收录 NL 的定向清单」
    // 让用户去官网找一份不存在的清单)——举证=资格页逐条只有 offer/身份/语言/经验,无职业清单条目。
    // NL 的 nl-priority 是「优先处理表」(官方明说不在表上不等于不能申请,且只给职位名无 NOC 码),不构成定向清单。
    const OCC_LIST_NONE: Record<string, { url: string; fetched: string }> = {
      NL: { url: 'https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate', fetched: '2026-08-12' },
      // ON(2026-08-15 #322 查证,crawl 缓存举证):旧定向通道已死 ——「this stream was closed as of
      // May 30, 2026, as part of the OINP redesign」(In-Demand Skills 页);新制单一通道明说全职业
      // ——「…with a qualifying job offer and work experience in any National Occupational
      // Classification (NOC) occupation」。所以 ON 是「官方无定向清单」,不是「本站未收录」。
      ON: { url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream', fetched: '2026-08-15' },
    }
    const lists = namedLists(job.province, occs)
    const only = lists.length === 1 ? lists[0] : null
    const none = !lists.length ? OCC_LIST_NONE[job.province] : undefined
    if (none) {
      out.push({
        gate: 'occupation', tier: 'free', key: 'tv.occ.noList', state: 'info',
        params: { noc: job.noc ?? '', nocName, prov: job.province },
        label: `${job.province} employer-offer streams set no occupation list (eligibility pages enumerate offer/status/language only)`,
        evidence: { url: none.url, fetched: none.fetched, label: job.province },
      })
    } else {
      out.push({
        gate: 'occupation', tier: 'free', key: 'tv.occ.notListed',
        state: lists.length ? 'info' : 'unknown',
        params: {
          noc: job.noc ?? '', nocName, prov: job.province,
          lists: lists.map((l) => l.label), listCount: lists.length,
          list: only?.label ?? '', stream: only?.stream ?? '', count: only?.count ?? 0,
        },
        label: lists.length
          ? `occupation ${job.noc ?? '?'} is not on any of the ${lists.length} named list(s) of ${job.province} — named lists bind only their own stream`
          : `no named occupation list on file for ${job.province}`,
        ...(only?.url && only.fetched ? { evidence: { url: only.url, fetched: only.fetched, label: only.stream } } : {}),
      })
    }
  }

  // 粗筛档。2026-08-14 Frank 拍板「满足的显示绿色对勾 不满足的就差红色」—— state 改按 pnpEligible 分
  // pass/excluded(原「永不 pass、中性圆点」作废)。防「拿粗筛冒充官方结论」的担子挪到**措辞**上:
  // 文案只说「初筛通过/未过」(本站的筛),不说「在该省受理范围内」(那是官方口径,PE 反例:
  // 技术工人通道 applies_teer=0-3 而 TEER 5 岗靠同雇主 6 个月通道照样 pnpEligible=true)。
  const scopes = teerScopes(provReqs)
  const outScope = job.teer == null ? undefined : scopes.find((s) => !s.teers.includes(job.teer as number))
  out.push({
    gate: 'occupation', tier: 'free', key: 'tv.occ.teer',
    state: job.teer == null ? 'unknown' : job.pnpEligible ? 'pass' : 'excluded',
    params: {
      teer: job.teer ?? '', prov: job.province, noc: job.noc ?? '', nocName,
      coarsePass: job.pnpEligible,
      // 指向真门槛:本站收录的门槛行里,有哪条通道**不收**这一档(没有这样的通道就不指,更不编)
      scopeStream: outScope?.stream ?? '',
      scopeTeers: outScope ? outScope.teers.map(String) : [],
      // 该省一条按 TEER 分档的门槛行都没收录 → 三态里的「库里没有」,说未收录不说不要求
      scoped: scopes.length > 0,
    },
    label: `TEER ${job.teer ?? '?'} — ${job.province} coarse screen ${job.pnpEligible ? 'not ruled out' : 'ruled out'}`
      + (outScope ? `; on file: ${outScope.stream} covers TEER ${outScope.teers.join(',')}` : ''),
    ...(outScope ? { quote: quoteOfReq(outScope.row), evidence: evOfReq(outScope.row) } : {}),
  })
  return out
}

/** 指定雇主名录是 AIP 的制度,只覆盖大西洋四省 —— 名录默认行(未匹配/多配)只对这四省有意义 */
const AIP_PROVINCES = new Set(['NS', 'NB', 'PE', 'NL'])

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
  } else if (AIP_PROVINCES.has(job.province)) {
    // 「未匹配/多配」两种默认行**只在 AIP 四省发**(2026-08-13 Frank:「曼省还有指定雇主这一说吗?」——
    // 指定雇主是 AIP 的制度,名录行先前对全国岗都发,MB 岗上一句「非指定雇主」是拿别省的制度
    // 说这家雇主的不是)。命中行(上面 d 非空)不设省门:真命中名录就是事实,行里自带 program/省。
    if (company.designationMatches >= 2) {
      // 多配:「这条链在名录里」为真,「这家法人=你这份岗的雇主」不可证 → 摆家数,不点名法人。
      // state='info'(摆事实不判定)而非 'pass' —— 下游 compareRows 靠 designation 非空才把 AIP
      // 当已确证通道,多配时它是 null,AIP 线自然不进比路、不会被标「最快」(付费结论不冒险)。
      out.push({
        gate: 'employer', tier: 'free', key: 'tv.emp.designatedMulti', state: 'info',
        params: { name: company.name, prov: job.province, count: company.designationMatches, program: company.designationSource },
        label: `${company.designationMatches} designated employers in ${job.province} match the name "${company.name}" — chain is listed, this employer is unproven`,
      })
    } else {
      out.push({
        gate: 'employer', tier: 'free', key: 'tv.emp.designationUnknown', state: 'unknown',
        params: { name: company.name, prov: job.province },
        // 「名录里没认出」≠「官方没指定」(CLAUDE.md:官方不公布是需要举证的断言)
        label: `${company.name} not matched in the designated employer list — site gap, not proof of non-designation`,
      })
    }
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
  // 年营业额(2026-08-14 Frank「需要加一个年收入的卡片」;2026-08-16「这个缺一个营业额吧」→
  // **恒显**,不再只在门槛行在库的省出 —— 同一张卡格子集不齐会被读成漏渲):
  // 公司营业额无源(08-10 拍板永久结案,不重启抓数)→ 恒 unknown,前端按「未收录」渲染
  {
    const src = reqOf('empRevenue')
    out.push({
      gate: 'employer', tier: 'free', key: 'tv.emp.revenue', state: 'unknown',
      params: { need: ev.revenue?.need ?? '', name: company.name, prov: job.province },
      label: `employer revenue: need ${ev.revenue?.need ?? '?'} CAD/yr, company revenue permanently uncollected`,
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

/**
 * 结论句:一句话说清「这份岗现在行不行、卡在哪」。
 *
 * 挑通道 = 这份岗所在省的通道 ∪(雇主已被 AIP 指定时的 AIP 线)—— 与 compareRows 的 current/aip 同一批,
 * **目标省的线不参与**(拿他没有的 offer 去下结论就是替他排队)。取舍次序:
 *   职业被官方排除 → 有能走的 → 被闸卡住 → 判不了 → 本站未收录该省门槛
 * 「有能走的」优先于「被卡住」:同省多条通道时,能走一条就是能走,不拿最差那条吓人。
 */
function conclude(job: TripleJob, rows: TripleRow[], compare: TripleCompareRow[], paths: PathwayVerdict[]): TripleConclusion {
  const excluded = rows.find((r) => r.key === 'tv.occ.excluded')
  if (excluded) {
    return {
      kind: 'excluded', key: 'tv.sum.excluded',
      params: { prov: job.province, list: String(excluded.params.list ?? ''), noc: job.noc ?? '', nocName: job.nocName ?? '' },
      label: `excluded: ${job.noc ?? '?'} is on ${String(excluded.params.list ?? '')} in ${job.province}`,
    }
  }

  const byKey = new Map(paths.map((p) => [p.key, p]))
  const mine = compare
    .filter((c) => c.role !== 'target' && c.availability === 'ok')
    .map((c) => ({ c, v: byKey.get(c.key) }))
    .filter((x): x is { c: TripleCompareRow; v: PathwayVerdict } => !!x.v)

  // ① 能走的:open 且没被闸卡住。并列时取 tier 最小(pathVerdict 的排序语义,本层不重排)
  const open = mine.filter((x) => x.v.verdict === 'viable' && !x.v.blockedBy)
    .sort((a, b) => (a.c.tier ?? 9) - (b.c.tier ?? 9))
  if (open.length) {
    const top = open[0]
    return {
      kind: 'ok', key: 'tv.sum.ok', pathway: top.c.key,
      params: { route: top.c.key, prov: job.province, tier: top.c.tier ?? '', count: open.length },
      label: `ok: ${top.c.key} open (tier ${top.c.tier ?? '?'}), ${open.length} pathway(s) clear`,
    }
  }

  // ② 被卡住的:报**最好拆的那道闸**(它就是「下一步该干什么」)——次序共用 pathVerdict.blockCost
  const blocked = mine.filter((x) => !!x.v.blockedBy)
    .sort((a, b) => blockCost(a.v.blockedBy) - blockCost(b.v.blockedBy))
  if (blocked.length) {
    const top = blocked[0]
    // 语言差档要报**官方门槛值**:他答过 CLB,一句「你还缺语言成绩」会读成「我们没收到你的答案」。
    // need 取自 pathVerdict 已经算好的那条理由(官方门槛,免费事实);**差多少不进这里** —— 差值是付费位。
    const lang = top.v.reasons.find((r) => r.key === 'pv.langGap')
    const need = top.v.blockedBy === 'language' ? Number(lang?.params?.clb ?? 0) : 0
    return {
      kind: 'blocked', key: 'tv.sum.blocked', pathway: top.c.key, gate: top.v.blockedBy,
      params: {
        gate: top.v.blockedBy ?? '', route: top.c.key, prov: job.province, count: blocked.length,
        ...(need > 0 ? { need } : {}),
      },
      label: `blocked: ${top.c.key} needs ${top.v.blockedBy}${need > 0 ? ` (CLB ${need})` : ''}`,
    }
  }

  // ③ 判不了:点名缺哪个档案槽。**只取 pathVerdict 自己记的 missingSlots**(他一步能补的那几样)——
  //    不拿整卡的 followups 凑数:工签剩余月数/家庭人数/目标省是时间窗、资金档、换省对照要的,
  //    它们缺不缺都不决定「这份岗能不能走」,写进结论句就是拿无关项挡人。
  //    一个槽都点不出来 = 缺的是条文不是答案 → 落 not-collected(谁的窟窿说清楚)。
  const needs = mine.filter((x) => x.v.verdict === 'needs-info')
  const slots = Array.from(new Set(needs.flatMap((x) => x.v.missingSlots ?? [])))
  if (needs.length && slots.length) {
    return {
      kind: 'needs-info', key: 'tv.sum.needsInfo', pathway: needs[0].c.key,
      // 点名是**哪条通道**判不了:这张卡挂在一份 PE 的岗上,结论却可能说的是 AIP
      //(PE 自己那条本站没收录资格页,压根进不了 mine)—— 不写通道名,用户读到的就是「爱德华王子岛判不了」
      params: { slots, route: needs[0].c.key, prov: job.province, count: needs.length },
      label: `needs-info: ${needs[0].c.key} undecidable, missing ${slots.join(',')}`,
    }
  }

  // ④ 一条可判通道都没有 —— 本站的窟窿,如实说未收录,不说「你不行」
  return {
    kind: 'not-collected', key: 'tv.sum.notCollected',
    params: { prov: job.province, considered: compare.length },
    label: `not-collected: no judgeable pathway in ${job.province} (${compare.length} compared)`,
  }
}

// ── 主函数 ──────────────────────────────────────────────────────────────────

/**
 * 岗 × 雇主 × 档案 → 一张判定卡的结构化行(纯函数;门槛/清单/名录行与公司事实由调用方查好传入)。
 * @param data 与 lib/chat/tools.loadVerdictData 同一个 VerdictData(判定层六张表),不另起数据面。
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
  // 带岗判定的前提就是「拿这份岗当目标」(2026-08-13 Frank:「缺 job offer 还用你判定啊?
  // 来这个网站不都是缺 job offer 的吗」)—— offer 闸在本卡**恒视为已满足**:这张卡回答的是
  // 「拿下这份 offer 之后还卡在哪」(比路行的语义本来就是 fastest after offer),
  // 拿「你现在没 offer」当拦路结论是对每个访客说同一句废话。
  // 只改这张带岗卡;无岗初评(/api/profile-pathways)仍按真实答案判 offer 闸。
  const paths = pathVerdict({ ...profile, hasOffer: true }, data)

  const rows: TripleRow[] = [
    ...occupationRows(job, data.occupations, provReqs),
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

  // 「你这边」的免费裁决行:被卡住的那道闸(与结论句同源,也与本页免费的方案卡同源)。
  // 逐项数值差(差几分/差几个月)仍在 paid 行,免费/付费口径没动。
  const conclusion = conclude(job, rows, compare, paths)
  if (conclusion.gate) {
    rows.push({
      gate: 'person', tier: 'free', key: 'tv.you.gate', state: 'gap',
      params: { gate: conclusion.gate, route: conclusion.params.route ?? '', prov: job.province },
      label: `you: ${conclusion.pathway} is blocked by ${conclusion.gate}`,
    })
  }
  // 🔴 这份岗所在省**本站没收录门槛**的通道要说出来,不许静默丢掉(CLAUDE.md:未收录是我们的问题,
  //    得让用户知道该去官网看)。先前它们只是进不了比路,页面上一个字都没有 ——
  //    于是一张 PE 的岗上写着「判不了」,而判不了的其实是 AIP,PEI 那条压根没露过面。
  const notCollected = compare.filter((c) => c.role !== 'target' && c.availability !== 'ok')
  if (notCollected.length) {
    rows.push({
      gate: 'person', tier: 'free', key: 'tv.you.notCollected', state: 'unknown',
      params: { routes: notCollected.map((c) => c.key), prov: job.province },
      label: `not on file: ${notCollected.map((c) => c.key).join(', ')} thresholds not collected`,
    })
  }

  const followups = Array.from(new Set(rows.flatMap((r) => r.followups ?? [])))
  return {
    jobId: job.id, conclusion,
    noc: job.noc, nocName: job.nocName, teer: job.teer, province: job.province,
    rows, compare, employer: emp, pathways: paths, followups,
    availability: provReqs.length ? 'ok' : 'not-collected',
  }
}
