/**
 * 我的岗位域(lib/myjobs)的函数:库行洗成对外行,按人取「我的求职」「我的收藏」两份清单。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import { count, firstOf, numOrNull, queryRows, SQL, text } from '../db'
import { JOB_CLOSED, MYJOBS_LIMIT, TIME_NONE } from './constants'
import type { CountDbRow, CountOut, MyJobDbRow, MyJobRow, MyJobsIn, MyJobsOut, TimeCell } from './types'

/**
 * 库行 → 一行(职位删了就没有职位 id)。
 *
 * @param r 库行。
 * @returns 对外行。
 */
export function toMyJobRow(r: MyJobDbRow): MyJobRow {
  return {
    id: count(r.id),
    jobId: numOrNull(r.job_id),
    title: text(r.title),
    company: text(r.company),
    city: text(r.city),
    cityZh: text(r.city_zh),
    cityKo: text(r.city_ko),
    province: text(r.province),
    salary: text(r.salary_text),
    salaryAnnual: numOrNull(r.salary_annual),
    datePosted: isoOf(r.date_posted),
    companySlug: text(r.company_slug),
    stage: text(r.status),
    savedAt: isoOf(r.created_at),
    updatedAt: isoOf(r.updated_at),
    closed: r.job_status === JOB_CLOSED,
    hasEmail: r.has_email === true,
  }
}

/**
 * 计数库行 → 数(空折 0)。
 *
 * @param r 库行。
 * @returns 数。
 */
export function toCount(r: CountDbRow): number {
  return count(r.n)
}

/**
 * 时刻格 → ISO 串(空折空串)。
 *
 * @param x 库回的时刻格。
 * @returns ISO 串。
 */
function isoOf(x: TimeCell): string {
  if (x == null) {
    return TIME_NONE
  }
  if (x instanceof Date) {
    return x.toISOString()
  }
  return x
}

/**
 * 本人投过的岗(我的求职;最近投的在前)。
 *
 * @param x 数据库连接与用户 id。
 * @returns 清单;没投过给空清单。
 */
export async function loadApplied(x: MyJobsIn): MyJobsOut {
  return queryRows({ db: x.db, sql: SQL.MYJOBS_APPLIED, params: [x.userId, MYJOBS_LIMIT], map: toMyJobRow })
}

/**
 * 本人真发出去了几封(「我的」页 banner 副题;2026-10-08)。
 *
 * @param x 数据库连接与用户 id。
 * @returns 封数;没投过给 0。
 */
export async function loadSentCount(x: MyJobsIn): CountOut {
  const first = firstOf(await queryRows({ db: x.db, sql: SQL.MYJOBS_SENT_COUNT, params: [x.userId], map: toCount }))
  if (first == null) {
    return 0
  }
  return first
}

/**
 * 本人收藏的岗(我的收藏;最近收藏的在前,投过的也在)。
 *
 * @param x 数据库连接与用户 id。
 * @returns 清单;没收藏过给空清单。
 */
export async function loadSaved(x: MyJobsIn): MyJobsOut {
  return queryRows({ db: x.db, sql: SQL.MYJOBS_SAVED, params: [x.userId, MYJOBS_LIMIT], map: toMyJobRow })
}
