/**
 * coop 域的函数:校内板取数(status=campus 的帖)与行构造器。
 * 顶层只有 function;常量归 constants,形状归 types;连接由调用方注入(方案 A)。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import { count, queryRows, SQL, text } from '../db'
import { COOP_ORIGIN, COOP_ROWS_MAX } from './constants'
import type { CoopJobDbRow, CoopJobRow, LoadCoopJobsIn, LoadCoopJobsOut } from './types'

// =========================================================================
// 1. 取数
// =========================================================================

/**
 * 校内板在招帖(发布日新→旧)。
 *
 * @param x 连接。
 * @returns 洗净的行;表空回空数组。
 */
export async function loadCoopJobs(x: LoadCoopJobsIn): LoadCoopJobsOut {
  return queryRows({ db: x.db, sql: SQL.COOP_JOBS, params: [COOP_ORIGIN, COOP_ROWS_MAX], map: toCoopJobRow })
}

// =========================================================================
// 2. 行构造器
// =========================================================================

/**
 * pg 原始行 → 校内板行(可空格用词汇表折空串;id 是主键不空)。
 *
 * @param r 原始行。
 * @returns 洗净的行。
 */
export function toCoopJobRow(r: CoopJobDbRow): CoopJobRow {
  return {
    id: count(r.id),
    title: text(r.title),
    company: text(r.company_name),
    city: text(r.city),
    province: text(r.province),
    empHours: text(r.employment_hours),
    empTerm: text(r.employment_term),
    datePosted: text(r.date_posted),
  }
}
