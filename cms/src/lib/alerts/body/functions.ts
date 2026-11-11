/**
 * alerts 桶的子桶 body 的行为:四种提醒信与确认信的 HTML 版和纯文本版怎么拼(2026-11-11 自父桶 functions 原样搬来,函数体一字未改)。
 *
 * @author Frank
 * @time 2026-11-11 03:00:00
 */
import { fill } from '../../template'
import {
  ACCOUNT_PATH, BADGE_CLOSED, BADGE_OPEN, CONFIRM_CTA, CONFIRM_HEAD, CONFIRM_TEXT, DAILY_CTA, DAILY_HEAD, DRAW_P,
  FIELD_NONE, HI_LINE, HTML_SEP, JOB_BLOCK, JOB_LINE, JOB_LIST, JOB_PATH, JOB_TITLE_LINK, JOB_TITLE_PLAIN, KICKER,
  MAIL_BTN, MAIL_H1, MAIL_LINKS_ALERT, MAIL_LINKS_SITE, MAIL_P, MAIL_REASON_ALERT, MAIL_REASON_CONFIRM, MAIL_SHELL,
  MAIL_SUB, MAIL_TEXT_ALERT, MAIL_TEXT_CONFIRM, OPEN_BOARD, SAVED_CTA, SAVED_HEAD, SEP_LOC, SITE, TAG_PNP,
  TEXT_JOB_BULLET, TEXT_JOB_HREF, TEXT_JOB_SEP, TEXT_JOB_TAG, TEXT_NL, TEXT_TAG_CLOSED, TEXT_TAG_OPEN, TEXT_TAG_PNP,
  TEXT_WEEKLY_NEW, TITLE_SMALL, TITLE_WORD_RE, WEEKLY_NEW_NONE, WEEKLY_NEW_P, WK_CTA, WK_HEAD, WK_SUB,
} from './constants'
import type {
  AlertShellIn, AlertTextIn, DailyHtmlIn, EmailHtmlIn, JobBlockIn, MailJobList, MailJobRow, ProfileHtmlIn,
  WeeklyHtmlIn,
} from './types'

// =========================================================================
// 1. 四种提醒信
// =========================================================================

/**
 * A/B 信整封 HTML。
 *
 * @param input 岗与抽选段。
 * @returns 整封 HTML。
 */
export function emailHtml(input: EmailHtmlIn): string {
  const body = input.drawLines.map(drawP).join(HTML_SEP) + fill({ tpl: MAIL_H1, params: { text: HI_LINE } })
    + jobsTable(input.rows) + fill({ tpl: MAIL_BTN, params: { href: SITE, label: OPEN_BOARD } })
  return alertShellOf({ kicker: KICKER.match, body: body, unsubUrl: input.unsubUrl })
}

/**
 * A/B 信的纯文本版(2026-11-11:给不渲 HTML 的收件端;标题、每个职位一行、去职位板的链接、页脚说明与退订链接)。
 *
 * @param input 岗与抽选段。
 * @returns 纯文本正文。
 */
export function emailText(input: EmailHtmlIn): string {
  const lines: string[] = []
  for (const d of input.drawLines) {
    lines.push(d)
  }
  for (const j of input.rows) {
    lines.push(jobLineOf(blockOfMatch(j)))
  }
  return alertTextOf({ head: HI_LINE, lines: lines, cta: OPEN_BOARD, href: SITE, unsubUrl: input.unsubUrl })
}

/**
 * A/B 信的职位块(链接落本站详情页 —— 直跳 Job Bank 原帖=流量白送)。
 *
 * @param rows 命中的岗。
 * @returns 职位块 HTML。
 */
function jobsTable(rows: MailJobList): string {
  const blocks: string[] = []
  for (const j of rows) {
    blocks.push(jobBlockOf(blockOfMatch(j)))
  }
  return fill({ tpl: JOB_LIST, params: { rows: blocks.join(HTML_SEP) } })
}

/**
 * A/B 信的一条岗 → 职位块的各格(HTML 版与纯文本版共用;没有的格给空串,不带标签)。
 *
 * @param j 命中的一条岗。
 * @returns 职位块的各格。
 */
function blockOfMatch(j: MailJobRow): JobBlockIn {
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
  return { href: href, title: title, company: company, where: where, salary: salary, tag: FIELD_NONE }
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
 * C 收藏版周报整封 HTML。
 *
 * @param input 收藏条目、当周新增数、退订链接。
 * @returns 整封 HTML。
 */
export function weeklyHtml(input: WeeklyHtmlIn): string {
  const blocks: string[] = []
  for (const r of input.items) {
    let status = BADGE_CLOSED
    if (r.open) {
      status = BADGE_OPEN
    }
    blocks.push(jobBlockOf({ href: FIELD_NONE, title: r.title, company: r.company, where: FIELD_NONE, salary: FIELD_NONE, tag: status }))
  }
  let newp = WEEKLY_NEW_NONE
  if (input.newN > 0) {
    newp = fill({ tpl: MAIL_P, params: { text: fill({ tpl: WEEKLY_NEW_P, params: { n: input.newN, site: SITE } }) } })
  }
  const body = fill({ tpl: MAIL_H1, params: { text: SAVED_HEAD } }) + fill({ tpl: JOB_LIST, params: { rows: blocks.join(HTML_SEP) } })
    + newp + fill({ tpl: MAIL_BTN, params: { href: SITE + ACCOUNT_PATH, label: SAVED_CTA } })
  return alertShellOf({ kicker: KICKER.saved, body: body, unsubUrl: input.unsubUrl })
}

/**
 * C 收藏版周报的纯文本版。
 *
 * @param input 收藏条目、当周新增数、退订链接。
 * @returns 纯文本正文。
 */
export function weeklyText(input: WeeklyHtmlIn): string {
  const lines: string[] = []
  for (const r of input.items) {
    let status = TEXT_TAG_CLOSED
    if (r.open) {
      status = TEXT_TAG_OPEN
    }
    lines.push(jobLineOf({ href: FIELD_NONE, title: r.title, company: r.company, where: FIELD_NONE, salary: FIELD_NONE, tag: status }))
  }
  if (input.newN > 0) {
    lines.push(fill({ tpl: TEXT_WEEKLY_NEW, params: { n: input.newN } }))
  }
  return alertTextOf({ head: SAVED_HEAD, lines: lines, cta: SAVED_CTA, href: SITE + ACCOUNT_PATH, unsubUrl: input.unsubUrl })
}

/**
 * C2 档案版周报整封 HTML。
 *
 * @param input 样例岗、当周事实数、范围描述、退订链接。
 * @returns 整封 HTML。
 */
export function weeklyProfileHtml(input: ProfileHtmlIn): string {
  const blocks: string[] = []
  for (const r of input.rows) {
    let href = FIELD_NONE
    if (r.id != null) {
      href = SITE + JOB_PATH + r.id
    }
    let tag = FIELD_NONE
    if (r.pnp) {
      tag = TAG_PNP
    }
    blocks.push(jobBlockOf({ href: href, title: r.title, company: r.company, where: r.where, salary: r.sal, tag: tag }))
  }
  const body = fill({ tpl: MAIL_H1, params: { text: fill({ tpl: WK_HEAD, params: { n: input.stat.newN } }) } })
    + fill({ tpl: MAIL_SUB, params: { text: fill({ tpl: WK_SUB, params: { d: input.dimsOf() } }) } })
    + fill({ tpl: JOB_LIST, params: { rows: blocks.join(HTML_SEP) } })
    + fill({ tpl: MAIL_BTN, params: { href: SITE, label: fill({ tpl: WK_CTA, params: { n: input.stat.newN } }) } })
  return alertShellOf({ kicker: KICKER.weekly, body: body, unsubUrl: input.unsubUrl })
}

/**
 * C2 档案版周报的纯文本版。
 *
 * @param input 样例岗、当周事实数、范围描述、退订链接。
 * @returns 纯文本正文。
 */
export function weeklyProfileText(input: ProfileHtmlIn): string {
  const lines: string[] = [fill({ tpl: WK_SUB, params: { d: input.dimsOf() } })]
  for (const r of input.rows) {
    let href = FIELD_NONE
    if (r.id != null) {
      href = SITE + JOB_PATH + r.id
    }
    let tag = FIELD_NONE
    if (r.pnp) {
      tag = TEXT_TAG_PNP
    }
    lines.push(jobLineOf({ href: href, title: r.title, company: r.company, where: r.where, salary: r.sal, tag: tag }))
  }
  return alertTextOf({
    head: fill({ tpl: WK_HEAD, params: { n: input.stat.newN } }), lines: lines,
    cta: fill({ tpl: WK_CTA, params: { n: input.stat.newN } }), href: SITE, unsubUrl: input.unsubUrl,
  })
}

/**
 * 每日推送整封 HTML。
 *
 * @param x 推荐、语言与退订链接。
 * @returns 整封 HTML。
 */
export function dailyHtml(x: DailyHtmlIn): string {
  const blocks: string[] = []
  for (const p of x.picks) {
    blocks.push(jobBlockOf({
      href: SITE + JOB_PATH + p.id, title: p.title, company: p.company, where: p.address, salary: p.salary, tag: FIELD_NONE,
    }))
  }
  const body = fill({ tpl: MAIL_H1, params: { text: fill({ tpl: DAILY_HEAD, params: { n: x.picks.length } }) } })
    + fill({ tpl: JOB_LIST, params: { rows: blocks.join(HTML_SEP) } })
    + fill({ tpl: MAIL_BTN, params: { href: SITE + ACCOUNT_PATH, label: DAILY_CTA } })
  return alertShellOf({ kicker: KICKER.daily, body: body, unsubUrl: x.unsubUrl })
}

/**
 * 每日推送的纯文本版。
 *
 * @param x 推荐与退订链接。
 * @returns 纯文本正文。
 */
export function dailyText(x: DailyHtmlIn): string {
  const lines: string[] = []
  for (const p of x.picks) {
    lines.push(jobLineOf({
      href: SITE + JOB_PATH + p.id, title: p.title, company: p.company, where: p.address, salary: p.salary, tag: FIELD_NONE,
    }))
  }
  return alertTextOf({
    head: fill({ tpl: DAILY_HEAD, params: { n: x.picks.length } }), lines: lines, cta: DAILY_CTA, href: SITE + ACCOUNT_PATH,
    unsubUrl: x.unsubUrl,
  })
}

// =========================================================================
// 2. 确认信
// =========================================================================

/**
 * 确认信整封 HTML(同提醒信的外壳,页脚只留站点链接)。
 *
 * @param url 确认链接。
 * @returns 整封 HTML。
 */
export function confirmMailHtml(url: string): string {
  const body = fill({ tpl: MAIL_H1, params: { text: CONFIRM_HEAD } }) + fill({ tpl: MAIL_P, params: { text: CONFIRM_TEXT } })
    + fill({ tpl: MAIL_BTN, params: { href: url, label: CONFIRM_CTA } })
  return fill({
    tpl: MAIL_SHELL,
    params: {
      site: SITE, kicker: KICKER.confirm, body: body, reason: MAIL_REASON_CONFIRM,
      links: fill({ tpl: MAIL_LINKS_SITE, params: { site: SITE } }),
    },
  })
}

/**
 * 确认信的纯文本版。
 *
 * @param url 确认链接。
 * @returns 纯文本正文。
 */
export function confirmMailText(url: string): string {
  return fill({ tpl: MAIL_TEXT_CONFIRM, params: { head: CONFIRM_HEAD, text: CONFIRM_TEXT, cta: CONFIRM_CTA, href: url, site: SITE } })
}

// =========================================================================
// 3. 外壳与共用块
// =========================================================================

/**
 * 提醒类的信套外壳:页脚交代为什么收到、数据来源,带退订与设置链接。
 *
 * @param x 信的种类、正文、退订链接。
 * @returns 整封 HTML。
 */
function alertShellOf(x: AlertShellIn): string {
  return fill({
    tpl: MAIL_SHELL,
    params: {
      site: SITE, kicker: x.kicker, body: x.body, reason: MAIL_REASON_ALERT,
      links: fill({ tpl: MAIL_LINKS_ALERT, params: { unsubUrl: x.unsubUrl, site: SITE } }),
    },
  })
}

/**
 * 提醒类的信的纯文本版外壳:标题、正文各行、查看全部的链接、页脚说明与退订链接。
 *
 * @param x 标题、各行、链接与退订链接。
 * @returns 纯文本正文。
 */
function alertTextOf(x: AlertTextIn): string {
  return fill({
    tpl: MAIL_TEXT_ALERT,
    params: { head: x.head, lines: x.lines.join(TEXT_NL), cta: x.cta, href: x.href, unsubUrl: x.unsubUrl, site: SITE },
  })
}

/**
 * 信里一个职位一块:职位名(有链接就带)、公司与地点、薪资与标签。
 *
 * @param x 这一块的各格;没有的格传空串。
 * @returns 这一块的 HTML。
 */
function jobBlockOf(x: JobBlockIn): string {
  const name = headlineOf(x.title)
  let title = fill({ tpl: JOB_TITLE_PLAIN, params: { title: name } })
  if (x.href !== '') {
    title = fill({ tpl: JOB_TITLE_LINK, params: { href: x.href, title: name } })
  }
  let line = FIELD_NONE
  if (x.salary !== '' || x.tag !== '') {
    line = fill({ tpl: JOB_LINE, params: { salary: x.salary, tag: x.tag } })
  }
  return fill({ tpl: JOB_BLOCK, params: { title: title, meta: [x.company, x.where].filter(Boolean).join(SEP_LOC), line: line } })
}

/**
 * 纯文本版里一个职位一行:职位名、公司、地点、薪资,后面跟标签与链接(有才出)。
 *
 * @param x 这一行的各格;没有的格传空串,标签传标签字。
 * @returns 这一行。
 */
function jobLineOf(x: JobBlockIn): string {
  let line = TEXT_JOB_BULLET + [headlineOf(x.title), x.company, x.where, x.salary].filter(Boolean).join(TEXT_JOB_SEP)
  if (x.tag !== '') {
    line = line + fill({ tpl: TEXT_JOB_TAG, params: { tag: x.tag } })
  }
  if (x.href !== '') {
    line = line + fill({ tpl: TEXT_JOB_HREF, params: { href: x.href } })
  }
  return line
}

/**
 * 职位名的显示:全小写的词首字母大写(Job Bank 的职位名全小写),带大写的词与虚词原样不动。
 *
 * @param title 职位名原文。
 * @returns 显示用的职位名。
 */
function headlineOf(title: string): string {
  return title.replace(TITLE_WORD_RE, capOf)
}

/**
 * 一个全小写的词首字母转大写,虚词不动(replace 传具名函数)。
 *
 * @param word 全小写的词。
 * @returns 显示用的词。
 */
function capOf(word: string): string {
  if (TITLE_SMALL.includes(word)) {
    return word
  }
  return word.charAt(0).toUpperCase() + word.slice(1)
}
