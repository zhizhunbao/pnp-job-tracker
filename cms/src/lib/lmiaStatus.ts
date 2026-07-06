// LMIA 低薪冻结口径(E8-04,2026-07-06):把「LMIA 历史记录」升级为「今天这条路还通不通」。
//
// 政策事实(抓自 canada.ca 官方页,httpx 直取,2026-04 生效):
//  · 低薪岗 LMIA 在「失业率 ≥6% 的大都市区(CMA)」暂停受理(2024-09-26 起;CMA 清单每季更新,下次 2026-07-10)。
//  · 低薪 = 工资 **低于所在省/地区的中位时薪门槛**(下表)。高薪岗完全不受此冻结影响。
//  · 豁免行业(即使低薪也照常受理):初级农业、建筑(NAICS 23)、食品制造(311)、医院(622)、
//    护理及居家照护(623)、特定居家看护 NOC(31301/32101/44100/44101)。
//  · 农村地区(CMA 外)另有 2026-04 起的临时宽松措施。
//
// 维护:这是**政策维护表**(季度性),每季对照下方源 URL 核对门槛与规则。
// 源:https://www.canada.ca/en/employment-social-development/services/foreign-workers/median-wage.html
//     https://www.canada.ca/en/employment-social-development/services/foreign-workers/refusal.html

export const LMIA_REFUSAL_SOURCE = 'https://www.canada.ca/en/employment-social-development/services/foreign-workers/refusal.html'
export const LMIA_THRESHOLD_ASOF = '2026-04'  // 门槛表生效月份(季度核对时更新)

// 省/地区 → 中位时薪门槛(CAD/hr);工资 ≥ 门槛 = 高薪类(不受低薪冻结)。抓自 canada.ca median-wage 页。
export const PROV_MEDIAN_HOURLY: Record<string, number> = {
  AB: 35.40, BC: 34.62, MB: 30.00, NB: 28.85, NL: 31.20, NT: 47.09,
  NS: 28.80, NU: 42.00, ON: 34.07, PE: 28.80, QC: 32.96, SK: 32.40, YT: 43.20,
}

// 豁免行业的 NOC 近似判定(官方按 NAICS/特定 NOC;这里用 NOC 大类做保守映射,宁可少标豁免):
//  医疗/护理/看护=NOC 首位 3 + 居家看护 44100/44101;建筑技工=72/73 起;初级农业=8431/8432/8611 等 84/86。
const EXEMPT_CAREGIVER = new Set(['31301', '32101', '44100', '44101'])
export function isExemptSector(noc: string): boolean {
  if (!noc) return false
  if (EXEMPT_CAREGIVER.has(noc)) return true
  const p1 = noc[0], p2 = noc.slice(0, 2)
  return p1 === '3'                       // 医疗护理(医院/护理/照护)
    || p2 === '72' || p2 === '73'         // 建筑等技工
    || p2 === '84' || p2 === '86'         // 初级农业/自然资源生产
}

export type LmiaWageClass = 'high' | 'low' | null
// 年薪 → 时薪(÷2080)与省门槛比;缺工资或缺省门槛 → null(不猜)
export function lmiaWageClass(province: string, salaryAnnual: number | null): LmiaWageClass {
  const thr = PROV_MEDIAN_HOURLY[(province || '').toUpperCase()]
  if (!thr || salaryAnnual == null) return null
  return salaryAnnual / 2080 >= thr ? 'high' : 'low'
}
