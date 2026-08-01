// 规则引擎(设计《规则引擎与题库配对-20260731》§2/§3):把**官方门槛**与**用户情况**对照,输出可核验的判定。
// 纯函数、无 IO、前后端同构;阈值一个都不许写在这里 —— 全部来自 pnp_requirements(官方页抓取入库)。
//
// 三条铁律:
//   ① unknown 是一等公民 —— 门槛没收录、或答案不足以判定,一律 unknown,**不猜、不按别省推**;
//   ② 只说「达标 / 差 N」,不说「你能移民 / 不能移民」(与 match.ts 措辞红线同族);
//   ③ 判定不确定时宁可 unknown:能确定的那一半照说(见下面 income 的「两档都低于就是真低于」)。
//
// 加省 = 数据层加一个 build_<省>_req.py;加因素 = 这里加一个分支。builder 只把结果排成句子。

export type ReqSubject = 'applicant' | 'employer'
export type Requirement = {
  province: string
  program: string
  stream: string
  subject: ReqSubject
  factor: string                 // language / income / experience / empYears / empStaff …
  op: string                     // '>=' | '<=' | 'in' | 'none'(none=官方明说这档不要求)
  value: number | null
  valueText: string
  unit: string
  appliesTeer: string            // "2,3,4,5";空=不分 TEER
  appliesNoc?: string            // NOC 码前缀白名单(ON 技工低档语言门槛);空=不分职业
  excludesNoc?: string           // NOC 码前缀排除表(官方原文的 excluding Sub-Major Group …)
  appliesArea: string            // metro-vancouver / rest-of-bc / gta / outside-gta;空=全省
  familySize: number | null      // 最低收入表专用
  basis: string
  label: string                  // 官方原文
  section: string                // 官方节号
  effective: string
  url: string
  pageUrl: string
  fetched: string
}

// 引擎吃的「用户情况」。全部可为空 —— 空就是 unknown,不填默认值。
export type RuleProfile = {
  noc?: string                          // 判「这个职业算不算官方列的技工」用(ON 语言分档)
  teer: number | null
  clb: number | null                    // 四项中的最低档(站内 clb 口径)
  canadianExpMonths: number | null
  familySize: number | null             // 暂未入题库 → 多数为 null,按「1 人档」做下界推理
  annualIncome: number | null           // 该职业在该省的中位年薪(岗位自带的事实,不问用户;设计 §4 规则 2)
  incomeIsOccMedian: boolean            // 上面那个数是不是「职业中位」——措辞要说清这不是他本人的工资
  area: string | null                   // metro-vancouver / rest-of-bc;不知道就 null
}

export type RuleVerdict = 'pass' | 'fail' | 'unknown'
export type RuleResult = {
  factor: string
  subject: ReqSubject
  verdict: RuleVerdict
  need: number | null              // 官方阈值
  needLow: number | null           // 同一因素有两档时的低档(如收入表大温 / BC 其余)
  have: number | null              // 用户/职业侧的值
  short: number | null             // 差多少(fail 才有;免费层不下发,见 report.gateReport)
  unit: string
  // 分档因素的完整档位(ON 营业额 GTA/指定普查区/其余三档)—— 区域名各省各叫各的,原样带出去给显示层
  tiers?: { area: string; value: number | null }[]
  evidence: { label: string; url: string; fetched: string; section: string; effective: string }
}

const ev = (r: Requirement) => ({ label: r.label, url: r.url, fetched: r.fetched, section: r.section, effective: r.effective })
const teerHit = (r: Requirement, teer: number | null): boolean => {
  if (!r.appliesTeer) return true                    // 不分 TEER → 该条对谁都适用
  if (teer == null) return false                     // 分 TEER 但不知道 TEER → 挑不出行(上游会落成 unknown)
  return r.appliesTeer.split(',').map((x) => Number(x.trim())).includes(teer)
}
// NOC 前缀匹配(ON 的技工白名单存的是官方大组码:72 / 6320 / 62200…)。
// 命中长度即「有多具体」——同一因素有多行都适用时,取最具体的那一行(官方就是这么读的:
// 技工那条是通用条款的例外,不是并列条款)。返回 -1 = 不适用。
const nocScore = (r: Requirement, noc?: string): number => {
  const ex = (r.excludesNoc || '').split(',').map((x) => x.trim()).filter(Boolean)
  if (noc && ex.some((p) => noc.startsWith(p))) return -1
  const inc = (r.appliesNoc || '').split(',').map((x) => x.trim()).filter(Boolean)
  if (!inc.length) return 0                          // 不分职业 = 通用条款(最不具体)
  if (!noc) return -1                                // 分职业但不知道职业 → 该行挑不出来
  const hit = inc.filter((p) => noc.startsWith(p)).sort((a, b) => b.length - a.length)[0]
  return hit ? hit.length : -1
}

/**
 * 一个省的门槛 → 一组判定。入参 reqs 已按省筛过(引擎不查库、不认省名)。
 * 输出顺序固定:语言 → 收入 → 经验 → 雇主侧 —— 报告里的行序不随数据库行序漂。
 */
export function evaluateRequirements(reqs: Requirement[], p: RuleProfile): RuleResult[] {
  const out: RuleResult[] = []
  const of = (factor: string, subject: ReqSubject = 'applicant') => reqs.filter((r) => r.factor === factor && r.subject === subject)

  // ── 语言:先按 TEER 挑行,再按职业挑**最具体**的那行(ON:技工 CLB 5 是通用 CLB 6 的例外)。
  //    官方对 BC TEER 0/1 写的是「注册时不强制交成绩」(op='none'),那不等于「没有语言要求」——
  //    措辞照官方,判定给 pass 但句子里说清是「这档不设注册门槛」。
  const lang = of('language')
    .filter((r) => teerHit(r, p.teer))
    .map((r) => ({ r, s: nocScore(r, p.noc) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)[0]?.r
  if (lang) {
    if (lang.op === 'none') {
      out.push({ factor: 'language', subject: 'applicant', verdict: 'pass', need: null, needLow: null, have: p.clb, short: null, unit: lang.unit, evidence: ev(lang) })
    } else if (p.clb == null || lang.value == null) {
      out.push({ factor: 'language', subject: 'applicant', verdict: 'unknown', need: lang.value, needLow: null, have: p.clb, short: null, unit: lang.unit, evidence: ev(lang) })
    } else {
      const ok = p.clb >= lang.value
      out.push({ factor: 'language', subject: 'applicant', verdict: ok ? 'pass' : 'fail', need: lang.value, needLow: null, have: p.clb, short: ok ? null : lang.value - p.clb, unit: lang.unit, evidence: ev(lang) })
    }
  }

  // ── 最低家庭收入:二维表(家庭人数 × 区域)。两处不知道就用**下界推理**,能定的那一半照定:
  //    · 家庭人数不知道 → 用 1 人档(官方表里最低的一档)。低于它 = 任何家庭人数都低于 → fail 是确定的;
  //      高于它只能说「1 人家庭达标」,人多了门槛更高 → unknown。
  //    · 区域不知道 → 高于大温档(高档)= 住哪都达标;低于 BC 其余档(低档)= 住哪都不达标;中间 unknown。
  const incomeRows = of('income')
  if (incomeRows.length) {
    const size = p.familySize ?? 1
    const pick = (area: string) => incomeRows.find((r) => r.appliesArea === area && r.familySize === size)
        ?? incomeRows.find((r) => r.appliesArea === area && r.familySize === 1)
    const metro = pick('metro-vancouver')
    const rest = pick('rest-of-bc')
    const row = p.area ? pick(p.area) ?? metro ?? rest : metro ?? rest
    if (row) {
      const hi = p.area ? row.value : (metro?.value ?? row.value)     // 区域已知=该区域档;未知=高档作 need
      const lo = p.area ? null : (rest?.value ?? null)
      const have = p.annualIncome
      const sizeKnown = p.familySize != null
      let verdict: RuleVerdict = 'unknown'
      let short: number | null = null
      if (have != null && hi != null) {
        const floor = lo ?? hi                                        // 确定不达标的下界
        if (have < floor) { verdict = 'fail'; short = floor - have }  // 最低的一档都够不到 = 确定不达标
        else if (have >= hi && sizeKnown) verdict = 'pass'            // 最高的一档也够 + 人数已知 = 确定达标
        else verdict = 'unknown'                                      // 中间地带 / 人数未知:只摆门槛,不下判定
      }
      out.push({ factor: 'income', subject: 'applicant', verdict, need: hi, needLow: lo, have, short, unit: row.unit, evidence: ev(row) })
    }
  }

  // ── 工作经验:官方要的是「境内外都算」的技术工作经验,而站内只问了**加拿大**经验 ——
  //    够了就是够了(加拿大经验是它的子集),不够**不能判 fail**(他可能有海外经验)→ unknown。
  const exp = of('experience')[0]
  if (exp && exp.value != null) {
    const have = p.canadianExpMonths
    const ok = have != null && have >= exp.value
    out.push({ factor: 'experience', subject: 'applicant', verdict: ok ? 'pass' : 'unknown', need: exp.value, needLow: null, have, short: null, unit: exp.unit, evidence: ev(exp) })
  }

  // ── 语言免考条款(ON):官方允许指定安省学历免考。本站没问学历 → 只陈述,不拿它改语言判定。
  const exempt = of('languageExempt').find((r) => teerHit(r, p.teer))
  if (exempt) {
    out.push({ factor: 'languageExempt', subject: 'applicant', verdict: 'unknown', need: exempt.value, needLow: null, have: null, short: null, unit: exempt.unit, evidence: ev(exempt) })
  }

  // ── 工资档(ON):阈值不是绝对数,而是「该职业该地区的中位」(basis=occMedian)——
  //    所以 need 取该职业该省的官方中位年薪,而 have 只有逐岗才有(报告层没有具体岗位)→ unknown。
  //    这条的价值不在判定,在于把「拿到 offer 该对着哪个数看」写清楚。
  const wage = of('wage')[0]
  if (wage) {
    const need = wage.basis === 'occMedian' ? p.annualIncome : wage.value
    out.push({ factor: 'wage', subject: 'applicant', verdict: 'unknown', need, needLow: null, have: null, short: null, unit: wage.unit, evidence: ev(wage) })
  }

  // ── 雇主侧(设计 §3.5):经营年限、营业额、全职雇员数这类事实**本站没有**,
  //    一律 unknown 并说明要雇主出材料。照实说比不说强 —— 用户至少知道去问雇主什么。
  const empYears = of('empYears', 'employer')[0]
  if (empYears) {
    out.push({ factor: 'empYears', subject: 'employer', verdict: 'unknown', need: empYears.value, needLow: null, have: null, short: null, unit: empYears.unit, evidence: ev(empYears) })
  }
  // 分档的两条(雇员数两档、ON 营业额三档)按**阈值大小**取高低档,不认省专有的区域名 ——
  // 加省时区域名各叫各的(metro-vancouver / gta / …),按名字挑行等于每加一个省改一次引擎。
  for (const factor of ['empRevenue', 'empStaff']) {
    const rows = of(factor, 'employer').filter((r) => r.value != null).sort((a, b) => (b.value as number) - (a.value as number))
    if (!rows.length) continue
    out.push({
      factor, subject: 'employer', verdict: 'unknown',
      need: rows[0].value, needLow: rows.length > 1 ? (rows[rows.length - 1].value as number) : null,
      have: null, short: null, unit: rows[0].unit, evidence: ev(rows[0]),
      tiers: rows.map((r) => ({ area: r.appliesArea, value: r.value })),
    })
  }

  return out
}
