// 报告引擎(L2-01/L2-02,决策引擎层)。规则只住这一处:答题页出报告、advisor 联动都消费它的输出。
// 纯函数、无 IO、前后端同构:报告 = 基本 4 题答案 × 现有维度(pnp_occupations/ee_categories/pnp_draws)
// × 职业事实聚合(jobs 按 NOC×省)。v1 只做卡②「拿 PR」;七卡共用 Report 契约,加卡=加 builder 不改契约。
//
// 契约(L2-02 §1):结论(一句话)→ 依据(数据+出处+日期)→ 缺口(差什么差多少)→ 下一步 → 备选。
// 四条铁律(L2-01 §2.2):无解不给空页(0 命中给缺口与备选);每条结论带证据(source);
// 数据不足降 confidence 并写明为什么;缺口照实说(不公布算分的省只给规则对照,不硬编分差)。
// 措辞红线(与 match.ts 同族):只陈述「在/不在公开清单」「高于/低于抽选线」等可核验事实,永不说「你能/不能移民」。
// 「0 命中」必须过 provListCoverage 四态(2026-07-30 报告原型教训):listed 才可说「查过不在」,
// exclusion(ON)是制度性无清单、uncovered 是本站没数据 —— 三者混为一谈=报告撒谎。
// 抽选线红线(2026-07-27):线按通道设,对不上通道就不给差分结论,只摆区间;样本小就说小(params 带 n)。
import { provListCoverage, type MatchDims, type MatchProfile, type MatchVerdict } from './match'
import { gridStreamOf, scoreProvince, streamMatches, systemShort, type ScoreFactor, type SelfProfile } from './pnpSelfScore'
import { areaOfPlace, employerBar, evaluateRequirements, type Requirement, type RuleResult } from './rules'
import type { OccStats } from './reportFacts'   // 纯类型(reportFacts 反向引 ReportFacts,两边都是 type-only,不成环)

// ── 输入:事实聚合(由 API 层查库组装;引擎不碰 SQL)─────────────────────────
// medianWage=该职业在该省的 ESDC 官方中位年薪(最低收入门槛的对照基准:岗位自带的事实,不问用户)
export type OccProvFacts = { province: string; open: number; named: number; medianWage?: number | null }
export type ReportDraw = { province: string; drawDate: string; stream: string; score: number | null; invitations?: number | null }
export type ReportFacts = {
  noc: string
  title: string                     // NOC 官方名(noc_descriptions,不拿岗位标题冒充)
  teer: number | null
  byProv: OccProvFacts[]
  draws: ReportDraw[]               // pnp_draws(省抽选;FED 行=联邦 EE,本引擎省节不取)
  medianSalary?: number | null
  scoreFactors?: ScoreFactor[]      // 官方分值表整张(pnp_score_factors;换省对照节按行匹档位)
  scoreProvinces?: string[]         // 有官方分值表的省(由 scoreFactors 派生,如 BC/SK/ON)
  scores?: Record<string, { total: number; passMark: number | null; system: string; url: string; fetched: string }>  // 用户已算的省估分(pnpSelfScore 输出)
  requirements?: Requirement[]      // 官方门槛(pnp_requirements;规则引擎的输入,只 BC 有数据时其余省=未收录)
  fetched?: string                  // 事实聚合的数据日期
}
// 卡②基本 4 题里引擎新增消费的字段(currentStatus/clb/targetProvinces 已在 MatchProfile)
export type ReportExtra = { canadianExpMonths: number | null }

// ── 输出:七卡同一契约 ───────────────────────────────────────────────────────
export type ReportLine = {
  key: string                                   // i18n 键(rpt.*)
  params: Record<string, string | number>
  // 行尾灰字(v5 定稿 HTML 的 .tail):主句之外那个「顺带一说」的事实,桌面右对齐、手机自成一行。
  // 换省对照用它挂该省最近一次抽选(Frank 2026-08-01「不需要显示一下最近的最低分数吗」)。
  tail?: { key: string; params: Record<string, string | number> }
  verdict?: MatchVerdict                        // UI 着色用(pass/warn/fail/na)
  source?: { label: string; url: string; fetched: string }   // 依据链:指回具体维度记录/官方页
  url?: string                                  // 站内深链(下一步/备选用)
}
// 雇主线索一行(锁区正文,付费层才下发)。全是可核验事实,一条判断都不放 ——
// 「这家发过命中省提名清单的岗」「ESDC 批过多少 LMIA」「在不在 AIP 指定雇主名单」「最近还在发」。
// 措辞红线同 match.ts:永远不说「这家好签 / 容易担保」——雇主愿不愿意担保只有雇主自己知道。
export type ReportEmployer = {
  name: string; slug: string; named: number; eligible: number
  city: string; province: string; lastPosted: string
  lmiaPositions: number | null; lmiaQuarter: string; aip: boolean
  // 雇主侧门槛落到这一家(设计 §3.5「地点这项本站判得了」):area=官方分档区域键,
  // empRevenue/empStaff=该区域对应的官方阈值;认不出普查区时 empRevenue 为空,只给雇员数。
  area: string; empRevenue: number | null; empStaff: number | null
}
export type Report = {
  goal: 'pr' | 'job' | 'career' | 'prov'
  noc: string
  title: string
  conclusions: ReportLine[]
  employers: ReportEmployer[]       // 雇主线索(锁区):免费层服务端清空,只留「有 N 家」那句话
  requirements: ReportLine[]        // 门槛对照(规则引擎;设计 §6 新增的一节)—— 官方要求 × 你的情况
  switches: ReportLine[]            // 换省对照(L2-08)—— 现选省 vs 备选省,按官方分值表自算下界分
  gaps: ReportLine[]
  nextSteps: ReportLine[]
  alternatives: ReportLine[]
  confidence: 'low' | 'mid' | 'high'
  asOf: string
}

// 薪资一律显示成 $88.4K(站内既有口径:职位卡 $49K/yr、统计页 $74.9K);裸 88400 读起来像编号
const k = (n: number): string => `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
// 百万级(雇主营业额门槛)另走一档:$1000K 没人这么读,官方写的就是 $1,000,000
const m = (n: number): string => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : k(n))

const RECENT_DRAWS = 6      // 抽选区间取近 N 次(区间/节奏都基于它;params 恒带实际条数,样本小就说小)
const ALT_CAP = 2           // 备选省上限(④ 预判下一问:给对照不铺全表)
// 受监管护士(与 pathways.ts 同口径):注册类职业先过认证才能执业 —— 句式①「说中他没提的卡点」
const REGULATED_NURSE = new Set(['31301', '32101'])
const NNAS_SRC = { label: 'NNAS — internationally educated nurses', url: 'https://www.nnas.ca/', fetched: '' }
// 站内没有 CRS 计算器(省估分只做了 BC/SK)。问了 CRS 却不给算的地方 = 死路,
// 所以缺口行与下一步都指官方工具;要不要自建 CRS 算分是单独一件事,别在这里编公式。
const CRS_TOOL = {
  label: 'IRCC — Comprehensive Ranking System tool',
  url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score.html',
  fetched: '',
}
// 魁省走自己的甄选体系(Arrima/PSTQ),不属于省提名 —— 本站没有魁省数据,所以不判、也不装作判过,
// 但要把官方入口给出去(Frank:「魁省如果有通道好移民那不是更好么」——好不好我们没数据,别替他关门)
const QC_SRC = {
  label: 'Québec — immigration permanente (Arrima)',
  url: 'https://www.quebec.ca/en/immigration/permanent',
  fetched: '',
}
const CEC_SRC = {
  label: 'IRCC — Canadian Experience Class eligibility',
  url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/canadian-experience-class.html',
  fetched: '',
}

// ── 门槛对照(规则引擎;设计《规则引擎与题库配对》§6)────────────────────────
// 求值全在 lib/rules.ts(纯函数、阈值来自 pnp_requirements),这里只把结果排成句子:
// 一行一条官方门槛,左=官方要求、右=你的情况。**该省没收录门槛就说没收录**,不拿别省套。
// 收入这条的对照基准是「该职业在该省的官方中位年薪」(岗位自带的事实,不是他本人的工资)——
// 句子里必须写清是职业中位,否则等于替他填了一个他没说过的数。
const REQ_VERDICT: Record<string, MatchVerdict> = { pass: 'pass', fail: 'fail', unknown: 'na' }
function requirementLines(prov: string, facts: ReportFacts, profile: MatchProfile, extra: ReportExtra): ReportLine[] {
  const reqs = (facts.requirements ?? []).filter((r) => r.province === prov)
  if (!reqs.length) return [{ key: 'rpt.r.none', params: { prov }, verdict: 'na' }]

  const f = facts.byProv.find((r) => r.province === prov)
  const results = evaluateRequirements(reqs, {
    noc: facts.noc,              // ON 的语言分档要看职业是不是官方列的技工
    teer: facts.teer,
    clb: profile.clb,
    canadianExpMonths: extra.canadianExpMonths,
    familySize: null,            // 家庭人数尚未入题库 → 引擎按「1 人档」做下界推理(不默认成 1 人)
    annualIncome: f?.medianWage ?? null,
    incomeIsOccMedian: true,
    area: null,                  // 住大温还是 BC 其余没问 → 引擎两档都摆,只在确定时下判定
  })

  // 出处:所有门槛都指同一份官方指南 → 底部「依据与链接」按 URL 去重后就该是一条,
  // 所以 label 用文件名而不是某一条的官方原句(拿第一条的句子当整份文件的名字会对不上后面几条)
  const src = { label: `${prov} PNP — official program guide`, url: reqs[0].url || reqs[0].pageUrl, fetched: reqs[0].fetched }
  const line = (r: RuleResult, key: string, params: Record<string, string | number>): ReportLine => ({
    key, params: { prov, ...params }, verdict: REQ_VERDICT[r.verdict], source: src,
  })
  const out: ReportLine[] = []
  for (const r of results) {
    if (r.factor === 'language') {
      const teer = facts.teer ?? ''
      if (r.need == null) out.push(line(r, 'rpt.r.langNone', { teer }))
      else if (r.verdict === 'unknown') out.push(line(r, 'rpt.r.lang.unknown', { teer, need: r.need }))
      else if (r.verdict === 'pass') out.push(line(r, 'rpt.r.lang.pass', { teer, need: r.need, have: r.have ?? '' }))
      else out.push(line(r, 'rpt.r.lang.fail', { teer, need: r.need, have: r.have ?? '', short: r.short ?? '' }))
    } else if (r.factor === 'income') {
      const need = r.need != null ? k(r.need) : ''
      const needLow = r.needLow != null ? k(r.needLow) : ''
      const have = r.have != null ? k(r.have) : ''
      if (r.verdict === 'pass') out.push(line(r, 'rpt.r.income.pass', { need, have }))
      else if (r.verdict === 'fail') out.push(line(r, 'rpt.r.income.fail', { need: needLow || need, have, short: r.short != null ? k(r.short) : '' }))
      else out.push(line(r, 'rpt.r.income.unknown', { need, needLow, have }))
    } else if (r.factor === 'experience') {
      const months = r.need ?? 0
      if (r.verdict === 'pass') out.push(line(r, 'rpt.r.exp.pass', { need: months, have: r.have ?? '' }))
      else out.push(line(r, 'rpt.r.exp.unknown', { need: months, have: r.have ?? '' }))
    } else if (r.factor === 'languageExempt') {
      out.push(line(r, 'rpt.r.langExempt', { n: r.need ?? '' }))
    } else if (r.factor === 'wage') {
      // basis=occMedian:阈值就是该职业该地区的官方中位;取不到中位就只陈述规则本身
      out.push(line(r, r.need != null ? 'rpt.r.wage.median' : 'rpt.r.wage.rule', { need: r.need != null ? k(r.need) : '' }))
    } else if (r.factor === 'empYears') {
      out.push(line(r, 'rpt.r.emp.years', { n: r.need ?? '' }))
    } else if (r.factor === 'empRevenue') {
      // 三档按区域摆(GTA / 指定普查区 / 其余);档位名各省各叫各的,所以键按最高档的区域取
      out.push(line(r, 'rpt.r.emp.rev', {
        hi: r.need != null ? m(r.need) : '', lo: r.needLow != null ? m(r.needLow) : '',
        mid: r.tiers?.length === 3 && r.tiers[1].value != null ? m(r.tiers[1].value as number) : '',
      }))
    } else if (r.factor === 'empStaff') {
      // BC 说「大温 / 大温以外」、ON 说「GTA 内 / 外」—— 同一件事两套地名,按最高档的区域名选句子
      const area = r.tiers?.[0]?.area ?? ''
      out.push(line(r, area === 'gta' ? 'rpt.r.emp.staff.gta' : 'rpt.r.emp.staff.metro', { metro: r.need ?? '', rest: r.needLow ?? '' }))
    }
  }
  return out
}

// ── 换省对照(L2-08「换一个省会更有利吗?」)────────────────────────────────────
// 报告只问 4+2 题,官方分值表要 8 个字段 —— 所以这里算的是**下界**:
// 只拿已答的语言与加拿大经验去匹官方档位(白名单 only),其余因素一律当未答(0 分)。
// 分值全为非负 ⇒ 已答项之和确实是「至少这么多分」,句子也照实写「至少」。
// 两条红线:① 未答的因素不许参与匹配(否则「没考语言」会被兜到最低档白捡分);
// ② 只在下界已过门槛时才说「已达标」,低于门槛**不说不达标**(补齐后只会更高)。
// 免责句 2026-08-01 撤掉(Frank「这个废话删了」):法律免责由全站页脚那句统一承担,
// 每节再来一遍就是废话;每行都写「离**该省**门槛多少」,本来也没请人横向比分数。
const SWITCH_CAP = 3        // 备选省上限(给对照不铺全表,与 ALT_CAP 同精神)

function recentDrawsOf(facts: ReportFacts, prov: string): ReportDraw[] {
  return facts.draws
    .filter((d) => d.province === prov && d.score != null)
    .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
    .slice(0, RECENT_DRAWS)
}

/** 已答字段 → SelfProfile + 自动匹配白名单。没答的字段给中性值,靠 only 挡住,不让它去匹档位 */
function selfFromAnswers(profile: MatchProfile, months: number | null): { self: SelfProfile; only: Set<string> } {
  const only = new Set<string>()
  if (profile.clb != null) { only.add('language'); only.add('language1') }
  // 加拿大经验当「同职业经验年数」用是下界口径(境外经验也算分,本站没问)——句子里写清是「已答的加拿大经验」
  if (months != null) { only.add('work'); only.add('work5') }
  return {
    self: { edu: 'highschool', expRecent: months != null ? months / 12 : 0, expOlder: 0, clb1: profile.clb ?? 0, clb2: 0, age: 0 },
    only,
  }
}

function switchLines(facts: ReportFacts, dims: MatchDims, profile: MatchProfile, months: number | null, targets: string[]): ReportLine[] {
  const factors = facts.scoreFactors ?? []
  const cur = targets[0]
  if (!cur || !factors.length) return []
  const { self, only } = selfFromAnswers(profile, months)
  const scoreOf = (prov: string) => scoreProvince(factors, prov, self, {}, {}, only)

  // 抽选事实 → 行尾灰字(Frank 2026-08-01「不需要显示一下最近的最低分数吗」)。
  // 红线两条:① 打分表自报了通道就只认同通道的抽选(ON 的旧通道分数线不配新分制);
  // ② 该省近几轮跨了多个通道就只给区间 —— BC 近几轮 Rural Health 50 / Innovate 132,
  //    把 50 说成「BC 最近一次」会让人以为自己够线了。
  // 邀请人数是官方每轮公布的真数,单通道时一并给;
  // **候选池规模与在池时长各省都不公布,本站没有这两个数,宁可不写也不编。**
  const tailOf = (prov: string, gridStream: string): ReportLine['tail'] => {
    const all = recentDrawsOf(facts, prov)
    const recent = gridStream ? all.filter((d) => streamMatches(d.stream, gridStream)) : all
    if (!recent.length) return undefined
    const scores = recent.map((d) => d.score as number)
    if (new Set(recent.map((d) => d.stream)).size > 1) {
      return { key: 'rpt.s.tail.band', params: { n: recent.length, lo: Math.min(...scores), hi: Math.max(...scores) } }
    }
    const inv = recent[0].invitations
    return {
      key: inv ? 'rpt.s.tail.oneInv' : 'rpt.s.tail.one',
      params: { date: recent[0].drawDate.slice(0, 10), cut: scores[0], ...(inv ? { inv } : {}) },
    }
  }

  // 一个省一行:有分值表就报下界分,没有就明说未公布(没分值表也照样给抽选事实 —— 那是另一回事)
  const lineFor = (prov: string, isCur: boolean): ReportLine => {
    const s = scoreOf(prov)
    if (!s) {
      const t0 = tailOf(prov, '')
      return { key: isCur ? 'rpt.s.cur.noTable' : 'rpt.s.alt.noTable', params: { prov }, verdict: 'na', ...(t0 ? { tail: t0 } : {}) }
    }
    const src = { label: s.system, url: s.url, fetched: s.fetched }
    const have = s.parts.filter((p) => p.matched).length
    // 分制名印进句子时去掉自报通道那截(整串「OINP EOI points (Ontario Workforce Priority stream)」一行放不下)
    const base = { prov, system: systemShort(s.system), total: s.total, have, all: s.parts.length }
    const gridStream = gridStreamOf(s.system)
    const all = recentDrawsOf(facts, prov)
    const tail = tailOf(prov, gridStream)

    if (isCur) return { key: 'rpt.s.cur', params: base, verdict: 'na', source: src, ...(tail ? { tail } : {}) }
    if (s.passMark != null) {
      // 差多少分:下界与门槛的距离是**差距的上界**(补齐未答项只会更小)——句子必须带这层意思,
      // 不能写成「你还差 38 分」那种确定语气。
      return s.total >= s.passMark
        ? { key: 'rpt.s.alt.pass', params: { ...base, mark: s.passMark }, verdict: 'pass', source: src, ...(tail ? { tail } : {}) }
        : { key: 'rpt.s.alt.mark', params: { ...base, mark: s.passMark, gap: s.passMark - s.total, rest: s.parts.length - have }, verdict: 'na', source: src, ...(tail ? { tail } : {}) }
    }
    return { key: all.length ? 'rpt.s.alt.noDraw' : 'rpt.s.alt.plain', params: base, verdict: 'na', source: src, ...(tail ? { tail } : {}) }
  }

  // 备选省:该职业在当地有在招或在公开清单上的省(排除现选省、QC、排除清单省);
  // 有官方分值表的排前面(这一节的用处就是对分数),其次具名命中、在招量
  const hasTable = (p: string) => factors.some((f) => f.province === p)
  const cands = Array.from(new Set([
    ...facts.byProv.map((r) => r.province),
    ...dims.pnpOccupations.filter((r) => r.noc === facts.noc && r.type !== 'ineligible').map((r) => r.province),
  ]))
    .filter((p) => p && p !== cur && p !== 'QC')
    .filter((p) => !dims.pnpOccupations.some((r) => r.province === p && r.noc === facts.noc && r.type === 'ineligible'))
    .map((p) => ({ prov: p, ...(facts.byProv.find((r) => r.province === p) ?? { open: 0, named: 0 }) }))
    .sort((a, b) => Number(hasTable(b.prov)) - Number(hasTable(a.prov)) || b.named - a.named || b.open - a.open)
    .slice(0, SWITCH_CAP)

  const out: ReportLine[] = [lineFor(cur, true), ...cands.map((c) => lineFor(c.prov, false))]

  // 可操作的两条(锁区的价值就在这里,不然解锁完还是一堆「至少 N 分」):
  // ① 先补哪一项最值钱 —— 未答的因素里官方分值最高的那个,按**现选省**的官方表说
  //    (每个省的最值钱项不同,整节只说一次就得挑一个省,现选省是他最可能动手的地方);
  // ② 拿到该省 offer 官方给几分 —— 只有官方表里真有 offer 这一项的省才出(SK 有,BC/ON 没有,不编)。
  const curScore = scoreOf(cur)
  const worst = curScore?.parts.filter((x) => !x.matched && x.max > 0).sort((a, b) => b.max - a.max)[0]
  if (worst) {
    out.push({
      key: 'rpt.s.next', params: { prov: cur, factor: worst.factor, factorKey: `ps.f.${worst.factor}`, pts: worst.max },
      verdict: 'na', url: '/pathways',
    })
  }
  for (const c of cands) {
    const s2 = scoreOf(c.prov)
    const offer = factors.find((f) => f.province === c.prov && f.factor === 'offer' && f.kind === 'row' && (f.points ?? 0) > 0)
    if (s2 && offer && (s2.parts.find((x) => x.factor === 'offer')?.pts ?? 0) === 0) {
      out.push({ key: 'rpt.s.offer', params: { prov: c.prov, pts: offer.points as number }, verdict: 'na', source: { label: s2.system, url: s2.url, fetched: s2.fetched } })
    }
  }
  return out
}

export function buildPrReport(profile: MatchProfile, extra: ReportExtra, dims: MatchDims, facts: ReportFacts): Report {
  const conclusions: ReportLine[] = []
  const gaps: ReportLine[] = []
  const nextSteps: ReportLine[] = []
  const alternatives: ReportLine[] = []
  const noc = facts.noc
  const provFacts = (p: string): OccProvFacts => facts.byProv.find((r) => r.province === p) ?? { province: p, open: 0, named: 0 }

  // 没填职业 → 几乎全部结论悬空:单缺口报告(无解不给空页,缺口本身就是结论)
  if (!noc) {
    // 不给 /account 深链:匿名用户点过去是登录墙(死路);选职业入口由页面的职业 chip 承担
    gaps.push({ key: 'rpt.g.noNoc', params: {}, verdict: 'na' })
    return { goal: 'pr', noc: '', title: '', conclusions, requirements: [], employers: [], switches: [], gaps, nextSteps, alternatives, confidence: 'low', asOf: facts.fetched ?? '' }
  }

  // 目标省;没选就按「命中具名清单岗多 → 在招多」取前 3(报告要有落点,不铺十省)
  const targets = profile.targetProvinces.length
    ? profile.targetProvinces
    : [...facts.byProv].sort((a, b) => b.named - a.named || b.open - a.open).slice(0, 3).map((r) => r.province)

  // ── 逐省:清单命中(四态)→ 抽选参考 → 估分对照 ──────────────────────────
  for (const prov of targets) {
    const f = provFacts(prov)
    const cov = provListCoverage(prov, dims)
    const rows = dims.pnpOccupations.filter((r) => r.province === prov && r.noc === noc)
    const named = rows.find((r) => r.type !== 'ineligible')
    const excluded = rows.find((r) => r.type === 'ineligible')

    if (cov === 'qc') {
      conclusions.push({ key: 'rpt.c.qc', params: { prov }, verdict: 'na', source: QC_SRC })
      continue
    }
    if (named) {
      // 清单收的是**职业**不是岗位:该职业在清单上,该省这个职业的在招岗自然全都算 ——
      // 所以「在招 12 岗,其中 12 个是清单岗」是句废话(2026-08-01 Frank 点名「就一个职位,怎么叫全部」)。
      // 只有 named < open(如 ON 的 GTA 限制岗、AIP 与 PNP 分路)才值得说 N/M。
      conclusions.push({
        key: f.named < f.open ? 'rpt.c.listedHitPart' : 'rpt.c.listedHit',
        params: { prov, noc, label: named.label, open: f.open, named: f.named },
        verdict: 'pass', source: { label: named.label, url: named.url, fetched: named.fetched },
      })
      if (f.open > 0) nextSteps.push({ key: 'rpt.n.jobs', params: { prov, n: f.open }, url: `/?prov=${prov}&q=${noc}` })
    } else if (excluded) {
      conclusions.push({
        key: 'rpt.c.excluded', params: { prov, noc, label: excluded.label },
        verdict: 'fail', source: { label: excluded.label, url: excluded.url, fetched: excluded.fetched },
      })
    } else if (cov === 'listed') {
      // 清单式省查过确实不在 —— 可以下「不在清单」结论;开在招数给落差感(430 岗与你无关的诚实版)
      conclusions.push({ key: 'rpt.c.listedMiss', params: { prov, noc, open: f.open }, verdict: 'fail' })
    } else if (cov === 'exclusion') {
      // 排除式/不公布清单(ON):0 具名是制度性的,不得说「不在清单」;按 TEER 粗筛口径陈述
      const pass = facts.teer != null && facts.teer <= 3
      conclusions.push({ key: pass ? 'rpt.c.screenPass' : 'rpt.c.screenTeer', params: { prov, open: f.open, teer: facts.teer ?? '' }, verdict: pass ? 'warn' : 'fail' })
      if (pass && f.open > 0) nextSteps.push({ key: 'rpt.n.jobs', params: { prov, n: f.open }, url: `/?prov=${prov}&q=${noc}` })
    } else {
      // uncovered:本站没该省清单数据,只能说没收录,不冒充「查过没有」
      conclusions.push({ key: 'rpt.c.uncovered', params: { prov }, verdict: 'na' })
    }
    if (f.open === 0) gaps.push({ key: 'rpt.g.zeroJobs', params: { prov }, verdict: 'warn' })

    // 抽选参考:近 N 次该省有分数的轮次。通道对不上不给差分 —— 单一通道才敢差分,否则只摆区间
    const recent = facts.draws
      .filter((d) => d.province === prov && d.score != null)
      .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
      .slice(0, RECENT_DRAWS)
    if (recent.length) {
      const scores = recent.map((d) => d.score as number)
      const lo = Math.min(...scores)
      const hi = Math.max(...scores)
      const est = facts.scores?.[prov]
      if (est) {
        const streams = new Set(recent.map((d) => d.stream))
        if (streams.size === 1) {
          const last = recent[0]
          const diff = est.total - (last.score as number)
          conclusions.push({
            key: diff >= 0 ? 'rpt.c.scoreAbove' : 'rpt.c.scoreBelow',
            params: { prov, total: est.total, cutoff: last.score as number, stream: last.stream, date: last.drawDate.slice(0, 10), [diff >= 0 ? 'diff' : 'gap']: Math.abs(diff) },
            verdict: diff >= 0 ? 'pass' : 'warn',
            source: { label: est.system, url: est.url, fetched: est.fetched },
          })
        } else {
          conclusions.push({
            key: 'rpt.c.scoreBand', params: { prov, total: est.total, lo, hi, n: recent.length },
            verdict: 'warn', source: { label: est.system, url: est.url, fetched: est.fetched },
          })
        }
      } else {
        conclusions.push({ key: 'rpt.c.drawBand', params: { prov, lo, hi, n: recent.length }, verdict: 'na' })
        if (facts.scoreProvinces?.includes(prov)) {
          gaps.push({ key: 'rpt.g.answerScore', params: { prov }, verdict: 'na', url: '/pathways' })
          nextSteps.push({ key: 'rpt.n.score', params: { prov }, url: '/pathways' })
        }
      }
      // 句式⑤:签证窗口 × 抽选节奏 —— 近 N 次平均间隔,能赶上约几轮(样本小就说小:params 带 n)
      if (profile.pgwpMonthsLeft != null && recent.length >= 2) {
        const first = Date.parse(recent[0].drawDate)
        const last = Date.parse(recent[recent.length - 1].drawDate)
        const gapDays = Math.round((first - last) / 86_400_000 / (recent.length - 1))
        if (gapDays > 0) {
          const rounds = Math.floor((profile.pgwpMonthsLeft * 30.4) / gapDays)
          conclusions.push({ key: 'rpt.c.window', params: { months: profile.pgwpMonthsLeft, days: gapDays, rounds, n: recent.length }, verdict: 'warn' })
        }
      }
    } else if (facts.scoreProvinces && !facts.scoreProvinces.includes(prov) && cov !== 'uncovered') {
      // 该省不公布算分/无逐次线数据 → 明说只给规则对照(L2-01 ②缺口:confidence 低,不硬编分差)
      gaps.push({ key: 'rpt.g.noScoreTable', params: { prov }, verdict: 'na' })
    }
  }

  // ── 门槛对照(规则引擎):逐目标省一节。QC 不参与(走自己的甄选体系,不是 PNP)──────
  const requirements: ReportLine[] = []
  for (const prov of targets) {
    if (provListCoverage(prov, dims) === 'qc') continue
    requirements.push(...requirementLines(prov, facts, profile, extra))
  }

  // ── 换省对照(L2-08):现选省 vs 备选省,按官方分值表自算下界分 ────────────────
  const switches = switchLines(facts, dims, profile, extra.canadianExpMonths, targets)

  // ── 联邦 EE 类别(独立信号,不混省提名)───────────────────────────────────
  const eeRows = dims.eeCategories.filter((r) => r.noc === noc && r.drawCrs != null)
  const ee = eeRows.sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))[0]
  if (ee) {
    const src = { label: ee.label, url: ee.url, fetched: ee.fetched }
    if (profile.crs == null) {
      conclusions.push({ key: 'rpt.c.ee', params: { cat: ee.label, draw: ee.drawCrs as number, date: (ee.drawDate || '').slice(0, 10) }, verdict: 'warn', source: src })
      gaps.push({ key: 'rpt.g.noCrs', params: { cat: ee.label }, verdict: 'na', url: CRS_TOOL.url })
      nextSteps.push({ key: 'rpt.n.crs', params: {}, url: CRS_TOOL.url })
    } else {
      const diff = profile.crs - (ee.drawCrs as number)
      conclusions.push({
        key: diff >= 0 ? 'rpt.c.eeAbove' : 'rpt.c.eeBelow',
        params: { cat: ee.label, crs: profile.crs, draw: ee.drawCrs as number, date: (ee.drawDate || '').slice(0, 10), [diff >= 0 ? 'diff' : 'gap']: Math.abs(diff) },
        verdict: diff >= 0 ? 'pass' : 'warn', source: src,
      })
    }
  } else {
    conclusions.push({ key: 'rpt.c.eeNone', params: { noc }, verdict: 'na' })
  }

  // ── 句式①:注册类职业的认证卡点(他只说了职业,认证是替他想到的)─────────────
  if (REGULATED_NURSE.has(noc)) {
    conclusions.push({ key: 'rpt.c.regulated', params: { noc }, verdict: 'warn', source: NNAS_SRC })
    nextSteps.unshift({ key: 'rpt.n.cert', params: {}, url: NNAS_SRC.url })   // 认证最耗时 → 排下一步①
  }

  // ── 加拿大经验(卡② Q3):只对照公开门槛,不判资格 ────────────────────────
  if (extra.canadianExpMonths != null) {
    if (extra.canadianExpMonths >= 12) {
      conclusions.push({ key: 'rpt.c.expOk', params: { months: extra.canadianExpMonths }, verdict: 'pass', source: CEC_SRC })
    } else {
      gaps.push({ key: 'rpt.g.expShort', params: { months: extra.canadianExpMonths, need: 12 }, verdict: 'warn', source: CEC_SRC })
    }
  }

  // ── 备选省(④ 预判下一问):非目标省里具名清单命中的,按具名岗数取前 2 ─────────
  if (profile.targetProvinces.length) {
    const cands = facts.byProv
      .filter((r) => !profile.targetProvinces.includes(r.province) && r.province !== 'QC')
      .filter((r) => dims.pnpOccupations.some((d) => d.province === r.province && d.noc === noc && d.type !== 'ineligible'))
      .sort((a, b) => b.named - a.named || b.open - a.open)
      .slice(0, ALT_CAP)
    for (const c of cands) {
      const row = dims.pnpOccupations.find((d) => d.province === c.province && d.noc === noc && d.type !== 'ineligible')!
      alternatives.push({
        key: 'rpt.a.prov', params: { prov: c.province, open: c.open, named: c.named, label: row.label },
        verdict: 'pass', source: { label: row.label, url: row.url, fetched: row.fetched },
      })
    }
  }

  nextSteps.push({ key: 'rpt.n.pathways', params: {}, url: '/pathways' })

  // ── confidence:基本 4 题答满 → mid;再有 CRS 或省估分(探索层)→ high;缺基本题 → low ──
  const basicsAnswered = [profile.currentStatus != null, profile.clb != null, extra.canadianExpMonths != null, profile.targetProvinces.length > 0]
    .filter(Boolean).length
  const hasDeep = profile.crs != null || Object.keys(facts.scores ?? {}).length > 0
  const confidence: Report['confidence'] = basicsAnswered < 4 ? 'low' : hasDeep ? 'high' : 'mid'
  if (basicsAnswered < 4) gaps.push({ key: 'rpt.g.basics', params: { n: 4 - basicsAnswered }, verdict: 'na' })

  return { goal: 'pr', noc, title: facts.title, conclusions, requirements, employers: [], switches, gaps, nextSteps, alternatives, confidence, asOf: facts.fetched ?? '' }
}

// ── 卡③「选省份」:十省对照,专属题只有一道(手上有没有 offer)──────────────────
// 免费=库里查得到的(哪个省把你这行放进公开清单、当地在招多少、抽选线区间);
// 锁区=拿你的答案排出来的完整顺序与每省差距。QC 走自己体系不参与排序(不是 PNP)。
export type ProvExtra = { hasJobOffer: boolean | null; canadianExpMonths?: number | null }
export function buildProvReport(profile: MatchProfile, extra: ProvExtra, dims: MatchDims, facts: ReportFacts): Report {
  const conclusions: ReportLine[] = []
  const gaps: ReportLine[] = []
  const nextSteps: ReportLine[] = []
  const alternatives: ReportLine[] = []
  const noc = facts.noc
  if (!noc) {
    gaps.push({ key: 'rpt.g.noNoc', params: {}, verdict: 'na' })
    return { goal: 'prov', noc: '', title: '', conclusions, requirements: [], employers: [], switches: [], gaps, nextSteps, alternatives, confidence: 'low', asOf: facts.fetched ?? '' }
  }

  // 候选=有在招数据的省 ∪ 公开清单里收了这个职业的省(某省 0 在招但清单收了它,仍然是个真选项)
  const provs = new Set<string>([
    ...facts.byProv.map((r) => r.province),
    ...dims.pnpOccupations.filter((r) => r.noc === noc && r.type !== 'ineligible').map((r) => r.province),
  ])
  type Cand = { prov: string; open: number; named: number; cov: string; label: string; url: string; fetched: string; excluded: boolean }
  const cands: Cand[] = []
  let uncovered = 0
  for (const prov of provs) {
    const cov = provListCoverage(prov, dims)
    if (cov === 'qc') { gaps.push({ key: 'rpt.c.qc', params: { prov }, verdict: 'na', source: QC_SRC }); continue }
    if (cov === 'uncovered') { uncovered += 1; continue }
    const f = facts.byProv.find((r) => r.province === prov) ?? { province: prov, open: 0, named: 0 }
    const row = dims.pnpOccupations.find((r) => r.province === prov && r.noc === noc && r.type !== 'ineligible')
    // 排除清单上的省不是「备选」——它是明确走不了的,归缺口(复用 rpt.c.excluded,带官方出处)
    const ex = dims.pnpOccupations.find((r) => r.province === prov && r.noc === noc && r.type === 'ineligible')
    if (ex && !row) {
      gaps.push({
        key: 'rpt.c.excluded', params: { prov, noc, label: ex.label }, verdict: 'fail',
        source: { label: ex.label, url: ex.url, fetched: ex.fetched },
      })
      continue
    }
    cands.push({ prov, open: f.open, named: f.named, cov, label: row?.label ?? '', url: row?.url ?? '', fetched: row?.fetched ?? '', excluded: false })
  }
  // 排序:进了公开清单的优先(那是官方具名认可),其次看当地在招量;排除清单上的沉底
  const rank = cands.sort((a, b) =>
    Number(Boolean(b.label)) - Number(Boolean(a.label)) || b.named - a.named || b.open - a.open)

  for (const [i, c] of rank.slice(0, 2).entries()) {
    if (c.label) {
      conclusions.push({
        key: i === 0 ? 'rpt.p.best' : 'rpt.p.second',
        params: { prov: c.prov, open: c.open, named: c.named, label: c.label },
        verdict: 'pass', source: { label: c.label, url: c.url, fetched: c.fetched },
      })
    } else {
      // 不公布清单的省(ON):0 具名是制度性的,只能按 TEER 粗筛口径陈述,不得说「不在清单」
      conclusions.push({ key: 'rpt.p.screen', params: { prov: c.prov, open: c.open, teer: facts.teer ?? '' }, verdict: 'warn' })
    }
  }
  if (rank[0]?.open) nextSteps.push({ key: 'rpt.n.jobs', params: { prov: rank[0].prov, n: rank[0].open }, url: `/?prov=${rank[0].prov}&q=${noc}` })

  // 锁区:完整顺序与每省差距(要拿他的答案才排得出来)
  if (rank.length > 2) {
    conclusions.push({ key: 'rpt.p.rank', params: { n: rank.length }, verdict: 'na' })
    for (const c of rank.slice(2, 2 + ALT_CAP)) {
      alternatives.push({
        key: 'rpt.a.prov', params: { prov: c.prov, open: c.open, named: c.named, label: c.label },
        verdict: c.label ? 'pass' : 'na', ...(c.url ? { source: { label: c.label, url: c.url, fetched: c.fetched } } : {}),
      })
    }
  }

  // 唯一的专属题:雇主担保类通道按定义要先有 offer —— 没有就是真缺口,有就把对照通道排成下一步
  if (extra.hasJobOffer === true) nextSteps.unshift({ key: 'rpt.n.employer', params: { prov: rank[0]?.prov ?? '' }, url: '/pathways' })
  else if (extra.hasJobOffer === false) gaps.push({ key: 'rpt.g.noOffer', params: {}, verdict: 'warn' })

  if (uncovered > 0) gaps.push({ key: 'rpt.g.uncoveredN', params: { n: uncovered }, verdict: 'na' })
  nextSteps.push({ key: 'rpt.n.pathways', params: {}, url: '/pathways' })

  // 换省对照(L2-08):这张卡的现选省=用户选的目标省,没选就用排序第一的省
  const switches = switchLines(facts, dims, profile, extra.canadianExpMonths ?? null,
    profile.targetProvinces.length ? profile.targetProvinces : rank.slice(0, 1).map((c) => c.prov))

  return {
    goal: 'prov', noc, title: facts.title, conclusions, requirements: [], employers: [], switches, gaps, nextSteps, alternatives,
    confidence: !rank.length ? 'low' : extra.hasJobOffer != null ? 'high' : 'mid', asOf: facts.fetched ?? '',
  }
}

// ── 卡①「找工作」:同一 Report 契约,零新题(职业/处境/目标省已在共用底座里)────────
// 免费=库里查得到的(在招量、具名命中、帖面薪资 vs ESDC 中位);
// 锁区=拿他的答案算出来的(有担保记录的雇主是哪几家、按他在意的维度排好的岗位短名单)。
export function buildJobReport(profile: MatchProfile, dims: MatchDims, facts: ReportFacts, occ: OccStats, extra: ReportExtra = { canadianExpMonths: null }): Report {
  const conclusions: ReportLine[] = []
  const gaps: ReportLine[] = []
  const nextSteps: ReportLine[] = []
  const noc = facts.noc
  if (!noc) {
    gaps.push({ key: 'rpt.g.noNoc', params: {}, verdict: 'na' })
    return { goal: 'job', noc: '', title: '', conclusions, requirements: [], employers: [], switches: [], gaps, nextSteps, alternatives: [], confidence: 'low', asOf: facts.fetched ?? '' }
  }

  // 目标省;没选就按在招量取前 2(找工作看的是岗多不多,与拿 PR 按具名排序不同)
  const targets = profile.targetProvinces.length
    ? profile.targetProvinces
    : [...facts.byProv].sort((a, b) => b.open - a.open).slice(0, 2).map((r) => r.province)

  for (const prov of targets) {
    const f = facts.byProv.find((r) => r.province === prov) ?? { province: prov, open: 0, named: 0 }
    if (f.open === 0) { gaps.push({ key: 'rpt.g.zeroJobs', params: { prov }, verdict: 'warn' }); continue }
    const named = dims.pnpOccupations.find((r) => r.province === prov && r.noc === noc && r.type !== 'ineligible')
    conclusions.push({
      // 同上:全命中不说「其中 N 个」,主语是这个职业在不在该省清单上
      key: f.named === 0 ? 'rpt.j.open' : f.named < f.open ? 'rpt.j.openNamed' : 'rpt.j.openAll',
      params: { prov, open: f.open, named: f.named },
      verdict: 'pass',
      ...(named ? { source: { label: named.label, url: named.url, fetched: named.fetched } } : {}),
    })
    nextSteps.push({ key: 'rpt.n.jobs', params: { prov, n: f.open }, url: `/?prov=${prov}&q=${noc}` })
  }

  // 薪资对照:帖面中位 vs ESDC 官方中位(两个口径都摆出来,不合成一个「值不值」的分)
  const s = occ.self
  if (s?.medianPosted != null && s.medianWage != null && s.medianWage > 0) {
    const pct = Math.round(((s.medianPosted - s.medianWage) / s.medianWage) * 100)
    conclusions.push({
      key: Math.abs(pct) < 5 ? 'rpt.j.wageSame' : pct > 0 ? 'rpt.j.wageAbove' : 'rpt.j.wageBelow',
      params: { posted: k(s.medianPosted), esdc: k(s.medianWage), pct: Math.abs(pct) },
      verdict: pct >= 0 ? 'pass' : 'warn',
    })
  } else if (s?.medianWage != null) {
    conclusions.push({ key: 'rpt.j.wageEsdc', params: { esdc: k(s.medianWage) }, verdict: 'na' })
  }

  // 担保雇主:只说有几家(名单进锁区 —— 这是拿答案筛出来的,不是库里随便查得到的)
  if (occ.sponsors > 0) conclusions.push({ key: 'rpt.j.sponsors', params: { n: occ.sponsors }, verdict: 'pass' })

  // 相关职业(Frank 2026-07-31「干 IT 可能同时适合大数据/AI/全栈/cloud」):同小类/中类的邻居也在招,
  // 免费给 —— 这是库里查得到的事实,而且一个人本来就不该被自己填的那一个 NOC 框死。
  // 每条挂各自的报告深链:换个职业看结论,不用重新答题。
  for (const p of occ.peers.filter((x) => x.open > 0).slice(0, 2)) {
    conclusions.push({
      key: 'rpt.j.related',
      params: { occ: p.titleEn || p.noc, occZh: p.titleZh || p.titleEn || p.noc, occKo: p.titleKo || p.titleEn || p.noc, noc: p.noc, open: p.open },
      verdict: 'na', url: `/plan/job?noc=${p.noc}&view=report`,
    })
  }

  // 雇主线索 + 雇主侧门槛(L2-06 后续①):岗位地址已洗到市/区 → **GTA 内外这一档本站判得了**,
  // 每家挂上该区域的官方阈值;认不出地名(或该省没收录雇主门槛)就只给名单,不编档位。
  const reqs = facts.requirements ?? []
  const employers: ReportEmployer[] = (occ.sponsorList ?? []).map((e) => {
    const area = areaOfPlace(e.province, e.city)
    const bar = area ? employerBar(reqs, e.province, area) : { revenue: null, staff: null }
    return { ...e, area, empRevenue: bar.revenue, empStaff: bar.staff }
  })

  nextSteps.push({ key: 'rpt.n.pathways', params: {}, url: '/pathways' })
  const switches = switchLines(facts, dims, profile, extra.canadianExpMonths, targets)
  const answered = [profile.currentStatus != null, profile.targetProvinces.length > 0].filter(Boolean).length
  if (answered < 2) gaps.push({ key: 'rpt.g.basics', params: { n: 2 - answered }, verdict: 'na' })

  return {
    goal: 'job', noc, title: facts.title, conclusions, requirements: [], employers, switches, gaps, nextSteps, alternatives: [],
    confidence: answered < 2 ? 'low' : occ.self ? 'high' : 'mid', asOf: facts.fetched ?? '',
  }
}

// ── 卡⑥「职业规划」:同大类相邻职业对照,零新题 ────────────────────────────
// 数据缺口照实说:职业转换路径(A→B 到底能不能转)本站没有数据 —— 只摆对照,不判「你能转」。
export function buildCareerReport(profile: MatchProfile, facts: ReportFacts, occ: OccStats): Report {
  const conclusions: ReportLine[] = []
  const gaps: ReportLine[] = []
  const nextSteps: ReportLine[] = []
  const alternatives: ReportLine[] = []
  const noc = facts.noc
  if (!noc) {
    gaps.push({ key: 'rpt.g.noNoc', params: {}, verdict: 'na' })
    return { goal: 'career', noc: '', title: '', conclusions, requirements: [], employers: [], switches: [], gaps, nextSteps, alternatives, confidence: 'low', asOf: facts.fetched ?? '' }
  }

  const s = occ.self
  if (s) {
    conclusions.push({
      key: s.medianWage != null ? 'rpt.k.selfWage' : 'rpt.k.self',
      params: { open: s.open, teer: s.teer ?? '', esdc: s.medianWage != null ? k(s.medianWage) : '' }, verdict: 'na',
    })
  }

  // 相邻职业(= NOC 官方 minor group 的同门,见 reportFacts;不用本站中文分类,那套有杂物桶):
  // 比现职中位薪资高的排前面(跃迁是这张卡的用处);每条都带在招量,不给「钱多但没岗」的空头
  const mine = s?.medianWage ?? null
  const peers = occ.peers
    .filter((p) => p.open > 0)
    .sort((a, b) => (b.medianWage ?? 0) - (a.medianWage ?? 0))
  // 免费:相邻职业本身(名字、在招、官方中位)—— 这些 /stats 与 /occupations 也查得到,锁了只是挡路。
  for (const p of peers.slice(0, 2)) {
    conclusions.push({
      // 人话名优先(中/韩界面用译名,英文界面用 NOC 官方名);译名缺失退英文,不留空
      key: 'rpt.k.peer', params: { occ: p.titleEn || p.noc, occZh: p.titleZh || p.titleEn || p.noc, occKo: p.titleKo || p.titleEn || p.noc, noc: p.noc, open: p.open, esdc: p.medianWage != null ? k(p.medianWage) : '' },
      verdict: 'pass', url: `/?q=${p.noc}`,
    })
  }
  // 锁区:跃迁幅度与先后 —— 这条要拿他自己的职业做基准才算得出来
  const top = peers.find((p) => p.medianWage != null && mine != null && p.medianWage > mine)
  if (top && mine) {
    conclusions.push({
      key: 'rpt.k.peerGap',
      params: { occ: top.titleEn || top.noc, occZh: top.titleZh || top.titleEn || top.noc, occKo: top.titleKo || top.titleEn || top.noc, pct: Math.round((((top.medianWage as number) - mine) / mine) * 100) },
      verdict: 'pass',
    })
  }
  for (const p of peers.slice(2, 5)) {
    alternatives.push({ key: 'rpt.k.alt', params: { occ: p.titleEn || p.noc, occZh: p.titleZh || p.titleEn || p.noc, occKo: p.titleKo || p.titleEn || p.noc, noc: p.noc, open: p.open, esdc: p.medianWage != null ? k(p.medianWage) : '' }, verdict: 'pass', url: `/?q=${p.noc}` })
  }
  if (!peers.length) gaps.push({ key: 'rpt.k.none', params: {}, verdict: 'na' })
  // 「能不能转」需要技能/学历映射,本站没有 —— 明说,不拿模型编
  gaps.push({ key: 'rpt.k.noPath', params: {}, verdict: 'na' })

  nextSteps.push({ key: 'rpt.n.stats', params: {}, url: '/stats' })
  nextSteps.push({ key: 'rpt.n.pathways', params: {}, url: '/pathways' })

  return {
    goal: 'career', noc, title: facts.title, conclusions, requirements: [], employers: [], switches: [], gaps, nextSteps, alternatives,
    confidence: !s ? 'low' : peers.length ? 'high' : 'mid', asOf: facts.fetched ?? '',
  }
}

// ── 付费闸(L2-03 v2c):服务端裁剪,免费响应里根本没有锁区正文 ──────────────
// 与 PRO_COLUMNS「SELECT 源头裁掉」同哲学:锁 = 后端不下发,不是前端打码;devtools 也翻不出来。
// 免费层留什么由「事实免费、结论收费」定:三卡判定词/卡点短句/前 2 条结论/缺口/下一步全免费
// (aha 必须在掏钱之前),分差、时间窗、备选完整对照进锁区。锁行只列引擎真能算的类别 —— 不卖不存在的东西。
export type ReportLane = {
  kind: 'prov' | 'ee' | 'alts'
  verdict: MatchVerdict
  key: string                                   // rpt.lane.*(判定词=事实;章文案取 key + '.b')
  params: Record<string, string | number>
}
export type GatedReport = Report & { lanes: ReportLane[]; hint?: ReportLine; locked: string[]; pro: boolean }

const FREE_CONCLUSIONS = 2      // 引擎顺序天然=清单命中 + 抽选区间,正是 v2c 免费两条
const LANE_PROV: Record<string, string> = {
  'rpt.c.listedHit': 'rpt.lane.prov.hit', 'rpt.c.listedHitPart': 'rpt.lane.prov.hit', 'rpt.c.listedMiss': 'rpt.lane.prov.miss',
  'rpt.c.excluded': 'rpt.lane.prov.excluded', 'rpt.c.screenPass': 'rpt.lane.prov.screen',
  'rpt.c.screenTeer': 'rpt.lane.prov.screenNo', 'rpt.c.uncovered': 'rpt.lane.prov.uncovered',
  'rpt.c.qc': 'rpt.lane.prov.qc',
}
const LANE_EE: Record<string, string> = {
  'rpt.c.eeAbove': 'rpt.lane.ee.above', 'rpt.c.eeBelow': 'rpt.lane.ee.below',
  'rpt.c.ee': 'rpt.lane.ee.noCrs', 'rpt.c.eeNone': 'rpt.lane.ee.none',
}
// 被裁结论 → 锁区类别。EE 只锁「有 CRS 才算得出的分差」;没填 CRS 时 EE 卡已说「差 CRS」,
// 该卖的是答题(hook)不是锁区。
const LOCK_CAT: Record<string, string> = {
  'rpt.c.scoreAbove': 'score', 'rpt.c.scoreBelow': 'score', 'rpt.c.scoreBand': 'score',
  'rpt.c.window': 'window', 'rpt.c.eeAbove': 'ee', 'rpt.c.eeBelow': 'ee',
  // 卡⑥跃迁排序要用他的职业做基准才算得出来 → 锁区(自由查得到的在招量与中位薪资照旧免费)。
  // **「有 N 家雇主发过清单岗」这句留在免费层**(2026-08-01 做雇主线索时改):
  // 它是这张卡最像 aha 的一句,把它也锁掉等于免费层什么都没有;锁的是**名单本体**(employers),
  // 那才是「花钱买省下来的时间」。锁行由 employers 非空触发,见下面 cats2.add('sponsors')。
  'rpt.k.peerGap': 'move', 'rpt.p.rank': 'rank',
}
const LOCK_ORDER = ['req', 'score', 'window', 'alts', 'ee', 'sponsors', 'move', 'rank', 'more']   // 锁行固定序(有序去重)
// 门槛对照的免费/付费界线(设计 §6):免费=门槛是多少 + 达标/不达标的判定(官方事实,库里查得到);
// 付费=**差多少**、按什么顺序补。所以免费层把带差值的那条换成不带差值的同义句,`short` 根本不下发。
const REQ_FREE: Record<string, string> = {
  'rpt.r.lang.fail': 'rpt.r.lang.failFree',
  'rpt.r.income.fail': 'rpt.r.income.failFree',
}
const HINT: Record<string, string> = { 'rpt.c.regulated': 'rpt.hint.cert', 'rpt.g.expShort': 'rpt.hint.exp' }
export function gateReport(report: Report, pro: boolean): GatedReport {
  const provLine = report.conclusions.find((c) => LANE_PROV[c.key])
  const eeLine = report.conclusions.find((c) => LANE_EE[c.key])
  const hintLine = [...report.conclusions, ...report.gaps].find((l) => HINT[l.key])
  const hint: ReportLine | undefined = hintLine
    ? { key: HINT[hintLine.key], params: hintLine.params, verdict: hintLine.verdict, source: hintLine.source }
    : undefined

  // 三卡是省提名/EE/备选省三个维度 —— 只有拿 PR 这张卡有这三条轴,别张卡硬套会出「备选省」这种驴唇不对马嘴的章
  const lanes: ReportLane[] = []
  if (report.goal === 'pr') {
    if (provLine) lanes.push({ kind: 'prov', verdict: provLine.verdict ?? 'na', key: LANE_PROV[provLine.key], params: { prov: provLine.params.prov ?? '' } })
    if (eeLine) lanes.push({ kind: 'ee', verdict: eeLine.verdict ?? 'na', key: LANE_EE[eeLine.key], params: {} })
    if (report.alternatives.length) {
      lanes.push({ kind: 'alts', verdict: 'pass', key: 'rpt.lane.alts', params: { prov: report.alternatives[0].params.prov ?? '', n: report.alternatives.length } })
    }
  }

  if (pro) return { ...report, lanes, hint, locked: [], pro: true }

  // 雇主线索:名单整段不下发(免费层留「有 N 家」那句结论 + 锁行标题,devtools 也翻不出名字)
  const employers: ReportEmployer[] = []

  // 门槛对照:免费层保留全部行(门槛是官方事实,锁了就是挡路),只把「差多少」那半句摘掉
  const reqLocked = report.requirements.some((l) => REQ_FREE[l.key])
  const requirements = report.requirements.map((l) => {
    if (!REQ_FREE[l.key]) return l
    const { short, ...rest } = l.params            // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...l, key: REQ_FREE[l.key], params: rest }
  })

  // 换省对照:**免费层整节不下发**(Frank 2026-08-01 看实拍拍板:
  // 「你这说完不是等于没说么」——把分数锁掉之后,免费层剩下的只有「该省有没有分值表」,
  // 那是废话不是 aha)。这一节的存在理由就是分数,分数收费 → 整节进锁区,
  // 免费层只留锁行那一句问句当钩子(问题本身就是广告)。
  const scoreLocked = report.switches.length > 0
  const switches: ReportLine[] = []

  // 卡①/⑥ 走口径闸(库里查得到的免费,拿你的答案算出来的付费):在招量与薪资对照本来就查得到,
  // 按「前 2 条」硬切会把免费的事实也锁掉 —— 那是收不到钱只挡路。锁的是真要答案才筛得出来的那几条。
  if (report.goal !== 'pr') {
    const free = report.conclusions.filter((c) => !LOCK_CAT[c.key])
    const cats2 = new Set(report.conclusions.filter((c) => LOCK_CAT[c.key]).map((c) => LOCK_CAT[c.key]))
    if (report.alternatives.length) cats2.add(report.goal === 'prov' ? 'rank' : 'move')
    if (report.employers.length) cats2.add('sponsors')   // 名单有货才挂锁行(不卖不存在的东西)
    if (reqLocked) cats2.add('req')
    if (scoreLocked) cats2.add('score')
    return {
      ...report, conclusions: free, alternatives: [], requirements, employers, switches,
      lanes: [], hint, locked: LOCK_ORDER.filter((k) => cats2.has(k)), pro: false,
    }
  }

  const trimmed = report.conclusions.slice(FREE_CONCLUSIONS)
  const shownFree = new Set([provLine?.key, eeLine?.key, hintLine?.key])   // 已在三卡/卡点里露过的,不再计入「其余结论」
  const cats = new Set<string>()
  for (const c of trimmed) {
    if (LOCK_CAT[c.key]) cats.add(LOCK_CAT[c.key])
    else if (!shownFree.has(c.key)) cats.add('more')
  }
  // 2026-07-31 那条红线(「不能拿『该省有官方分值表』当锁区理由,facts.scores 永远为空」)
  // 在 2026-08-01 换省对照节(L2-08)落地后**有了真货**:报告自己按已答项算下界分,
  // 锁的是那个分与达标判定 —— 解锁后确实有东西。所以 score 由 scoreLocked 触发,不再由「有分值表」触发。
  if (report.alternatives.length) cats.add('alts')
  if (reqLocked) cats.add('req')
  if (scoreLocked) cats.add('score')

  return {
    ...report,
    conclusions: report.conclusions.slice(0, FREE_CONCLUSIONS),
    alternatives: [], requirements, employers, switches,
    lanes, hint, locked: LOCK_ORDER.filter((k) => cats.has(k)), pro: false,
  }
}

// ── 英文渲染(advisor grounding / 测试可读断言;与 UI 三语同源同数字,同 match.ts reasonEn 手法)──
const EN: Record<string, (p: Record<string, string | number>) => string> = {
  'rpt.c.listedHit': (p) => `NOC ${p.noc} is on ${p.prov}'s published list "${p.label}" — ${p.open} open postings there.`,
  'rpt.c.listedHitPart': (p) => `NOC ${p.noc} is on ${p.prov}'s published list "${p.label}"; ${p.named} of ${p.open} open postings there qualify for the named stream.`,
  'rpt.c.listedMiss': (p) => `Checked ${p.prov}'s published list: NOC ${p.noc} is not on it. ${p.open} open postings there cannot use a named stream.`,
  'rpt.c.excluded': (p) => `NOC ${p.noc} is on ${p.prov}'s exclusion list "${p.label}".`,
  'rpt.c.screenPass': (p) => `${p.prov} publishes no occupation list; TEER ${p.teer} passes its generic screen. ${p.open} open postings.`,
  'rpt.c.screenTeer': (p) => `${p.prov} publishes no occupation list and TEER ${p.teer} does not pass the generic skilled screen. ${p.open} open postings.`,
  'rpt.c.uncovered': (p) => `${p.prov}'s occupation list is not yet covered by this site — cannot verify a list hit either way.`,
  'rpt.c.qc': () => `Quebec runs its own selection system (not PNP); not assessed here.`,
  'rpt.c.scoreAbove': (p) => `Your estimated ${p.prov} score ${p.total} is ${p.diff} above the last "${p.stream}" cutoff ${p.cutoff} (${p.date}).`,
  'rpt.c.scoreBelow': (p) => `Your estimated ${p.prov} score ${p.total} is ${p.gap} below the last "${p.stream}" cutoff ${p.cutoff} (${p.date}).`,
  'rpt.c.scoreBand': (p) => `Your estimated ${p.prov} score is ${p.total}; the last ${p.n} draws cut off between ${p.lo} and ${p.hi} (varies by stream — no single gap can be stated).`,
  'rpt.c.drawBand': (p) => `${p.prov}'s last ${p.n} recorded draws cut off between ${p.lo} and ${p.hi} (varies by stream).`,
  'rpt.c.window': (p) => `Your permit has ~${p.months} months left; based on the last ${p.n} draws (avg ${p.days} days apart) that is roughly ${p.rounds} more rounds within your window.`,
  'rpt.c.ee': (p) => `This occupation is in the federal EE category "${p.cat}" (last draw CRS ${p.draw}, ${p.date}); you have not reported a CRS score.`,
  'rpt.c.eeAbove': (p) => `Your self-reported CRS ${p.crs} is ${p.diff} above the last "${p.cat}" draw cutoff ${p.draw} (${p.date}).`,
  'rpt.c.eeBelow': (p) => `Your self-reported CRS ${p.crs} is ${p.gap} below the last "${p.cat}" draw cutoff ${p.draw} (${p.date}).`,
  'rpt.c.eeNone': (p) => `NOC ${p.noc} is not on any federal EE category-based selection list.`,
  'rpt.c.regulated': (p) => `NOC ${p.noc} is a regulated nursing occupation — registration/credential assessment is required before practising.`,
  'rpt.c.expOk': (p) => `You report ${p.months} months of Canadian experience — at or above the 12-month experience-class threshold (see source).`,
  // 门槛对照(规则引擎):左=官方门槛、右=你的情况;unknown 一律照实说「判不了」而不是含糊带过
  'rpt.r.lang.pass': (p) => `${p.prov} requires CLB ${p.need} for TEER ${p.teer} jobs; you report CLB ${p.have} — meets it.`,
  'rpt.r.lang.fail': (p) => `${p.prov} requires CLB ${p.need} for TEER ${p.teer} jobs; you report CLB ${p.have} — ${p.short} band(s) short.`,
  'rpt.r.lang.failFree': (p) => `${p.prov} requires CLB ${p.need} for TEER ${p.teer} jobs; you report CLB ${p.have} — below it.`,
  'rpt.r.lang.unknown': (p) => `${p.prov} requires CLB ${p.need} for TEER ${p.teer} jobs; you have not reported a language band.`,
  'rpt.r.langNone': (p) => `${p.prov} does not require a language test at registration for TEER ${p.teer} (it may still be requested during assessment).`,
  'rpt.r.income.pass': (p) => `${p.prov} sets a minimum family income of $${p.need}; the official median wage for this occupation there is $${p.have} — above it.`,
  'rpt.r.income.fail': (p) => `${p.prov} sets a minimum family income of $${p.need}; the official median wage for this occupation there is $${p.have} — $${p.short} short even at the lowest bracket.`,
  'rpt.r.income.failFree': (p) => `${p.prov} sets a minimum family income of $${p.need}; the official median wage for this occupation there is $${p.have} — below it.`,
  'rpt.r.income.unknown': (p) => `${p.prov} sets a minimum family income of $${p.needLow}–$${p.need} depending on where you live and family size; the official median wage for this occupation there is $${p.have}.`,
  'rpt.r.exp.pass': (p) => `${p.prov}'s skilled worker stream requires ${p.need} months of skilled work experience; you report ${p.have} months in Canada — meets it.`,
  'rpt.r.exp.unknown': (p) => `${p.prov}'s skilled worker stream requires ${p.need} months of skilled work experience (in or outside Canada); only Canadian months are on file, so this cannot be judged here.`,
  'rpt.r.langExempt': (p) => `${p.prov} waives the language test if you graduated from an eligible ${p.prov} institution within the last ${p.n} years — education is not on file, so this is not applied here.`,
  'rpt.r.wage.median': (p) => `${p.prov} requires the offered wage to be at or above the regional median for the occupation — that median is $${p.need} per year.`,
  'rpt.r.wage.rule': (p) => `${p.prov} requires the offered wage to be at or above the regional median wage level for the occupation.`,
  'rpt.r.emp.years': (p) => `Employer-side: the employer needs ${p.n}+ years of operation in ${p.prov} — only the employer can evidence this.`,
  'rpt.r.emp.rev': (p) => `Employer-side: gross annual revenue of $${p.hi} (GTA), $${p.mid} (listed census divisions) or $${p.lo} (elsewhere) — only the employer can evidence this.`,
  'rpt.r.emp.staff.metro': (p) => `Employer-side: at least ${p.metro} full-time staff inside Metro Vancouver (${p.rest} outside) — only the employer can evidence this.`,
  'rpt.r.emp.staff.gta': (p) => `Employer-side: at least ${p.metro} full-time staff (citizens or PRs) at a GTA work location, ${p.rest} outside the GTA — only the employer can evidence this.`,
  'rpt.r.none': (p) => `${p.prov}'s official thresholds are not yet covered by this site — no rule comparison can be made.`,
  // 换省对照(L2-08):下界口径,句子里必须留住「at least」与「x of y answered」
  'rpt.s.cur': (p) => `Currently targeting ${p.prov}: on its official ${p.system} your answers score at least ${p.total} (${p.have} of ${p.all} factors answered).`,
  'rpt.s.cur.noTable': (p) => `Currently targeting ${p.prov}: the province publishes no points grid, so no score can be computed.`,
  'rpt.s.alt.pass': (p) => `Switching to ${p.prov}: at least ${p.total} — already at or above its official ${p.mark}-point threshold.`,
  'rpt.s.alt.mark': (p) => `Switching to ${p.prov}: at least ${p.total} against its official ${p.mark}-point threshold — at most ${p.gap} short, and ${p.rest} unanswered factor(s) can only narrow that.`,
  'rpt.s.next': (p) => `Of the factors you have not answered, ${p.factor} is worth the most in ${p.prov} (up to ${p.pts} points) — fill it in first.`,
  'rpt.s.offer': (p) => `${p.prov} awards ${p.pts} points on its official grid for holding a job offer there.`,
  'rpt.s.alt.plain': (p) => `Switching to ${p.prov}: at least ${p.total} (no published threshold or draw cutoffs yet).`,
  'rpt.s.alt.noDraw': (p) => `Switching to ${p.prov}: at least ${p.total}; this stream has no draw record yet.`,
  'rpt.s.alt.noTable': (p) => `Switching to ${p.prov}: the province publishes no points grid, so no score can be computed.`,
  'rpt.g.noNoc': () => `No occupation on file — list hits, draws and wages all hinge on it. Add your NOC first.`,
  'rpt.g.zeroJobs': (p) => `Zero open postings for this occupation in ${p.prov} right now.`,
  'rpt.g.noCrs': (p) => `Report a CRS score to compute your gap to the "${p.cat}" category draws.`,
  'rpt.g.expShort': (p) => `You report ${p.months} months of Canadian experience; experience-class streams generally require ${p.need} (see source).`,
  'rpt.g.answerScore': (p) => `${p.prov} publishes an official points grid — answer the scoring questions to compute your gap.`,
  'rpt.g.noScoreTable': (p) => `${p.prov} does not publish a points grid or per-draw cutoffs — only a rules comparison is possible, no score gap.`,
  'rpt.g.basics': (p) => `${p.n} basic question(s) unanswered — the report stays coarse until they are.`,
  'rpt.n.cert': () => `Start the NNAS credential assessment — registration is the long pole for regulated nursing.`,
  'rpt.n.jobs': (p) => `See the ${p.n} open postings in ${p.prov} for this occupation.`,
  'rpt.n.score': (p) => `Estimate your ${p.prov} score against the official grid.`,
  'rpt.n.pathways': () => `Compare full immigration pathways.`,
  'rpt.a.prov': (p) => `${p.prov}: NOC is on its published list "${p.label}" — ${p.open} open postings, ${p.named} on the named stream.`,
}
export const reportLineEn = (l: ReportLine): string => (EN[l.key] ? EN[l.key](l.params) : l.key)
