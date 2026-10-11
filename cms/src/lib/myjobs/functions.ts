/**
 * 我的岗位域(lib/myjobs)的函数:库行洗成对外行,按人取「我的求职」「我的收藏」两份清单。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import { count, firstOf, numOrNull, queryRows, SQL, text, vtext } from '../db'
import {
  ADDR_SEP, DAY_LOCALE, DAY_ZONE, JOB_CLOSED, MYJOBS_LIMIT, PICKS_CACHE_MAX, PICKS_FREE, PICKS_LOCKED_SHOW, PICKS_MAX, PROV_PNP, TEXT_NONE, TIME_NONE,
  WHY_OCC, WHY_PNP, WHY_SAVED, WHY_WAGE,
} from './constants'
import { CACHE } from './variables'
import type {
  AddressIn, CountDbRow, CountOut, DropTouchedIn, IdDbRow, LockedPick, MyJobDbRow, MyJobRow, MyJobsIn, MyJobsOut, PickDbRow,
  PickRow, PickRows, PicksIn, PicksJson, PicksJsonOut, PicksOut, PicksSplitIn, PicksViewIn, ReasonCodes, ReasonsIn,
  TimeCell, TouchedOut,
} from './types'

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
    hasCover: r.has_cover === true,
    titleZh: vtext({ v: r.trans_v, cell: r.title_zh }),
    titleKo: vtext({ v: r.trans_v, cell: r.title_ko }),
    companyZh: text(r.alias_zh),
    companyKo: text(r.alias_ko),
    address: addressOf({ address: text(r.address), city: text(r.city), province: text(r.province) }),
    hours: text(r.employment_hours),
    term: text(r.employment_term),
    validThrough: isoOf(r.valid_through),
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

/**
 * 今日推荐(2026-10-10 批 2):当天算过就用缓存,没算过现算一次记下;再剔掉他今天新碰过的岗(投出 / 开了草稿),
 * 最后按免费 / Pro 切成看得见与锁住两份。
 *
 * @param x 连接、用户 id、预选省与是不是 Pro。
 * @returns 推荐接口的回包。
 */
export async function getPicks(x: PicksViewIn): PicksJsonOut {
  const key = String(x.userId)
  const day = dayOf()
  const hit = CACHE.picks.get(key)
  let rows: PickRow[] = []
  if (hit != null && hit.day === day && hit.prov === x.prov) {
    rows = hit.rows
  } else {
    rows = await loadPicks({ db: x.db, userId: x.userId, prov: x.prov })
    if (CACHE.picks.size >= PICKS_CACHE_MAX) {
      CACHE.picks.clear()
    }
    CACHE.picks.set(key, { day, prov: x.prov, rows })
  }
  const touched = await loadTouched({ db: x.db, userId: x.userId })
  return picksViewOf({ rows: dropTouchedOf({ rows, touched }), pro: x.pro })
}

/**
 * 今天(多伦多时间的年-月-日;推荐一人一天一份)。
 *
 * @returns YYYY-MM-DD。
 */
export function dayOf(): string {
  return new Intl.DateTimeFormat(DAY_LOCALE, { timeZone: DAY_ZONE }).format(new Date())
}

/**
 * 连库现算今日推荐(不走缓存;每日推送邮件也用它)。
 *
 * @param x 连接、用户 id 与预选省。
 * @returns 推荐,最多 PICKS_MAX 条。
 */
export async function loadPicks(x: PicksIn): PicksOut {
  return queryRows({ db: x.db, sql: SQL.MYJOBS_PICKS, params: [x.userId, x.prov, PICKS_MAX], map: toPickRow })
}

/**
 * 本人碰过的岗(投递表里任何状态)。
 *
 * @param x 连接与用户 id。
 * @returns 职位 id。
 */
export async function loadTouched(x: MyJobsIn): TouchedOut {
  return queryRows({ db: x.db, sql: SQL.MYJOBS_TOUCHED_IDS, params: [x.userId], map: toId })
}

/**
 * 剔掉碰过的岗。
 *
 * @param x 推荐与碰过的职位 id。
 * @returns 剩下的推荐。
 */
export function dropTouchedOf(x: DropTouchedIn): PickRows {
  const out: PickRow[] = []
  for (const r of x.rows) {
    if (x.touched.includes(r.id) === false) {
      out.push(r)
    }
  }
  return out
}

/**
 * 推荐切成看得见与锁住两份:Pro 全给;免费号给前 PICKS_FREE 条,剩下的只报条数,再锁住给看 PICKS_LOCKED_SHOW 条
 * (锁住的只留职位名与理由 —— 公司、地址、薪资、职位号不下发,前端模糊的是假字)。
 *
 * @param x 推荐与是不是 Pro。
 * @returns 推荐接口的回包。
 */
export function picksViewOf(x: PicksSplitIn): PicksJson {
  if (x.pro) {
    return { picks: x.rows, more: 0, locked: [] }
  }
  const rest = x.rows.slice(PICKS_FREE)
  const locked: LockedPick[] = []
  for (const r of rest.slice(0, PICKS_LOCKED_SHOW)) {
    locked.push(toLockedPick(r))
  }
  return { picks: x.rows.slice(0, PICKS_FREE), more: rest.length, locked }
}

/**
 * 推荐一行 → 锁住的一条(只抄职位名、理由、项目简称)。
 *
 * @param r 推荐一行。
 * @returns 锁住的一条。
 */
export function toLockedPick(r: PickRow): LockedPick {
  return { title: r.title, reasons: r.reasons, program: r.program }
}

/**
 * 地点一行(照 Indeed;CLAUDE.md「地点照 Indeed 写一行」):有精确地址用它,没有写「市, 省码」,市也没有只写省码。
 *
 * @param x 精确地址、城市、省码。
 * @returns 一行。
 */
export function addressOf(x: AddressIn): string {
  if (x.address !== TEXT_NONE) {
    return x.address
  }
  if (x.city === TEXT_NONE) {
    return x.province
  }
  if (x.province === TEXT_NONE) {
    return x.city
  }
  return x.city + ADDR_SEP + x.province
}

/**
 * 推荐理由(只放真的;顺序 = 职业对口 / 和收藏的同类 → 能走省提名 → 薪资高于中位)。
 * 投过的同组已写「职业对口」时不再写「和你收藏的同类」(一个事实一枚胶囊);魁北克等没有 PNP 简称的省不出省提名理由。
 *
 * @param x 四个判定格与省码。
 * @returns 理由码。
 */
export function reasonsOf(x: ReasonsIn): ReasonCodes {
  const out: ReasonCodes = []
  if (x.occApplied) {
    out.push(WHY_OCC)
  } else if (x.occSaved) {
    out.push(WHY_SAVED)
  }
  if (x.pnp && programOf(x.province) !== TEXT_NONE) {
    out.push(WHY_PNP)
  }
  if (x.aboveMed) {
    out.push(WHY_WAGE)
  }
  return out
}

/**
 * 省码 → 省提名项目简称。
 *
 * @param province 省码。
 * @returns 简称;不在表里给空串。
 */
export function programOf(province: string): string {
  const p = PROV_PNP[province]
  if (p == null) {
    return TEXT_NONE
  }
  return p
}

// =========================================================================
// 行构造器(推荐段)
// =========================================================================

/**
 * 推荐库行 → 推荐一行。
 *
 * @param r 库行。
 * @returns 推荐一行。
 */
export function toPickRow(r: PickDbRow): PickRow {
  const city = text(r.city)
  const province = text(r.province)
  return {
    id: count(r.id),
    title: text(r.title),
    titleZh: vtext({ v: r.trans_v, cell: r.title_zh }),
    titleKo: vtext({ v: r.trans_v, cell: r.title_ko }),
    company: text(r.company_name),
    companyZh: text(r.alias_zh),
    companyKo: text(r.alias_ko),
    companySlug: text(r.company_slug),
    address: addressOf({ address: text(r.address), city, province }),
    city,
    cityZh: text(r.city_zh),
    cityKo: text(r.city_ko),
    province,
    salary: text(r.salary_text),
    datePosted: isoOf(r.date_posted),
    reasons: reasonsOf({
      pnp: r.pnp_eligible === true, province, aboveMed: r.above_med === true,
      occApplied: r.occ_applied === true, occSaved: r.occ_saved === true,
    }),
    program: programOf(province),
    hours: text(r.employment_hours),
    term: text(r.employment_term),
    validThrough: isoOf(r.valid_through),
  }
}

/**
 * 碰过的岗库行 → 职位 id。
 *
 * @param r 库行。
 * @returns 职位 id。
 */
export function toId(r: IdDbRow): number {
  return count(r.id)
}
