/**
 * 提醒域的行为:这一轮提醒谁、发什么、何时不发 —— 三轮:A 档案匹配 / B saved-search /
 * C 周报(含 C2 档案版)。发信本体(sendMail/unsubToken)借基建叶 lib/mail
 * (2026-08-23 Frank 拍板两域分开「方便我理解」,推翻 08-22「两个都叫 mail 合并」——
 * alerts=业务(跑什么),mail=机制(怎么发一封),同构 consult→llm)。
 * 匹配引擎归 jobs(行为单一来源);saved-search 取数由路由注入。
 * 游标语义:发成功才回写 lastAlertAt/lastNotifiedAt/lastWeeklyAt;静默窗口整轮不发不回写,
 * 下一个白天窗口自然补发,一封不丢。payload 文档是生成型,体内 `as` 特批牌同一个接缝:
 * 本域只读点名的几格。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */
import crypto from 'crypto'
import { fill } from '../template'
import { numOrNull, SQL, text } from '../db'
import { MAIL_ENABLED, sendMail, unsubToken } from '../mail'
import { hasProfile, match, normalizeProfile } from '../jobs'
import { ALERT_MATCH_LEVEL } from '../quota'
import {
  ALERT_MIN_GAP_MS, BADGE_CLOSED, BADGE_OPEN, DIMS_FALLBACK, DIMS_LIST_SEP, DIMS_NATION, DIMS_PROVS, DIMS_SEP,
  DIM_JOIN, DIM_PAIRS, DRAW_ABOVE, DRAW_BELOW, DRAW_P, DRAW_WINDOW_MS, DRY_ON, EMAIL_SHELL, ET_ZONE, FIELD_NONE,
  HI_LINE, HTML_SEP, JOB_PATH, LOCALE_NONE, LOOKBACK_MS, L_EN, L_KO, L_ZH, MATCH_TOP,
  NOC_RE, OPEN_BOARD, OR_SEP, PAIR_KEY_SEP, PAIR_L, PAIR_M, PAIR_R, PREVIEW_WEEKLY,
  PROFILE_HEAD_DIM, PROFILE_HEAD_P, PROFILE_HEAD_STYLE_NONE, PROFILE_SHELL, PROV_COND, PROV_COND_NONE,
  QUIET_END_DEF, QUIET_START_DEF,
  SAL_K, SAL_NONE, SAVED_SHOW, SITE, ST_OPEN, SUBJ_MATCH, SUBJ_SAVED, SUBJ_SEARCH, SUBJ_WK, TABLE_JOBS,
  COL_SAVED_JOBS, COL_SEARCHES, COL_USERS, ET_LOCALE, HOUR_NUMERIC, K_COUNTS, K_PREVIEW, LEVEL_HIGH,
  LEVEL_MID, SEP_LOC,
  TITLE_NONE, TR_JOB, TR_PROFILE, TR_WEEKLY, UNSUB_MSG_DONE, UNSUB_MSG_FAIL, UNSUB_MSG_INVALID, UNSUB_PAGE,
  US_DONE, US_FAIL, US_INVALID,
  UNSUB_PREVIEW, UNSUB_SAVED, UNSUB_URL, USERS_WEEKLY_OPT, WEEKLY_CAP,
  WEEKLY_NEW_NONE, WEEKLY_NEW_P, WEEKLY_SHELL, WEEK_MS, WK_CTA, WK_FOOT, WK_HEAD, WK_SETTINGS, WK_UNSUB,
} from './constants'
import type {
  AlertCounts, AlertJobRow, EngineJob, MaybeWeeklyStatRow, SampleDbRow, DimsOfFn, MailJobRow, MailLang, MailUserId, QuietInfo, RunIn, RunOut, SampleRow,
  DimsOfMakeIn, DrawCat, EmailHtmlIn, MailJobList, MaybeMoney, MaybeParam, NocNameRow, ProfileHtmlIn,
  ProvBroadPair, ProvCodes, SavedFilters, SavedJobStatusRow, TargetFirstFn, UnsubIn,
  UnsubOut, UnsubState,
  WeeklyHtmlIn, WeeklyItem, WeeklyStat,
} from './types'




/**
 * 静默时段判定(多伦多时间;窗口可用 ALERT_QUIET_START/END 覆盖)。
 *
 * @returns 在不在窗口内与三件运维事实。
 */
export function quietInfo(): QuietInfo {
  let qs = QUIET_START_DEF
  if (process.env.ALERT_QUIET_START != null && process.env.ALERT_QUIET_START !== '') {
    qs = Number(process.env.ALERT_QUIET_START)
  }
  let qe = QUIET_END_DEF
  if (process.env.ALERT_QUIET_END != null && process.env.ALERT_QUIET_END !== '') {
    qe = Number(process.env.ALERT_QUIET_END)
  }
  const etHour = Number(new Intl.DateTimeFormat(ET_LOCALE, { timeZone: ET_ZONE, hour: HOUR_NUMERIC, hour12: false }).format(new Date()))
  let inQuiet: boolean
  if (qs > qe) {
    inQuiet = etHour >= qs || etHour < qe
  } else {
    inQuiet = etHour >= qs && etHour < qe
  }
  return { inQuiet: inQuiet, qs: qs, qe: qe, etHour: etHour }
}

/**
 * 整轮提醒(路由只做鉴权/取参/静默判定,选人与拼信全在这)。
 *
 * @param input 连接、开关、维度表与注入的取数函数。
 * @returns 计数;preview 命中时是第一封周报的 HTML。
 */
// eslint-disable-next-line local/function-length -- 整轮编排三段共享 now/out/payload/dims 闭包，拆开得显式传一大串；段界由三次 payload.find 自然显示
export async function runAlerts(input: RunIn): RunOut {
  const payload = input.payload
  const now = new Date().toISOString()
  const out: AlertCounts = {
    dryRun: input.dry, matchEmails: 0, searchEmails: 0, weeklyEmails: 0, sendFails: 0,
    usersChecked: 0, searchesChecked: 0, weeklyChecked: 0, skippedFilters: [],
  }

  const cut = new Date(Date.now() - DRAW_WINDOW_MS).toISOString().slice(0, 10)
  const byLabel = new Map<string, DrawCat>()
  for (const c of input.dims.eeCategories) {
    if (c.drawCrs != null && c.drawDate >= cut) {
      byLabel.set(c.label, c)
    }
  }
  const newDraws = [...byLabel.values()]
  const users = await payload.find({
    collection: COL_USERS, limit: 1000, depth: 0, overrideAccess: true,
    where: { proUntil: { greater_than: now } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(读的格见文件头)
  for (const u of users.docs as any[]) {
    const profile = normalizeProfile(u.profile)
    if (u.email == null || u.email === '' || hasProfile(profile) === false) {
      continue
    }
    out.usersChecked++
    let since: string = new Date(Date.now() - LOOKBACK_MS).toISOString()
    if (typeof u.lastAlertAt === 'string' && u.lastAlertAt !== '') {
      since = u.lastAlertAt
      if (Date.now() - new Date(u.lastAlertAt).getTime() < ALERT_MIN_GAP_MS) {
        continue
      }
    }
    const res = await input.db.query(SQL.ALERT_JOBS, [since])
    const rows = res.rows as AlertJobRow[]
    const hits: AlertJobRow[] = []
    for (const j of rows) {
      const m = match({ profile, job: toEngineJob(j), dims: input.dims })
      if (m.level === LEVEL_HIGH || (ALERT_MATCH_LEVEL === LEVEL_MID && m.level === LEVEL_MID)) {
        hits.push(j)
      }
    }
    if (profile.targetProvinces.length > 0) {
      hits.sort(makeTargetFirst(profile.targetProvinces))
    }
    const top = hits.slice(0, MATCH_TOP)
    const drawLines: string[] = []
    if (profile.crs != null) {
      for (const d of newDraws) {
        const crs = profile.crs
        const dr = d.drawCrs as number
        const diff = crs - dr
        if (diff >= 0) {
          drawLines.push(fill({ tpl: DRAW_ABOVE, params: { c: d.label, crs: crs, dr: dr, d: diff } }))
        } else {
          drawLines.push(fill({ tpl: DRAW_BELOW, params: { c: d.label, crs: crs, dr: dr, d: -diff } }))
        }
      }
    }
    if (top.length === 0 && drawLines.length === 0) {
      continue
    }
    if (input.dry) {
      if (top.length > 0) {
        out.matchEmails++
      }
      continue
    }
    const ok = await sendMail({ to: u.email, subject: fill({ tpl: SUBJ_MATCH, params: { n: top.length } }), html: emailHtml({ rows: top, drawLines: drawLines }) })
    if (ok) {
      out.matchEmails++
      await payload.update({ collection: COL_USERS, id: u.id, overrideAccess: true, data: { lastAlertAt: now } })
    } else {
      out.sendFails++
    }
  }

  const searches = await payload.find({ collection: COL_SEARCHES, limit: 1000, depth: 1, overrideAccess: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(读的格见文件头)
  for (const sdoc of searches.docs as any[]) {
    out.searchesChecked++
    let ownerEmail = FIELD_NONE
    let ownerId: string | number | null = null
    if (sdoc.user != null && typeof sdoc.user === 'object' && typeof sdoc.user.email === 'string') {
      ownerEmail = sdoc.user.email
      ownerId = sdoc.user.id
    }
    if (ownerEmail === '' || ownerId == null) {
      continue
    }
    let since: string = new Date(Date.now() - LOOKBACK_MS).toISOString()
    if (typeof sdoc.lastNotifiedAt === 'string' && sdoc.lastNotifiedAt !== '') {
      since = sdoc.lastNotifiedAt
      if (Date.now() - new Date(sdoc.lastNotifiedAt).getTime() < ALERT_MIN_GAP_MS) {
        continue
      }
    }
    let filters: SavedFilters = {}
    if (sdoc.filters != null && typeof sdoc.filters === 'object') {
      filters = sdoc.filters as SavedFilters
    }
    const { rows, skipped } = await input.fetchHits({ filters: filters, since: since })
    out.skippedFilters.push(...skipped)
    if (rows.length === 0) {
      continue
    }
    if (input.dry) {
      out.searchEmails++
      continue
    }
    const ok = await sendMail({ to: ownerEmail, subject: fill({ tpl: SUBJ_SEARCH, params: { n: rows.length } }), html: emailHtml({ rows: rows, drawLines: [] }) })
    if (ok) {
      out.searchEmails++
      await payload.update({ collection: COL_SEARCHES, id: sdoc.id, overrideAccess: true, data: { lastNotifiedAt: now } })
    } else {
      out.sendFails++
    }
  }

  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString()
  const cut7 = new Date(Date.now() - WEEK_MS).toISOString().slice(0, 10)
  const freeUsers = await payload.find({
    collection: COL_USERS, limit: 1000, depth: 0, overrideAccess: true,
    where: { and: [
      { or: [{ proUntil: { exists: false } }, { proUntil: { less_than: now } }] },
      { or: [{ weeklyOptOut: { not_equals: true } }, { weeklyOptOut: { exists: false } }] },
      { or: [{ lastWeeklyAt: { exists: false } }, { lastWeeklyAt: { less_than: weekAgo } }] },
    ] },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(读的格见文件头)
  for (const u of freeUsers.docs as any[]) {
    if (out.weeklyEmails >= WEEKLY_CAP) {
      break
    }
    if (u.email == null || u.email === '') {
      continue
    }
    const sj = await payload.find({ collection: COL_SAVED_JOBS, limit: 200, depth: 0, overrideAccess: true, where: { user: { equals: u.id } } })
    if (sj.docs.length === 0) {
      const nocs: string[] = []
      if (u.profile != null && Array.isArray(u.profile.nocCodes)) {
        for (const x of u.profile.nocCodes) {
          if (NOC_RE.test(String(x))) {
            nocs.push(String(x))
          }
        }
      }
      const provs: string[] = []
      if (u.profile != null && Array.isArray(u.profile.targetProvinces)) {
        for (const x of u.profile.targetProvinces) {
          if (typeof x === 'string' && x.length === 2) {
            provs.push(x)
          }
        }
      }
      if (nocs.length === 0) {
        continue
      }
      out.weeklyChecked++
      let provCond = PROV_COND_NONE
      let params: (string | string[])[] = [cut7, nocs]
      if (provs.length > 0) {
        provCond = PROV_COND
        params = [cut7, nocs, provs]
      }
      const agg = await input.db.query(SQL.alertOccStats(provCond), params)
      const st = toWeeklyStat(agg.rows[0])
      if (st.newN === 0) {
        continue
      }
      const sample = await input.db.query(SQL.alertSampleJobs(provCond), params)
      const top3 = sample.rows.map(toSampleRow)
      const nameRes = await input.db.query(SQL.ALERT_NOC_TITLE, [nocs])
      const nameRows = nameRes.rows as NocNameRow[]
      const dimsOf = makeDimsOf({ nameRows: nameRows, nocs: nocs, provs: provs })
      let uLoc = LOCALE_NONE
      if (typeof u.locale === 'string') {
        uLoc = u.locale
      }
      let subjKey: MailLang = L_ZH
      if (uLoc === L_EN || uLoc === L_KO) {
        subjKey = uLoc
      }
      const subject = fill({ tpl: SUBJ_WK[subjKey], params: { n: st.newN, e: st.eligN } })
      if (input.preview === PREVIEW_WEEKLY) {
        let lang = uLoc
        if (input.previewLang !== '') {
          lang = input.previewLang
        }
        const html = weeklyProfileHtml({ rows: top3, stat: st, dimsOf: dimsOf, unsubUrl: fill({ tpl: UNSUB_PREVIEW, params: { site: SITE } }), locale: lang })
        return { kind: K_PREVIEW, html: html }
      }
      if (input.dry) {
        out.weeklyEmails++
        continue
      }
      const ok = await sendMail({ to: u.email, subject: subject, html: weeklyProfileHtml({ rows: top3, stat: st, dimsOf: dimsOf, unsubUrl: unsubUrlOf(u.id), locale: uLoc }) })
      if (ok) {
        out.weeklyEmails++
        await payload.update({ collection: COL_USERS, id: u.id, overrideAccess: true, data: { lastWeeklyAt: now } })
      } else {
        out.sendFails++
      }
      continue
    }
    out.weeklyChecked++
    const ids: number[] = []
    for (const d of sj.docs) {
      let jid: number | null = null
      if (d.job != null && typeof d.job === 'object' && typeof d.job.id === 'number') {
        jid = d.job.id
      } else if (typeof d.job === 'number') {
        jid = d.job
      }
      if (jid != null) {
        ids.push(jid)
      }
    }
    let jrows: SavedJobStatusRow[] = []
    if (ids.length > 0) {
      const jr = await input.db.query(SQL.ALERT_JOBS_BY_IDS, [ids])
      jrows = jr.rows
    }
    const stMap = new Map<string, SavedJobStatusRow>()
    for (const r of jrows) {
      stMap.set(String(r.id), r)
    }
    const items: WeeklyItem[] = []
    for (const d of sj.docs.slice(0, SAVED_SHOW)) {
      let jid: number | null = null
      if (d.job != null && typeof d.job === 'object' && typeof d.job.id === 'number') {
        jid = d.job.id
      } else if (typeof d.job === 'number') {
        jid = d.job
      }
      const j = stMap.get(String(jid))
      let title: string = TITLE_NONE
      if (typeof d.title === 'string' && d.title !== '') {
        title = d.title
      }
      let company = FIELD_NONE
      if (typeof d.company === 'string') {
        company = d.company
      }
      let open = false
      if (j != null && j.status === ST_OPEN) {
        open = true
      }
      items.push({ title: title, company: company, open: open })
    }
    const byPair = new Map<string, ProvBroadPair>()
    for (const r of jrows) {
      if (r.province != null && r.province !== '' && r.broad != null && r.broad !== '') {
        byPair.set(r.province + PAIR_KEY_SEP + r.broad, { province: r.province, broad: r.broad })
      }
    }
    const pairs = [...byPair.values()]
    let newN = 0
    if (pairs.length > 0) {
      const conds: string[] = []
      const cparams: string[] = [cut7]
      for (let i = 0; i < pairs.length; i++) {
        conds.push(PAIR_L + (i * 2 + 2) + PAIR_M + (i * 2 + 3) + PAIR_R)
        cparams.push(pairs[i].province, pairs[i].broad)
      }
      const cr = await input.db.query(SQL.alertNewCount(conds.join(OR_SEP)), cparams)
      if (cr.rows[0] != null && cr.rows[0].n != null) {
        newN = cr.rows[0].n
      }
    }
    let openN = 0
    for (const x of items) {
      if (x.open) {
        openN++
      }
    }
    const dimPieces: string[] = []
    for (const r of pairs.slice(0, DIM_PAIRS)) {
      dimPieces.push(r.province + DIM_JOIN + r.broad)
    }
    let savedLoc = LOCALE_NONE
    if (typeof u.locale === 'string') {
      savedLoc = u.locale
    }
    let savedKey: MailLang = L_ZH
    if (savedLoc === L_EN || savedLoc === L_KO) {
      savedKey = savedLoc
    }
    const subject = fill({ tpl: SUBJ_SAVED[savedKey], params: { total: sj.docs.length, open: openN, closed: items.length - openN } })
    if (input.dry) {
      out.weeklyEmails++
      continue
    }
    const ok = await sendMail({ to: u.email, subject: subject, html: weeklyHtml({ items: items, newN: newN, dims: dimPieces.join(DIMS_LIST_SEP), unsubUrl: unsubUrlOf(u.id) }) })
    if (ok) {
      out.weeklyEmails++
      await payload.update({ collection: COL_USERS, id: u.id, overrideAccess: true, data: { lastWeeklyAt: now } })
    } else {
      out.sendFails++
    }
  }

  return { kind: K_COUNTS, counts: out }
}

/**
 * A/B 信整封 HTML。
 *
 * @param input 岗与抽选段。
 * @returns 整封 HTML。
 */
export function emailHtml(input: EmailHtmlIn): string {
  const draws = input.drawLines.map(drawP).join(HTML_SEP)
  return fill({ tpl: EMAIL_SHELL, params: { draws: draws, hi: HI_LINE, table: jobsTable(input.rows), site: SITE, open: OPEN_BOARD, unsub: UNSUB_SAVED } })
}

/**
 * A/B 信的岗位表(链接落本站详情页 —— 直跳 Job Bank 原帖=流量白送)。
 *
 * @param rows 命中的岗。
 * @returns 表格 HTML。
 */
export function jobsTable(rows: MailJobList): string {
  const trs: string[] = []
  for (const j of rows) {
    let href = SITE
    if (j.id != null) {
      href = SITE + JOB_PATH + j.id
    }
    let title = FIELD_NONE
    if (j.title != null) {
      title = j.title
    }
    let company = FIELD_NONE
    if (j.company_name != null) {
      company = j.company_name
    }
    const where = [j.city, j.province].filter(Boolean).join(SEP_LOC)
    let salary = FIELD_NONE
    if (j.salary_text != null) {
      salary = j.salary_text
    }
    trs.push(fill({ tpl: TR_JOB, params: { href: href, title: title, company: company, where: where, salary: salary } }))
  }
  return fill({ tpl: TABLE_JOBS, params: { rows: trs.join(HTML_SEP) } })
}

/**
 * 一条抽选段落(map 传具名函数)。
 *
 * @param line 段文案。
 * @returns 段 HTML。
 */
function drawP(line: string): string {
  return fill({ tpl: DRAW_P, params: { line: line } })
}

/**
 * C 收藏版周报整封 HTML(zh+en 双语一封)。
 *
 * @param input 收藏条目、当周新增数、方向描述、退订链接。
 * @returns 整封 HTML。
 */
export function weeklyHtml(input: WeeklyHtmlIn): string {
  const trs: string[] = []
  for (const r of input.items) {
    let status = BADGE_CLOSED
    if (r.open) {
      status = BADGE_OPEN
    }
    trs.push(fill({ tpl: TR_WEEKLY, params: { title: r.title, company: r.company, status: status } }))
  }
  let newp = WEEKLY_NEW_NONE
  if (input.newN > 0) {
    newp = fill({ tpl: WEEKLY_NEW_P, params: { dims: input.dims, n: input.newN, site: SITE } })
  }
  return fill({
    tpl: WEEKLY_SHELL,
    params: { rows: trs.join(HTML_SEP), newp: newp, site: SITE, unsubUrl: input.unsubUrl },
  })
}

/**
 * C2 档案版周报整封 HTML(头行按 locale 出单语;空 locale 回 zh+en 双语)。
 *
 * @param input 样例岗、当周事实数、按语取范围、退订链接、用户 locale。
 * @returns 整封 HTML。
 */
export function weeklyProfileHtml(input: ProfileHtmlIn): string {
  const trs: string[] = []
  for (const r of input.rows) {
    trs.push(fill({ tpl: TR_PROFILE, params: { title: r.title, company: r.company, sal: r.sal } }))
  }
  let langs: MailLang[] = [L_ZH, L_EN]
  if (input.locale === L_EN) {
    langs = [L_EN]
  } else if (input.locale === L_KO) {
    langs = [L_KO]
  } else if (input.locale === L_ZH) {
    langs = [L_ZH]
  }
  const heads: string[] = []
  for (let i = 0; i < langs.length; i++) {
    const L = langs[i]
    let style = PROFILE_HEAD_STYLE_NONE
    if (i > 0) {
      style = PROFILE_HEAD_DIM
    }
    const head = fill({ tpl: WK_HEAD[L], params: { d: input.dimsOf(L), n: input.stat.newN, e: input.stat.eligN, m: kSal(input.stat.medSal) } })
    heads.push(fill({ tpl: PROFILE_HEAD_P, params: { style: style, head: head } }))
  }
  const F = langs[0]
  return fill({
    tpl: PROFILE_SHELL,
    params: {
      heads: heads.join(HTML_SEP), rows: trs.join(HTML_SEP), site: SITE,
      cta: fill({ tpl: WK_CTA[F], params: { n: input.stat.newN } }),
      foot: WK_FOOT[F], unsub: WK_UNSUB[F], settings: WK_SETTINGS[F], unsubUrl: input.unsubUrl,
    },
  })
}

/**
 * 中位年薪的显示(null 出「—」,不编数)。
 *
 * @param n 年薪;没有 null。
 * @returns 千位串或占位。
 */
function kSal(n: MaybeMoney): string {
  if (n == null) {
    return SAL_NONE
  }
  return fill({ tpl: SAL_K, params: { k: Math.round(n / 1000) } })
}

/**
 * 退订链接。
 *
 * @param userId 用户 id。
 * @returns 带 HMAC token 的退订 URL。
 */
function unsubUrlOf(userId: MailUserId): string {
  return fill({ tpl: UNSUB_URL, params: { site: SITE, u: userId, t: unsubToken(userId) } })
}

/**
 * dry-run 判定(没配发信密钥或 ?dry=1)。
 *
 * @param dryParam ?dry 参数值;没有 null。
 * @returns dry true。
 */
export function isDryRun(dryParam: MaybeParam): boolean {
  if (MAIL_ENABLED === false) {
    return true
  }
  return dryParam === DRY_ON
}

/**
 * 目标省优先的排序器(sort 传具名函数;偏好不是资格 —— 外省对口岗不排除,只往后放)。
 *
 * @param targets 目标省码组。
 * @returns 比较器。
 */
function makeTargetFirst(targets: ProvCodes): TargetFirstFn {
  return function targetFirst(a: AlertJobRow, b: AlertJobRow): number {
    return rankOf(a) - rankOf(b)
  }

  function rankOf(j: AlertJobRow): number {
    let prov = FIELD_NONE
    if (j.province != null) {
      prov = j.province.toUpperCase()
    }
    if (targets.includes(prov)) {
      return 0
    }
    return 1
  }
}

/**
 * 「按邮件语言取范围描述」构造器（职业名与省范围按邮件语言取 —— 英文/韩文邮件里
 * 塞中文职业名，与 #216 是同一类漏）。文案全在 constants 的 DIMS_* 模板。
 *
 * @param input 职业名行、码数与省码组。
 * @returns 按语取范围函数。
 */
export function makeDimsOf(input: DimsOfMakeIn): DimsOfFn {
  return function dimsOf(L: MailLang): string {
    const names: string[] = []
    for (const r of input.nameRows) {
      let name = FIELD_NONE
      if (L === L_ZH) {
        name = r.zh || r.en
      } else {
        name = r.en || r.zh
      }
      if (name !== '') {
        names.push(name)
      }
    }
    let occ = names.join(DIMS_SEP[L])
    if (occ === '') {
      occ = fill({ tpl: DIMS_FALLBACK[L], params: { n: input.nocs.length } })
    }
    if (input.provs.length > 0) {
      return fill({ tpl: DIMS_PROVS[L], params: { occ: occ, provs: input.provs.join(DIMS_SEP[L]) } })
    }
    return fill({ tpl: DIMS_NATION[L], params: { occ: occ } })
  }
}

/**
 * 退订判定与落库（E9-02b，CASL 要求免登录一键可达）：token 与 unsubToken 同源，
 * 常量时间比对防侧信道；写库失败给 fail（路由出失败页，不抛）。
 *
 * @param input payload 句柄与链接两参。
 * @returns 三态。
 */
export async function unsubApply(input: UnsubIn): UnsubOut {
  const want = unsubToken(input.u)
  const ok = input.t.length === want.length && crypto.timingSafeEqual(Buffer.from(input.t), Buffer.from(want))
  if (input.u === '' || ok === false) {
    return US_INVALID
  }
  try {
    await input.payload.update({ collection: USERS_WEEKLY_OPT, id: input.u, overrideAccess: true, data: { weeklyOptOut: true } })
    return US_DONE
  } catch {
    return US_FAIL
  }
}

/**
 * 退订确认页（双语一页；三态文案在 constants）。
 *
 * @param state 退订判定三态。
 * @returns 整页 HTML。
 */
export function unsubPageHtml(state: UnsubState): string {
  let body: string = UNSUB_MSG_INVALID
  if (state === US_DONE) {
    body = UNSUB_MSG_DONE
  } else if (state === US_FAIL) {
    body = UNSUB_MSG_FAIL
  }
  return fill({ tpl: UNSUB_PAGE, params: { body: body } })
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

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
