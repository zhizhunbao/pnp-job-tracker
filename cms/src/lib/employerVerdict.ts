// 雇主省提名门槛判定(design/雇主省提名门槛判定-20260808.md B4):公司事实 × 官方雇主侧门槛(pnp_requirements)
// → 三态输出,不编数据。红线(设计 §1,照抄照守):
//   ① 三态:达标 / 差某项(点名哪项)/「缺 X 判不了」——不下第四种模糊结论;
//   ② 营业额:本站从无私企财务来源,facts 里压根不收这个字段 → 该项恒 unknown 且**不参与整体判定**
//      (有无这项门槛只影响这一行怎么显示,不该拖累年限/雇员数已经判出来的结果);
//   ③ 判定 = 对照官方公布门槛,不是省官方认证;
//   ④ 公共部门雇主(卫生局/市政/学区)不在企业注册库里 → 整体旁路成 'public',不硬判。
//
// 纯函数、无 IO —— 门槛行(reqs)和公司事实(facts)都由调用方查好传入。
// 不复用 rules.ts 的 employerBar():那是按**单一已知地点**分档取值的(GTA 内外/大温内外…),
// 本函数服务的雇主表一行可能横跨多市没有单一地址,判不出该按哪档 —— 只吃**不分区**的通用门槛
// (appliesArea 全空,如 AB 三项);分档省份(BC/ON/NL)雇员数天然留空,不瞎猜该套哪个档。
// 经营年限官方原文单位不统一(SK 用月、其余用年),这里统一换算成年再比。

import type { Requirement } from './rules'

export type EmployerFacts = {
  foundedYear: number | null
  registryStatus: string | null   // 在册状态:现时仅透传展示,判定不吃它(§1 红线只列年限/雇员数/营业额三项)
  staffEst: number | null
  staffEstSrc: string | null      // 估算来源(懒查 AI / Wikidata),只用于标注证据性质,不进判定
  sector: string | null           // 'public' = 公共部门,直接整体旁路,不与私企同一套门槛硬判
}

export type EvidenceKind = 'official' | 'estimate' | 'missing'
export type ItemVerdict = 'pass' | 'fail' | 'unknown'
export type EmployerVerdictFactor = 'years' | 'staff'

export type EmployerVerdictItem = {
  factor: EmployerVerdictFactor | 'revenue'
  verdict: ItemVerdict
  need: number | null      // 官方门槛(来自 pnp_requirements,恒 official,已换算成统一单位)
  have: number | null      // 公司侧的值
  short: number | null     // verdict='fail' 才有:差多少(need - have)
  unit: string
  evidence: EvidenceKind   // 公司侧这个值的证据性质;have=null 时恒 'missing'
}

export type EmployerVerdict = {
  state: 'met' | 'short' | 'unknown' | 'public'
  items: EmployerVerdictItem[]        // 参与整体判定的项(年限/雇员数),只含该省真收录了门槛的
  revenue: EmployerVerdictItem | null // 营业额:恒旁证,不进 state(§1 红线②)
  failed: EmployerVerdictFactor[]     // state='short' 时点名哪几项没达标
  missing: EmployerVerdictFactor[]    // state='unknown' 时点名判不了的是哪几项(空=该省压根没收录雇主侧门槛)
}

const rowsOf = (reqs: Requirement[], province: string, factor: string) =>
  reqs.filter((r) => r.province === province && r.subject === 'employer' && r.factor === factor)

/**
 * facts × province 门槛(reqs 已按需查好,未按省筛,函数内部自己筛)→ 三态判定。
 * nowYear 默认取当前年份,单测用它锁「N 年前成立」这类相对时间的用例。
 */
export function employerVerdict(facts: EmployerFacts, province: string, reqs: Requirement[], nowYear: number = new Date().getFullYear()): EmployerVerdict {
  if (facts.sector === 'public') {
    return { state: 'public', items: [], revenue: null, failed: [], missing: [] }
  }

  const items: EmployerVerdictItem[] = []
  const failed: EmployerVerdictFactor[] = []
  const missing: EmployerVerdictFactor[] = []
  const push = (factor: EmployerVerdictFactor, need: number | null, have: number | null, unit: string, evidence: EvidenceKind) => {
    let verdict: ItemVerdict = 'unknown'
    let short: number | null = null
    if (need != null && have != null) {
      verdict = have >= need ? 'pass' : 'fail'
      if (verdict === 'fail') short = need - have
    }
    if (verdict === 'fail') failed.push(factor)
    if (verdict === 'unknown') missing.push(factor)
    items.push({ factor, verdict, need, have, short, unit, evidence: have == null ? 'missing' : evidence })
  }

  // 经营年限:本库各省 empYears 都不分区(appliesArea 全空),取第一行即可;单位不统一先换算成年。
  const yearsRow = rowsOf(reqs, province, 'empYears')[0]
  if (yearsRow) {
    const needYears = yearsRow.value == null ? null : yearsRow.unit === 'months' ? yearsRow.value / 12 : yearsRow.value
    const haveYears = facts.foundedYear != null ? nowYear - facts.foundedYear : null
    push('years', needYears, haveYears, 'years', 'official')
  }

  // 雇员数:只吃不分区的通用门槛(appliesArea===''，如 AB);分档省份这里查不到,item 判 unknown。
  const staffRows = rowsOf(reqs, province, 'empStaff')
  if (staffRows.length) {
    const universal = staffRows.find((r) => r.appliesArea === '')
    push('staff', universal?.value ?? null, facts.staffEst, 'employees', 'estimate')
  }

  // 营业额(§1 红线②):facts 没有这个字段 → have 恒 null、verdict 恒 unknown,且不进 failed/missing/state。
  const revenueRows = rowsOf(reqs, province, 'empRevenue')
  const revenue: EmployerVerdictItem | null = revenueRows.length
    ? { factor: 'revenue', verdict: 'unknown', need: revenueRows.find((r) => r.appliesArea === '')?.value ?? null, have: null, short: null, unit: 'CAD/yr', evidence: 'missing' }
    : null

  const state: EmployerVerdict['state'] = items.length === 0 ? 'unknown' : failed.length ? 'short' : missing.length ? 'unknown' : 'met'
  return { state, items, revenue, failed, missing }
}
