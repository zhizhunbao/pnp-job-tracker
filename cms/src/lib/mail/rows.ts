/**
 * SQL 原始行 → 本域/引擎形状的构造器。体内只许词汇表 + 纯拼装。
 *
 * @author Frank
 * @time 2026-08-23 00:40:00
 */

import { numOrNull, text } from '../db'
import type { AlertJobRow, EngineJob, MaybeWeeklyStatRow, SampleDbRow, SampleRow, WeeklyStat } from './types'

/**
 * 一行提醒候选岗(SQL.ALERT_JOBS)→ 匹配引擎的输入行。
 * lmia 三格恒 null:提醒场景不带 LMIA 事实,引擎按「不知道」处理 —— 与老路由逐字段一致。
 *
 * @param j 库里的一行。
 * @returns 引擎输入行。
 */
export function toEngineJob(j: AlertJobRow): EngineJob {
  return {
    noc: text(j.noc), teer: numOrNull(j.teer), province: text(j.province),
    pnpEligible: j.pnp_eligible === true, pnpStream: text(j.pnp_stream), eeCategory: text(j.ee_category),
    salaryAnnual: numOrNull(j.salary_annual), wageMedAnnual: numOrNull(j.wage_med_annual),
    lmiaPositions: null, lmiaLastQuarter: '', lmiaPositionsSkilled: null,
  }
}

/**
 * C2 统计行(SQL.alertOccStats 的唯一一行)→ 当周事实数。
 * 🔴 medSal 必须保 null:官方可空的数值折 0 = 替官方编数(词汇表铁律)。
 *
 * @param r 库里的一行;查空给 null 时产全零(newN=0 会被「没内容不硬发」拦住)。
 * @returns 事实数。
 */
export function toWeeklyStat(r: MaybeWeeklyStatRow): WeeklyStat {
  if (r == null) {
    return { newN: 0, eligN: 0, medSal: null }
  }
  let newN = 0
  if (r.n != null) {
    newN = r.n
  }
  let eligN = 0
  if (r.elig != null) {
    eligN = r.elig
  }
  return { newN: newN, eligN: eligN, medSal: numOrNull(r.med) }
}

/**
 * 一行样例岗(SQL.alertSampleJobs:列已 COALESCE)→ SampleRow。
 *
 * @param r 库里的一行。
 * @returns 样例岗。
 */
export function toSampleRow(r: SampleDbRow): SampleRow {
  return { title: text(r.title), company: text(r.company), sal: text(r.sal) }
}
