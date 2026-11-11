/**
 * 提醒域的行为:这一轮提醒谁、发什么、何时不发 —— 三轮:A 档案匹配 / B saved-search /
 * C 周报(含 C2 档案版)。发信本体(sendMail/unsubToken)借基建叶 lib/mail
 * (2026-08-23 Frank 拍板两域分开「方便我理解」,推翻 08-22「两个都叫 mail 合并」——
 * alerts=业务(跑什么),mail=机制(怎么发一封),同构 consult→llm)。
 * 匹配引擎归 jobs(行为单一来源);saved-search 取数由路由注入。
 * 游标语义:发成功才回写 lastAlertAt/lastNotifiedAt/lastWeeklyAt;静默窗口整轮不发不回写,
 * 下一个白天窗口自然补发,一封不丢。payload 文档是生成型,体内 `as` 特批牌同一个接缝:
 * 本域只读点名的几格。
 * 2026-11-09 Frank「照着档案推送不就完事了吗」:B 轮 saved-search 撤,按条件提醒不再发信。
 *
 * @author Frank
 * @time 2026-08-23 02:00:00
 */
import crypto from 'crypto'
import { fill } from '../template'
import { count, firstOf, numOrNull, queryRows, SQL, text } from '../db'
import { confirmToken, MAIL_ENABLED, postMail, unsubToken } from '../mail'
import { hasProfile, match, normalizeProfile } from '../jobs'
import { ALERT_MATCH_LEVEL } from '../quota'
import {
  confirmMailHtml, confirmMailText, dailyHtml, dailyText, emailHtml, emailText, weeklyHtml, weeklyProfileHtml,
  weeklyProfileText, weeklyText,
} from './body'
import {
  ALERT_MIN_GAP_MS, COL_SAVED_JOBS, COL_USERS, CONFIRM_MSG_DONE, CONFIRM_MSG_INVALID, CONFIRM_SUBJ, CONFIRM_URL,
  DAILY_GAP_MS, DAILY_MAIL_MAX, DIGEST_USERS_MAX, DIMS_FALLBACK, DIMS_NATION, DIMS_PROVS, DIMS_SEP, DRAW_ABOVE,
  DRAW_BELOW, DRAW_WINDOW_MS, DRY_ON, ET_LOCALE, ET_ZONE, E_MAIL, FIELD_NONE, FREQ_DAILY, FREQ_OFF, FREQ_WEEKLY,
  HDR_LIST_UNSUB, HDR_LIST_UNSUB_POST, HOUR_NUMERIC, ISO_DATE_LEN, K_COUNTS, K_PREVIEW, LEVEL_HIGH, LEVEL_MID,
  LIST_UNSUB_POST_VALUE, LIST_UNSUB_VALUE, LOOKBACK_MS, MATCH_TOP, NOC_RE, PAIR_KEY_SEP, PREVIEW_DAILY,
  PREVIEW_WEEKLY, PROV_CODE_LEN, PROV_COND, PROV_COND_NONE, PUT_PENDING, PUT_SAVED, QUIET_END_DEF, QUIET_START_DEF,
  SAVED_LIMIT, SAVED_SHOW, SCAN_LIMIT, SEP_LOC, SITE, ST_OPEN, SUBJ_DAILY, SUBJ_MATCH, SUBJ_SAVED, SUBJ_WK,
  TITLE_NONE, UNSUB_MSG_DONE, UNSUB_MSG_FAIL, UNSUB_MSG_INVALID, UNSUB_PAGE, UNSUB_PREVIEW, UNSUB_URL,
  USERS_WEEKLY_OPT, USER_ID_RE, US_DONE, US_FAIL, US_INVALID, WEEKLY_CAP, WEEK_MS,
} from './constants'
import type {
  AlertCounts, AlertJobRow, ConfirmIn, ConfirmOut, DailyRoundIn, DailyRoundOut, DigestPrefs, DigestPrefsDbRow,
  DigestPrefsOut, DigestUser, DigestUserDbRow, DigestUsersIn, DigestUsersOut, DimsOfFn, DimsOfMakeIn, DrawCat,
  EngineJob, MailHeaders, MailUserId, MaybeParam, MaybeWeeklyStatRow, NocNameRow, PrefsLoadIn, PrefsPutIn,
  PrefsPutOut, ProvBroadPair, ProvCodes, QuietInfo, RunIn, RunOut, SampleDbRow, SampleRow, SavedJobStatusRow,
  SendAlertIn, SendAlertOut, TargetFirstFn, UnsubIn, UnsubOut, UnsubState, WeeklyItem, WeeklyStat,
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
 * 2026-10-10 批 2「新岗推送」:周报之前插一轮每日推送(dailyRound;preview=daily 时只渲第一封返回);
 * 周报收件人改读 digest_prefs 的「每周」档(原「免费号且没退订」的条件随 DDL 搬成 weekly 行,新用户默认不发),
 * 收件邮箱设了用设的;现在 Pro 选了每周也发。
 *
 * @param input 连接、开关、维度表与注入的取数函数。
 * @returns 计数;preview 命中时是第一封周报的 HTML。
 */
// eslint-disable-next-line local/function-length -- 整轮编排三段共享 now/out/payload/dims 闭包，拆开得显式传一大串；段界由三次 payload.find 自然显示
export async function runAlerts(input: RunIn): RunOut {
  const payload = input.payload
  const now = new Date().toISOString()
  const out: AlertCounts = {
    dryRun: input.dry, matchEmails: 0, weeklyEmails: 0, sendFails: 0,
    usersChecked: 0, weeklyChecked: 0, dailyEmails: 0, dailyChecked: 0,
  }

  const cut = new Date(Date.now() - DRAW_WINDOW_MS).toISOString().slice(0, ISO_DATE_LEN)
  const byLabel = new Map<string, DrawCat>()
  for (const c of input.dims.eeCategories) {
    if (c.drawCrs != null && c.drawDate >= cut) {
      byLabel.set(c.label, c)
    }
  }
  const newDraws = [...byLabel.values()]
  const users = await payload.find({
    collection: COL_USERS, limit: SCAN_LIMIT, depth: 0, overrideAccess: true,
    where: { proUntil: { greater_than: now } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(读的格见文件头)
  for (const u of users.docs as any[]) {
    const profile = normalizeProfile(u.profile)
    if (u.email == null || u.email === '' || hasProfile(profile) === false || u.weeklyOptOut === true) {
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
    const matchIn = { unsubUrl: unsubUrlOf(u.id), rows: top, drawLines: drawLines }
    const ok = await sendAlert({
      to: u.email, subject: fill({ tpl: SUBJ_MATCH, params: { n: top.length } }), html: emailHtml(matchIn), text: emailText(matchIn),
      unsubUrl: matchIn.unsubUrl,
    })
    if (ok) {
      out.matchEmails++
      await payload.update({ collection: COL_USERS, id: u.id, overrideAccess: true, data: { lastAlertAt: now } })
    } else {
      out.sendFails++
    }
  }

  const dailyPreview = await dailyRound({ run: input, out })
  if (dailyPreview !== FIELD_NONE) {
    return { kind: K_PREVIEW, html: dailyPreview }
  }

  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString()
  const cut7 = new Date(Date.now() - WEEK_MS).toISOString().slice(0, ISO_DATE_LEN)
  const weeklyTo = await loadDigestUsers({ db: input.db, freq: FREQ_WEEKLY })
  const weeklyIds: number[] = []
  const weeklyMail = new Map<string, string>()
  for (const w of weeklyTo) {
    weeklyIds.push(w.userId)
    weeklyMail.set(String(w.userId), w.email)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload 生成型接缝(读的格见文件头)
  let freeDocs: any[] = []
  if (weeklyIds.length > 0) {
    const freeUsers = await payload.find({
      collection: COL_USERS, limit: SCAN_LIMIT, depth: 0, overrideAccess: true,
      where: { and: [
        { id: { in: weeklyIds } },
        { or: [{ lastWeeklyAt: { exists: false } }, { lastWeeklyAt: { less_than: weekAgo } }] },
      ] },
    })
    freeDocs = freeUsers.docs
  }
  for (const u of freeDocs) {
    if (out.weeklyEmails >= WEEKLY_CAP) {
      break
    }
    const to = weeklyMail.get(String(u.id))
    if (to != null && to !== '') {
      u.email = to
    }
    if (u.email == null || u.email === '') {
      continue
    }
    const sj = await payload.find({ collection: COL_SAVED_JOBS, limit: SAVED_LIMIT, depth: 0, overrideAccess: true, where: { user: { equals: u.id } } })
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
          if (typeof x === 'string' && x.length === PROV_CODE_LEN) {
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
      const subject = fill({ tpl: SUBJ_WK, params: { n: st.newN } })
      if (input.preview === PREVIEW_WEEKLY) {
        const html = weeklyProfileHtml({ rows: top3, stat: st, dimsOf: dimsOf, unsubUrl: fill({ tpl: UNSUB_PREVIEW, params: { site: SITE } }) })
        return { kind: K_PREVIEW, html: html }
      }
      if (input.dry) {
        out.weeklyEmails++
        continue
      }
      const profileIn = { rows: top3, stat: st, dimsOf: dimsOf, unsubUrl: unsubUrlOf(u.id) }
      const ok = await sendAlert({
        to: u.email, subject: subject, html: weeklyProfileHtml(profileIn), text: weeklyProfileText(profileIn), unsubUrl: profileIn.unsubUrl,
      })
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
      const pairProvs: string[] = []
      const pairBroads: string[] = []
      for (const pair of pairs) {
        pairProvs.push(pair.province)
        pairBroads.push(pair.broad)
      }
      const cr = await input.db.query(SQL.ALERT_NEW_COUNT_BY_PAIRS, [cut7, pairProvs, pairBroads])
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
    const subject = fill({ tpl: SUBJ_SAVED, params: { total: sj.docs.length, open: openN, closed: items.length - openN } })
    if (input.dry) {
      out.weeklyEmails++
      continue
    }
    const savedIn = { items: items, newN: newN, unsubUrl: unsubUrlOf(u.id) }
    const ok = await sendAlert({ to: u.email, subject: subject, html: weeklyHtml(savedIn), text: weeklyText(savedIn), unsubUrl: savedIn.unsubUrl })
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
 * 发一封提醒类的信(2026-11-11):带纯文本版正文与一键退订邮件头;确认信不走这里。
 *
 * @param x 收件人、标题、两版正文与退订链接。
 * @returns 发出去了 true。
 */
async function sendAlert(x: SendAlertIn): SendAlertOut {
  const r = await postMail({
    to: x.to, subject: x.subject, html: x.html, text: x.text, from: FIELD_NONE, replyTo: FIELD_NONE,
    attachments: [], idemKey: FIELD_NONE, headers: alertHeadersOf(x.unsubUrl),
  })
  return r.ok
}

/**
 * 一键退订的两个邮件头(知识库 ui-ux/gmail/email-sender-guidelines.md 的 One-Click Unsubscribe):
 * 收件人在邮箱界面点退订,邮箱往这个网址发 POST(alertsUnsubPostRoute 接)。
 *
 * @param unsubUrl 退订链接。
 * @returns 两个邮件头。
 */
export function alertHeadersOf(unsubUrl: string): MailHeaders {
  return {
    [HDR_LIST_UNSUB]: fill({ tpl: LIST_UNSUB_VALUE, params: { url: unsubUrl } }),
    [HDR_LIST_UNSUB_POST]: LIST_UNSUB_POST_VALUE,
  }
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
  return function dimsOf(): string {
    const names: string[] = []
    for (const r of input.nameRows) {
      const name = r.en || r.zh
      if (name !== '') {
        names.push(name)
      }
    }
    let occ = names.join(DIMS_SEP)
    if (occ === '') {
      occ = fill({ tpl: DIMS_FALLBACK, params: { n: input.nocs.length } })
    }
    if (input.provs.length > 0) {
      return fill({ tpl: DIMS_PROVS, params: { occ: occ, provs: input.provs.join(DIMS_SEP) } })
    }
    return fill({ tpl: DIMS_NATION, params: { occ: occ } })
  }
}

/**
 * 退订判定与落库（E9-02b，CASL 要求免登录一键可达）：token 与 unsubToken 同源，
 * 常量时间比对防侧信道；写库失败给 fail（路由出失败页，不抛）。
 * 2026-10-10 批 2「新岗推送」:周报 / 每日推送都认 digest_prefs,退订连它一起把频率拨回不发。
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
    await input.db.query(SQL.DIGEST_PREFS_OFF, [input.u])
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
// 新岗推送(2026-10-10 批 2:「我的求职」末段的频率 + 收件邮箱;每日推送一轮;换邮箱的确认链接)
// =========================================================================

/**
 * 每日推送一轮:「每天」档的人各取今日推荐(路由注入),一天一封;preview=daily 时只渲第一封返回,别的 preview 整轮不跑
 * (不在走查时真发信)。
 * 2026-11-09「我的」第一批:没有职业依据的人跳过(has_occ,见 SQL.DIGEST_USERS)。
 *
 * @param x 整轮入参与计数。
 * @returns preview 时那封 HTML;否则空串。
 */
async function dailyRound(x: DailyRoundIn): DailyRoundOut {
  const preview = x.run.preview === PREVIEW_DAILY
  if (x.run.preview !== FIELD_NONE && preview === false) {
    return FIELD_NONE
  }
  const users = await loadDigestUsers({ db: x.run.db, freq: FREQ_DAILY })
  for (const u of users) {
    if (u.email === '' || u.hasOcc === false || (preview === false && isDailyTooSoon(u.lastDailyAt))) {
      continue
    }
    x.out.dailyChecked++
    const picks = (await x.run.loadPicks({ userId: u.userId })).slice(0, DAILY_MAIL_MAX)
    if (picks.length === 0) {
      continue
    }
    if (preview) {
      return dailyHtml({ picks, unsubUrl: fill({ tpl: UNSUB_PREVIEW, params: { site: SITE } }) })
    }
    if (x.run.dry) {
      x.out.dailyEmails++
      continue
    }
    const dailyIn = { picks, unsubUrl: unsubUrlOf(u.userId) }
    const ok = await sendAlert({
      to: u.email, subject: fill({ tpl: SUBJ_DAILY, params: { n: picks.length } }), html: dailyHtml(dailyIn), text: dailyText(dailyIn),
      unsubUrl: dailyIn.unsubUrl,
    })
    if (ok) {
      x.out.dailyEmails++
      await x.run.db.query(SQL.DIGEST_DAILY_MARK, [u.userId])
    } else {
      x.out.sendFails++
    }
  }
  return FIELD_NONE
}

/**
 * 离上次每日推送还不到 DAILY_GAP_MS。
 *
 * @param last 上次的 ISO 时刻(没发过 = 空串)。
 * @returns 太近了 true。
 */
function isDailyTooSoon(last: string): boolean {
  if (last === '') {
    return false
  }
  return Date.now() - new Date(last).getTime() < DAILY_GAP_MS
}

/**
 * 某一档频率的收件人。
 *
 * @param x 连接与频率。
 * @returns 收件人。
 */
export async function loadDigestUsers(x: DigestUsersIn): DigestUsersOut {
  return queryRows({ db: x.db, sql: SQL.DIGEST_USERS, params: [x.freq, DIGEST_USERS_MAX], map: toDigestUser })
}

/**
 * 存推送设置:邮箱是账户邮箱或已确认的那个 → 直接生效;换成新邮箱 → 先往新邮箱发确认信,发出去了才记成待确认
 * (点了链接才换上,防拿别人邮箱刷信);确认信没发出去 → 频率照存、邮箱不动,回 mail。
 *
 * @param x 连接、用户 id、账户邮箱、频率与想发到的邮箱。
 * @returns saved / pending / mail。
 */
export async function saveDigestPrefs(x: PrefsPutIn): PrefsPutOut {
  const now = await loadDigestPrefs({ db: x.db, userId: x.userId, account: x.account })
  const account = x.account.toLowerCase()
  let keep: string | null = null
  if (now.email.toLowerCase() !== account) {
    keep = now.email
  }
  if (x.email === account) {
    await x.db.query(SQL.DIGEST_PREFS_PUT, [x.userId, x.freq, null])
    return PUT_SAVED
  }
  if (x.email === now.email.toLowerCase()) {
    await x.db.query(SQL.DIGEST_PREFS_PUT, [x.userId, x.freq, keep])
    return PUT_SAVED
  }
  const url = fill({ tpl: CONFIRM_URL, params: { site: SITE, u: x.userId, t: confirmToken({ userId: x.userId, email: x.email }) } })
  const sent = await postMail({
    to: x.email, subject: CONFIRM_SUBJ, html: confirmMailHtml(url), text: confirmMailText(url), from: FIELD_NONE, replyTo: FIELD_NONE,
    attachments: [], idemKey: FIELD_NONE, headers: {},
  })
  if (sent.ok === false) {
    await x.db.query(SQL.DIGEST_PREFS_PUT, [x.userId, x.freq, keep])
    return E_MAIL
  }
  await x.db.query(SQL.DIGEST_PREFS_PENDING, [x.userId, x.freq, x.email])
  return PUT_PENDING
}

/**
 * 本人的推送设置(没设过 = 不发、发到账户邮箱)。
 *
 * @param x 连接、用户 id 与账户邮箱。
 * @returns 推送设置。
 */
export async function loadDigestPrefs(x: PrefsLoadIn): DigestPrefsOut {
  const first = firstOf(await queryRows({ db: x.db, sql: SQL.DIGEST_PREFS_ONE, params: [x.userId], map: toDigestPrefs }))
  if (first == null) {
    return { freq: FREQ_OFF, email: x.account, pending: FIELD_NONE, asked: false }
  }
  if (first.email === '') {
    return { freq: first.freq, email: x.account, pending: first.pending, asked: true }
  }
  return first
}

/**
 * 点了确认链接:token 与「用户 id + 待确认邮箱」对得上(常量时间比对)且 7 天内,换上新邮箱。
 *
 * @param x 连接与链接两参。
 * @returns done / invalid。
 */
export async function confirmApply(x: ConfirmIn): ConfirmOut {
  if (USER_ID_RE.test(x.u) === false) {
    return US_INVALID
  }
  const first = firstOf(await queryRows({ db: x.db, sql: SQL.DIGEST_PREFS_ONE, params: [x.u], map: toDigestPrefs }))
  if (first == null || first.pending === '') {
    return US_INVALID
  }
  const want = confirmToken({ userId: x.u, email: first.pending })
  if (x.t.length !== want.length || crypto.timingSafeEqual(Buffer.from(x.t), Buffer.from(want)) === false) {
    return US_INVALID
  }
  const res = await x.db.query(SQL.DIGEST_PREFS_CONFIRM, [x.u, first.pending])
  if (res.rows.length === 0) {
    return US_INVALID
  }
  return US_DONE
}

/**
 * 确认页(同退订页的壳)。
 *
 * @param state done / invalid。
 * @returns 整页 HTML。
 */
export function confirmPageHtml(state: string): string {
  let body = CONFIRM_MSG_INVALID
  if (state === US_DONE) {
    body = fill({ tpl: CONFIRM_MSG_DONE, params: { site: SITE } })
  }
  return fill({ tpl: UNSUB_PAGE, params: { body } })
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
 * 2026-11-11:信里只写新职位数,可提名数与中位年薪两格删掉(连同查询里的两列)。
 *
 * @param r 库里的一行;查空给 null 时产全零(newN=0 会被「没内容不硬发」拦住)。
 * @returns 事实数。
 */
export function toWeeklyStat(r: MaybeWeeklyStatRow): WeeklyStat {
  if (r == null) {
    return { newN: 0 }
  }
  let newN = 0
  if (r.n != null) {
    newN = r.n
  }
  return { newN: newN }
}

/**
 * 一行样例岗(SQL.alertSampleJobs:列已 COALESCE)→ SampleRow。
 *
 * @param r 库里的一行。
 * @returns 样例岗。
 */
export function toSampleRow(r: SampleDbRow): SampleRow {
  return {
    id: numOrNull(r.id), title: text(r.title), company: text(r.company), sal: text(r.sal),
    where: [text(r.city), text(r.province)].filter(Boolean).join(SEP_LOC), pnp: r.pnp_eligible === true,
  }
}

/**
 * 推送收件人库行 → 收件人。
 *
 * @param r 库行。
 * @returns 收件人。
 */
export function toDigestUser(r: DigestUserDbRow): DigestUser {
  let pro = false
  if (r.pro_until != null) {
    pro = new Date(r.pro_until).getTime() > Date.now()
  }
  let lastDailyAt = ''
  if (r.last_daily_at != null) {
    lastDailyAt = new Date(r.last_daily_at).toISOString()
  }
  return { userId: count(r.user_id), email: text(r.email), pro, lastDailyAt, hasOcc: r.has_occ === true }
}

/**
 * 推送设置库行 → 推送设置(收件邮箱空 = 账户邮箱,由 loadDigestPrefs 补)。
 *
 * @param r 库行。
 * @returns 推送设置。
 */
export function toDigestPrefs(r: DigestPrefsDbRow): DigestPrefs {
  let freq = FREQ_OFF
  if (r.freq === FREQ_DAILY || r.freq === FREQ_WEEKLY) {
    freq = r.freq
  }
  return { freq, email: text(r.email), pending: text(r.pending_email), asked: true }
}
