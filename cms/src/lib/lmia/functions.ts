/**
 * LMIA 口径域的行为:豁免行业近似判定与工资分类(政策事实与维护说明见 constants 头)。
 *
 * @author Frank
 * @time 2026-08-22 23:00:00
 */

import {
  AGRI_P2, EXEMPT_CAREGIVER, FULL_YEAR_HOURS, NOC_GROUP_LEN, NOC_HEALTH_P1, PROV_MEDIAN_HOURLY, PROV_NONE,
  TRADES_P2, WAGE_HIGH, WAGE_LOW,
} from './constants'
import type { LmiaWageClass, LmiaWageClassIn } from './types'

/**
 * 豁免行业的 NOC 近似判定(官方按 NAICS/特定 NOC;这里用 NOC 大类做保守映射,宁可少标豁免):
 * 医疗/护理/看护 = NOC 首位 3 + 居家看护四码;建筑技工 = 72/73 起;初级农业 = 84/86 起。
 *
 * @param noc 五位职业码。
 * @returns 属豁免行业 true。
 */
export function isExemptSector(noc: string): boolean {
  if (noc === '') {
    return false
  }
  if (EXEMPT_CAREGIVER.has(noc)) {
    return true
  }
  const p1 = noc[0]
  const p2 = noc.slice(0, NOC_GROUP_LEN)
  if (p1 === NOC_HEALTH_P1) {
    return true
  }
  if (TRADES_P2.has(p2)) {
    return true
  }
  if (AGRI_P2.has(p2)) {
    return true
  }
  return false
}

/**
 * 年薪 → 时薪(÷2080)与省门槛比;缺工资或缺省门槛 → null(不猜)。
 *
 * @param input 省码与年薪。
 * @returns 高薪/低薪;判不了 null。
 */
export function lmiaWageClass(input: LmiaWageClassIn): LmiaWageClass {
  const thr = PROV_MEDIAN_HOURLY[(input.province || PROV_NONE).toUpperCase()]
  if (thr == null || input.salaryAnnual == null) {
    return null
  }
  if (input.salaryAnnual / FULL_YEAR_HOURS >= thr) {
    return WAGE_HIGH
  }
  return WAGE_LOW
}
