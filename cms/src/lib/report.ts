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
import type { OccStats } from './reportFacts'   // 纯类型(reportFacts 反向引 ReportFacts,两边都是 type-only,不成环)

// ── 输入:事实聚合(由 API 层查库组装;引擎不碰 SQL)─────────────────────────
export type OccProvFacts = { province: string; open: number; named: number }   // 该 NOC 在该省:在招 / 命中具名清单岗
export type ReportDraw = { province: string; drawDate: string; stream: string; score: number | null }
export type ReportFacts = {
  noc: string
  title: string                     // NOC 官方名(noc_descriptions,不拿岗位标题冒充)
  teer: number | null
  byProv: OccProvFacts[]
  draws: ReportDraw[]               // pnp_draws(省抽选;FED 行=联邦 EE,本引擎省节不取)
  medianSalary?: number | null
  scoreProvinces?: string[]         // 有官方分值表的省(pnp_score_factors 覆盖,如 BC/SK)
  scores?: Record<string, { total: number; passMark: number | null; system: string; url: string; fetched: string }>  // 用户已算的省估分(pnpSelfScore 输出)
  fetched?: string                  // 事实聚合的数据日期
}
// 卡②基本 4 题里引擎新增消费的字段(currentStatus/clb/targetProvinces 已在 MatchProfile)
export type ReportExtra = { canadianExpMonths: number | null }

// ── 输出:七卡同一契约 ───────────────────────────────────────────────────────
export type ReportLine = {
  key: string                                   // i18n 键(rpt.*)
  params: Record<string, string | number>
  verdict?: MatchVerdict                        // UI 着色用(pass/warn/fail/na)
  source?: { label: string; url: string; fetched: string }   // 依据链:指回具体维度记录/官方页
  url?: string                                  // 站内深链(下一步/备选用)
}
export type Report = {
  goal: 'pr' | 'job' | 'career' | 'prov'
  noc: string
  title: string
  conclusions: ReportLine[]
  gaps: ReportLine[]
  nextSteps: ReportLine[]
  alternatives: ReportLine[]
  confidence: 'low' | 'mid' | 'high'
  asOf: string
}

// 薪资一律显示成 $88.4K(站内既有口径:职位卡 $49K/yr、统计页 $74.9K);裸 88400 读起来像编号
const k = (n: number): string => `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`

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
    return { goal: 'pr', noc: '', title: '', conclusions, gaps, nextSteps, alternatives, confidence: 'low', asOf: facts.fetched ?? '' }
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
      conclusions.push({
        key: 'rpt.c.listedHit', params: { prov, noc, label: named.label, open: f.open, named: f.named },
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

  return { goal: 'pr', noc, title: facts.title, conclusions, gaps, nextSteps, alternatives, confidence, asOf: facts.fetched ?? '' }
}

// ── 卡③「选省份」:十省对照,专属题只有一道(手上有没有 offer)──────────────────
// 免费=库里查得到的(哪个省把你这行放进公开清单、当地在招多少、抽选线区间);
// 锁区=拿你的答案排出来的完整顺序与每省差距。QC 走自己体系不参与排序(不是 PNP)。
export type ProvExtra = { hasJobOffer: boolean | null }
export function buildProvReport(profile: MatchProfile, extra: ProvExtra, dims: MatchDims, facts: ReportFacts): Report {
  const conclusions: ReportLine[] = []
  const gaps: ReportLine[] = []
  const nextSteps: ReportLine[] = []
  const alternatives: ReportLine[] = []
  const noc = facts.noc
  if (!noc) {
    gaps.push({ key: 'rpt.g.noNoc', params: {}, verdict: 'na' })
    return { goal: 'prov', noc: '', title: '', conclusions, gaps, nextSteps, alternatives, confidence: 'low', asOf: facts.fetched ?? '' }
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

  return {
    goal: 'prov', noc, title: facts.title, conclusions, gaps, nextSteps, alternatives,
    confidence: !rank.length ? 'low' : extra.hasJobOffer != null ? 'high' : 'mid', asOf: facts.fetched ?? '',
  }
}

// ── 卡①「找工作」:同一 Report 契约,零新题(职业/处境/目标省已在共用底座里)────────
// 免费=库里查得到的(在招量、具名命中、帖面薪资 vs ESDC 中位);
// 锁区=拿他的答案算出来的(有担保记录的雇主是哪几家、按他在意的维度排好的岗位短名单)。
export function buildJobReport(profile: MatchProfile, dims: MatchDims, facts: ReportFacts, occ: OccStats): Report {
  const conclusions: ReportLine[] = []
  const gaps: ReportLine[] = []
  const nextSteps: ReportLine[] = []
  const noc = facts.noc
  if (!noc) {
    gaps.push({ key: 'rpt.g.noNoc', params: {}, verdict: 'na' })
    return { goal: 'job', noc: '', title: '', conclusions, gaps, nextSteps, alternatives: [], confidence: 'low', asOf: facts.fetched ?? '' }
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
      key: f.named > 0 ? 'rpt.j.openNamed' : 'rpt.j.open',
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

  nextSteps.push({ key: 'rpt.n.pathways', params: {}, url: '/pathways' })
  const answered = [profile.currentStatus != null, profile.targetProvinces.length > 0].filter(Boolean).length
  if (answered < 2) gaps.push({ key: 'rpt.g.basics', params: { n: 2 - answered }, verdict: 'na' })

  return {
    goal: 'job', noc, title: facts.title, conclusions, gaps, nextSteps, alternatives: [],
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
    return { goal: 'career', noc: '', title: '', conclusions, gaps, nextSteps, alternatives, confidence: 'low', asOf: facts.fetched ?? '' }
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
    goal: 'career', noc, title: facts.title, conclusions, gaps, nextSteps, alternatives,
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
  'rpt.c.listedHit': 'rpt.lane.prov.hit', 'rpt.c.listedMiss': 'rpt.lane.prov.miss',
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
  // 卡①/⑥:担保雇主名单与跃迁排序都要用他的答案才筛得出来 → 锁区(自由查得到的在招量与中位薪资照旧免费)
  'rpt.j.sponsors': 'sponsors', 'rpt.k.peerGap': 'move', 'rpt.p.rank': 'rank',
}
const LOCK_ORDER = ['score', 'window', 'alts', 'ee', 'sponsors', 'move', 'rank', 'more']   // 锁行固定序(有序去重)
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

  // 卡①/⑥ 走口径闸(库里查得到的免费,拿你的答案算出来的付费):在招量与薪资对照本来就查得到,
  // 按「前 2 条」硬切会把免费的事实也锁掉 —— 那是收不到钱只挡路。锁的是真要答案才筛得出来的那几条。
  if (report.goal !== 'pr') {
    const free = report.conclusions.filter((c) => !LOCK_CAT[c.key])
    const cats2 = new Set(report.conclusions.filter((c) => LOCK_CAT[c.key]).map((c) => LOCK_CAT[c.key]))
    if (report.alternatives.length) cats2.add(report.goal === 'prov' ? 'rank' : 'move')
    return {
      ...report, conclusions: free, alternatives: [],
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
  // 2026-07-31 红线复查:**不能**拿「该省有官方分值表」当锁区理由 —— 报告流程只问 4+2 题,
  // 省估分要 8 个字段(学历/近5年经验/更早经验/首考语言/二语/年龄/时薪/城市),`facts.scores` 从来没被填过,
  // 所以 scoreAbove/Below 在生产永不触发:解锁后那一行背后是空的 = 卖不存在的东西。
  // 缺口行与「去估分」的跳转照旧免费给。等打分题进了题库、报告真能算分,score 自然由结论行触发。
  if (report.alternatives.length) cats.add('alts')

  return {
    ...report,
    conclusions: report.conclusions.slice(0, FREE_CONCLUSIONS),
    alternatives: [],
    lanes, hint, locked: LOCK_ORDER.filter((k) => cats.has(k)), pro: false,
  }
}

// ── 英文渲染(advisor grounding / 测试可读断言;与 UI 三语同源同数字,同 match.ts reasonEn 手法)──
const EN: Record<string, (p: Record<string, string | number>) => string> = {
  'rpt.c.listedHit': (p) => `NOC ${p.noc} is on ${p.prov}'s published list "${p.label}"; ${p.open} open postings there, ${p.named} hitting the named stream.`,
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
