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
  appliesArea: string            // metro-vancouver / rest-of-bc;空=全省
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
  evidence: { label: string; url: string; fetched: string; section: string; effective: string }
}

const ev = (r: Requirement) => ({ label: r.label, url: r.url, fetched: r.fetched, section: r.section, effective: r.effective })
const teerHit = (r: Requirement, teer: number | null): boolean => {
  if (!r.appliesTeer) return true                    // 不分 TEER → 该条对谁都适用
  if (teer == null) return false                     // 分 TEER 但不知道 TEER → 挑不出行(上游会落成 unknown)
  return r.appliesTeer.split(',').map((x) => Number(x.trim())).includes(teer)
}

/**
 * 一个省的门槛 → 一组判定。入参 reqs 已按省筛过(引擎不查库、不认省名)。
 * 输出顺序固定:语言 → 收入 → 经验 → 雇主侧 —— 报告里的行序不随数据库行序漂。
 */
export function evaluateRequirements(reqs: Requirement[], p: RuleProfile): RuleResult[] {
  const out: RuleResult[] = []
  const of = (factor: string, subject: ReqSubject = 'applicant') => reqs.filter((r) => r.factor === factor && r.subject === subject)

  // ── 语言:按 TEER 挑行。官方对 TEER 0/1 写的是「注册时不强制交成绩」(op='none'),
  //    那不等于「没有语言要求」—— 措辞照官方,判定给 pass 但句子里说清是「这档不设注册门槛」。
  const lang = of('language').find((r) => teerHit(r, p.teer))
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

  // ── 雇主侧(设计 §3.5):经营年限、全职雇员数这类事实**本站没有**,一律 unknown 并说明要雇主出材料。
  //    照实说比不说强 —— 用户至少知道去问雇主什么。
  const empYears = of('empYears', 'employer')[0]
  if (empYears) {
    out.push({ factor: 'empYears', subject: 'employer', verdict: 'unknown', need: empYears.value, needLow: null, have: null, short: null, unit: empYears.unit, evidence: ev(empYears) })
  }
  const staff = of('empStaff', 'employer')
  if (staff.length) {
    const metro = staff.find((r) => r.appliesArea === 'metro-vancouver') ?? staff[0]
    const rest = staff.find((r) => r.appliesArea === 'rest-of-bc')
    out.push({ factor: 'empStaff', subject: 'employer', verdict: 'unknown', need: metro.value, needLow: rest?.value ?? null, have: null, short: null, unit: metro.unit, evidence: ev(metro) })
  }

  return out
}
