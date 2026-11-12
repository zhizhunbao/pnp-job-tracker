/**
 * 我的岗位域(lib/myjobs)的函数:库行洗成对外行,按人取「我的求职」「我的收藏」两份清单。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import { count, firstOf, numOrNull, queryRows, SQL, text, vtext } from '../db'
import { log, MYJOBS_LOG } from '../log'
import { placeLineOf } from '../location'
import {
  DAY_LOCALE, DAY_ZONE, JOB_CLOSED, MYJOBS_LIMIT, PICKS_CACHE_MAX, PICKS_DAY, PICKS_DRAW_DAYS, PICKS_POOL, PROV_PNP,
  TEXT_NONE, TIME_NONE, RANK_FIRST, VIA_NONE,
  AFTER_MAX, P_AFTER, P_ID, WHY_AIP, WHY_APPLIED, WHY_EE, WHY_KNOWN, WHY_LMIA, WHY_OCC, WHY_PILOT, WHY_PNP,
  WHY_SAVED,
  WHY_WAGE,
} from './constants'
import {
  goalOf, isPrGoal, loadMatches, loadPathwayFits, loadPickProfile, loadReqs, needOf, rankPicksOf,
} from './recommend'
import { CACHE } from './variables'
import type {
  CountDbRow, CountOut, DeleteOut, DropTouchedIn, IdDbRow, MaybeId, MyJobDbRow, MyJobRow, MyJobsDeleteIn, MyJobsIn,
  MyJobsOut, PickDbRow,
  PickRow, PickRows, PicksAfterIn, PicksIn, PicksJson, PicksJsonOut, PicksOut, PicksViewIn, ReasonCodes, ReasonsIn,
  TimeCell, TouchedOut,
  PickFit, PicksJsonIn, CaughtError, LogOut, LogPicksIn, PickClickIn,
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
    resumeMime: text(r.resume_mime),
    hasTailor: r.has_tailor === true,
    titleZh: vtext({ v: r.trans_v, cell: r.title_zh }),
    titleKo: vtext({ v: r.trans_v, cell: r.title_ko }),
    companyZh: text(r.alias_zh),
    companyKo: text(r.alias_ko),
    address: placeLineOf({ address: text(r.address), city: text(r.city), province: text(r.province) }),
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
 * 我的投递「删除」(2026-10-12 Frank 选「各删各的」):草稿真删,已发出的只从列表藏起。
 *
 * @param x 连接、用户 id 与投递 id。
 * @returns 写完。
 */
export async function deleteApplied(x: MyJobsDeleteIn): DeleteOut {
  await x.db.query(SQL.MYJOBS_APPLIED_DELETE, [x.userId, x.id])
}

/**
 * 查询参数里的 id:正整数才认,其余(缺席、乱填)给 null。
 *
 * @param url 请求地址。
 * @returns id 或 null。
 */
export function idOf(url: string): MaybeId {
  const n = Number(new URL(url).searchParams.get(P_ID))
  if (Number.isInteger(n) && n > 0) {
    return n
  }
  return null
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
 * 最后按免费 / Pro 切成看得见与锁住两份(2026-11-11 起不分免费与会员,只取前 PICKS_DAY 条)。
 * 2026-10-13 Frank「做推荐匹配吧」:档案答了身份,再按「我的通道」筛 —— 岗的通道这个身份走不了(或院校条件对不上)就不推;
 * 判定与「我的档案」下面的「我的通道」卡同一个(lib/pathways 的 keepStreamOf)。没答身份不筛。筛在缓存之后,改了档案当场生效。
 * 2026-11-11 任务书第 41 到 46 条(目标是第一优先级):先读档案 —— 没有任何职业依据不出推荐(basis = false);目标「拿 PR」而身份、
 * 语言、工作年限有没答的也不出,回 need 报要补哪几项;否则按目标取候选池(缓存按天、预选省、目标记),剔掉碰过的,
 * 再判硬性条件、打分、分档、排序(rankPicksOf);匹配项有可用的简历正文按简历对职位描述(loadMatches,第 44 条),没有退回按职业。上面「没答身份不筛」只对找工作成立(找工作不看省提名);每日推送信也走这一个函数。
 *
 * @param x 连接、用户 id、预选省与要不要现算。
 * @returns 推荐接口的回包。
 */
export async function getPicks(x: PicksViewIn): PicksJsonOut {
  const profile = await loadPickProfile({ db: x.db, userId: x.userId })
  const goal = goalOf(profile.goal)
  const pr = isPrGoal(goal)
  if (profile.hasOcc === false) {
    return picksViewOf({ rows: [], fits: [], goal, basis: false, need: [], lowOnly: false })
  }
  let need: string[] = []
  if (pr) {
    need = needOf(profile)
  }
  if (need.length > 0) {
    return picksViewOf({ rows: [], fits: [], goal, basis: true, need, lowOnly: false })
  }
  const key = String(x.userId)
  const day = dayOf()
  const hit = CACHE.picks.get(key)
  let rows: PickRow[] = []
  if (x.fresh === false && hit != null && hit.day === day && hit.prov === x.prov && hit.pr === pr) {
    rows = hit.rows
  } else {
    rows = await loadPicks({ db: x.db, userId: x.userId, prov: x.prov, pr })
    if (CACHE.picks.size >= PICKS_CACHE_MAX) {
      CACHE.picks.clear()
    }
    CACHE.picks.set(key, { day, prov: x.prov, pr, rows })
  }
  const [touched, ways, reqs] = await Promise.all([
    loadTouched({ db: x.db, userId: x.userId }), loadPathwayFits({ db: x.db }), loadReqs({ db: x.db }),
  ])
  let prov = profile.prov
  if (prov === TEXT_NONE) {
    prov = x.prov
  }
  const kept = dropTouchedOf({ rows, touched })
  const ids: number[] = []
  for (const r of kept) {
    ids.push(r.id)
  }
  const matches = await loadMatches({ db: x.db, userId: x.userId, ids })
  const ranked = rankPicksOf({ rows: kept, ways, reqs, profile, goal, matches, prov })
  const picks: PickRow[] = []
  const fits: PickFit[] = []
  for (const r of ranked.rows) {
    const row = kept[r.at]
    if (row != null) {
      picks.push(row)
      fits.push(r.fit)
    }
  }
  const json = picksViewOf({
    rows: picks, fits, goal, basis: true, need: [], lowOnly: ranked.lowOnly,
  })
  if (x.via !== VIA_NONE) {
    await logPicks({ db: x.db, userId: x.userId, via: x.via, json })
  }
  return json
}

/**
 * 记今天推了哪些(2026-11-11 任务书第 48 条):今天给看的那几条各一行 —— 第几位、什么档、多少分、各项结论。
 * 当天再拉不重记;写失败只留痕,推荐照常回。
 *
 * @param x 连接、用户 id、从哪推的与推荐接口的回包。
 * @returns 无。
 */
export async function logPicks(x: LogPicksIn): LogOut {
  const ids: number[] = []
  const ranks: number[] = []
  const levels: string[] = []
  const scores: number[] = []
  const parts: string[] = []
  for (const row of x.json.picks) {
    const fit = x.json.fits[ids.length]
    if (fit == null) {
      continue
    }
    ids.push(row.id)
    ranks.push(ids.length - 1 + RANK_FIRST)
    levels.push(fit.level)
    scores.push(fit.score)
    parts.push(JSON.stringify({ hard: fit.hard, soft: fit.soft }))
  }
  if (ids.length === 0) {
    return
  }
  try {
    await x.db.query(SQL.PICK_LOG_ADD, [x.userId, dayOf(), x.json.goal, x.via, ids, ranks, levels, scores, parts])
  } catch (e) {
    log({ tag: MYJOBS_LOG.tag, text: MYJOBS_LOG.pickLogFailed + String(x.userId) + MYJOBS_LOG.sep + (e as CaughtError).message })
  }
}

/**
 * 记点了今天推的这一岗(点职位名或点投递;不是今天推的岗这条语句改 0 行)。
 *
 * @param x 连接、用户 id 与职位 id。
 * @returns 无。
 */
export async function markPickClick(x: PickClickIn): LogOut {
  await x.db.query(SQL.PICK_LOG_CLICK, [x.userId, x.jobId, dayOf()])
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
 * 2026-11-11:只出候选池(PICKS_POOL 条,按目标取),每日推送信改走 getPicks(和页面同一份排序)。
 *
 * @param x 连接、用户 id、预选省与目标是不是拿 PR。
 * @returns 候选池,最多 PICKS_POOL 条。
 */
export async function loadPicks(x: PicksIn): PicksOut {
  return queryRows({
    db: x.db, sql: SQL.MYJOBS_PICKS, params: [x.userId, x.prov, PICKS_POOL, PICKS_DRAW_DAYS, x.pr], map: toPickRow,
  })
}

/**
 * 发出一封之后接着投的同类岗(2026-11-09 Frank:同省、同职业、有投递邮箱、没投过,按新旧排;不走缓存、不分免费与会员)。
 *
 * @param x 连接、用户 id 与刚投的职位 id。
 * @returns 同类岗,最多 AFTER_MAX 条。
 */
export async function loadPicksAfter(x: PicksAfterIn): PicksOut {
  return queryRows({ db: x.db, sql: SQL.MYJOBS_AFTER, params: [x.userId, x.jobId, AFTER_MAX], map: toPickRow })
}

/**
 * 查询参数里「刚投的职位 id」(`?after=`):正整数才认。
 *
 * @param url 请求地址。
 * @returns 职位 id;没带或不合形给 null。
 */
export function afterOf(url: string): MaybeId {
  const n = Number(new URL(url).searchParams.get(P_AFTER))
  if (Number.isInteger(n) && n > 0) {
    return n
  }
  return null
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
 * 2026-10-13 换一批:先把整份推荐从第 batch × PICKS_FREE 条起转一圈(换过头了从头接),再切。
 * 2026-11-11 Frank「别一次性推荐 50 个」「不需要解锁其余」(任务书第 47 条):不分免费与会员,每天只给前 PICKS_DAY 条,
 * 全部看得见;换一批、锁住行随之撤。
 *
 * 2026-11-11 任务书第 41 到 46 条:收的是排好序、带推荐指数的行;回包多带各行推荐指数 fits(与 picks 同序)、目标、
 * 有没有职业依据、拿 PR 要补的档案项、出的是不是低档。
 *
 * @param x 排好的推荐与回包其余几格。
 * @returns 推荐接口的回包。
 */
export function picksViewOf(x: PicksJsonIn): PicksJson {
  return {
    picks: x.rows.slice(0, PICKS_DAY), fits: x.fits.slice(0, PICKS_DAY), goal: x.goal, basis: x.basis, need: x.need,
    lowOnly: x.lowOnly,
  }
}

/**
 * 推荐理由(只放真的;顺序 = 职业对口 / 和收藏的同类 → 能走省提名 → 薪资高于中位)。
 * 投过的同组已写「职业对口」时不再写「和你收藏的同类」(一个事实一枚胶囊);魁北克等没有 PNP 简称的省不出省提名理由。
 * 2026-10-11 Frank「OINP 很长时间没有捞人了」→「90 天可以」:这一省雇主 offer 类通道近 90 天没抽过的,也不出省提名理由;
 * 同日档案「想做的工作」同组也算「职业对口」。
 * 2026-10-11 晚 Frank「可以,按你说的改」(草稿被当成投过、推出卡车司机还贴「职业对口」):「职业对口」只给档案答案命中的;
 * 收藏命中照旧「和你收藏的同类」;真发出去的投递命中改出「和你投过的同类」(WHY_APPLIED)。三样一岗只出一枚,
 * 档案 → 收藏 → 投递(SQL 那头档案答了就不按收藏 / 投递选岗,两格必是 false)。上面「投过的同组已写职业对口」作废。
 * 2026-10-12 Frank「还是需要一个 推荐原因的列 然后 bullets 显示 好处」:末尾再加「全职长期」(WHY_PERM)。
 * 2026-10-12 Frank「这个是 我的 推荐模块」「改吧」:SQL 只推全职长期的岗,这一码条条成立没区分度,撤。
 * 同日「整点有吸引力的 bullets」:再加雇主 LMIA 外劳名额 / EE 定向类别 / AIP 指定雇主三条;顺序改成移民好处在前 ——
 * 省提名 → 薪资 → LMIA → EE → AIP → 职业对口(或收藏 / 投过的同类)→ 全职长期。上面「顺序 = 职业对口 … → 薪资」作废。
 * 2026-10-12 Frank「现在有数据能知道 这个雇主愿不愿意帮忙 弄 pr 吗」「知名公司 也算 一个吧」:AIP 后面再加社区试点指定雇主、知名公司(有维基词条)两条。
 *
 * @param x 四个判定格与省码。
 * @returns 理由码。
 */
export function reasonsOf(x: ReasonsIn): ReasonCodes {
  const out: ReasonCodes = []
  if (x.pnp && x.offerActive && programOf(x.province) !== TEXT_NONE) {
    out.push(WHY_PNP)
  }
  if (x.aboveMed) {
    out.push(WHY_WAGE)
  }
  if (x.lmia) {
    out.push(WHY_LMIA)
  }
  if (x.ee) {
    out.push(WHY_EE)
  }
  if (x.aip) {
    out.push(WHY_AIP)
  }
  if (x.pilot) {
    out.push(WHY_PILOT)
  }
  if (x.known) {
    out.push(WHY_KNOWN)
  }
  if (x.occWant) {
    out.push(WHY_OCC)
  } else if (x.occSaved) {
    out.push(WHY_SAVED)
  } else if (x.occApplied) {
    out.push(WHY_APPLIED)
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
    address: placeLineOf({ address: text(r.address), city, province }),
    city,
    cityZh: text(r.city_zh),
    cityKo: text(r.city_ko),
    province,
    salary: text(r.salary_text),
    datePosted: isoOf(r.date_posted),
    reasons: reasonsOf({
      pnp: r.pnp_eligible === true, province, aboveMed: r.above_med === true,
      occApplied: r.occ_applied === true, occSaved: r.occ_saved === true,
      occWant: r.occ_want === true, offerActive: r.offer_active === true,
      lmia: count(r.lmia_positions) > 0, ee: text(r.ee_category) !== TEXT_NONE, aip: r.aip === true,
      pilot: r.pilot_employer === true && text(r.pilot) !== TEXT_NONE, known: r.known === true,
    }),
    abovePct: numOrNull(r.above_pct),
    wageMedHourly: numOrNull(r.wage_med_hourly),
    lmiaPositions: count(r.lmia_positions),
    eeCategory: text(r.ee_category),
    drawLast: text(r.draw_last),
    pilot: text(r.pilot),
    program: programOf(province),
    hours: text(r.employment_hours),
    term: text(r.employment_term),
    validThrough: isoOf(r.valid_through),
    pnpStream: text(r.pnp_stream),
    pnpEligible: r.pnp_eligible === true,
    provDefault: r.prov_default === true,
    teer: numOrNull(r.teer),
    noc: text(r.noc),
    occWant: r.occ_want === true,
    occSimilar: r.occ_saved === true || r.occ_applied === true,
    designated: r.aip === true || (r.pilot_employer === true && text(r.pilot) !== TEXT_NONE),
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
