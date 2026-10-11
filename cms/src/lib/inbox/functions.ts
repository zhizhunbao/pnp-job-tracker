/**
 * 收件箱域(lib/inbox)的行为:专属投递邮箱(懒建、子地址标记)、Resend 收信回调(认人 → 取全文 → 对投递 → 记库 →
 * 投递记「雇主回复」→ 转一份到账户邮箱)、站内回信、收件箱清单与「打开」一条投递的往来。
 * 池由调用方注进来(方案 A);投递域的两个纯函数(测试号收件人换算、发件人显示)由 routes 注入,不跨域取。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { count, firstOf, numOrNull, queryRows, SQL, text } from '../db'
import { ERR_NAME, fail } from '../error'
import { INBOX_LOG, log } from '../log'
import { postMail } from '../mail'
import {
  ADDR_IN_ANGLE_RE, ADDR_L, ADDR_R, ALIAS_NAME_FALLBACK, ALIAS_NAME_MAX, ALIAS_RAND_CHARS, ALIAS_RAND_LEN, ALIAS_RE,
  ALIAS_SEP, ALIAS_TRIES, ANGLE_L, APP_TAG, APP_TAG_RE, AT, BEARER_PREFIX, BLANKS_RE, BODY_MAX, DIR_OUT, E_NOT_FOUND,
  EV_RECEIVED, FWD_FOOT, FWD_FROM, FWD_LINK, FWD_SEP, FWD_SUBJECT, FWD_SUBJECT_HEAD, HDR_AUTH, HDR_IN_REPLY_TO,
  HDR_IN_REPLY_TO_LC, HDR_REFERENCES, HDR_REFERENCES_LC, HTML_BR, HTML_BREAK_RE, HTML_DROP_RE, HTML_ENTITIES,
  HTML_ENTITY_RE, HTML_ESC, HTML_ESC_RE, HTML_TAG_RE, INBOUND_DOMAIN, INBOX_PATH_HEAD, LIST_LIMIT, MSG_ID_RE,
  NAME_DROP_RE, NAME_QUOTES_RE, NEWLINE, PLUS, RE_HEAD, RE_RE, RECEIVED_URL, RECV_DUP, RECV_FETCH, RECV_IGNORED,
  RECV_LOOP, RECV_STORED, RECV_UNKNOWN, REPLY_MAX, SITE, TEXT_NONE, TRAIL_SPACE_RE,
} from './constants'
import type {
  AddressIn, AliasDbRow, AliasEnsureIn, AliasFact, AliasOut, AliasUserDbRow, AliasUserFact, CountDbRow, CountOut,
  ForwardIn, ForwardSetIn, ForwardTextIn, HeaderOfIn, IdDbRow, InboxAddressIn, InboxAddressOut, InboxIn, InboxMsgRow,
  InboxMsgRows, InboxOut, InboxReplyRow, InboxRowsIn, InMail, InMailOfIn, LinkAppIn, LinkAppOut, MailHeaders,
  MaybeAliasOut, MaybeId, MaybeRecipientHit, MaybeReplyBody, MsgDbRow, MsgFact, MsgOneDbRow, MsgOneFact, OutAddDbRow,
  OutAddFact, ParsedAddr, RawId, ReadBodyJson, ReceivedEmailFact, ReceivedEmailJson, ReceivedEventJson, ReceivedFact,
  ReceivedDataJson, ReceivedOut, ReceiveIn, ReceiveOut, RecipientHitIn, ReplyBodyJson, SeedDbRow, SendReplyIn,
  SendReplyOut, TextList, TextOfIn, ThreadAppDbRow, ThreadAppRow, ThreadIn, ThreadOut, TimeCell, UserIdIn, UserIn,
  WriteOut,
} from './types'

// =========================================================================
// 1. 投递邮箱
// =========================================================================

/**
 * 投递要用的回复地址(投递发信、投递框「确认」页):收件箱开通了给专属地址(发信时挂这一条投递的标记),没开通给空串
 * (调用方退回账户邮箱)。
 *
 * @param x 连接、用户 id 与挂的投递。
 * @returns 地址或空串。
 */
export async function inboxAddressOf(x: InboxAddressIn): InboxAddressOut {
  if (INBOUND_DOMAIN === TEXT_NONE) {
    return TEXT_NONE
  }
  const a = await ensureAlias({ db: x.db, userId: x.userId })
  return addressOf({ alias: a.alias, appId: x.appId })
}

/**
 * 本人的专属地址,没有就建(懒建:第一次要用时)。名字段 = 投递英文署名(没有用账户邮箱 @ 前那段)转小写只留字母,
 * 后接 5 位随机;撞了别人的换随机段重试,重试到顶抛错(交路由层 500,不拿没建上的地址冒充)。
 *
 * @param x 连接与用户 id。
 * @returns 地址。
 */
export async function ensureAlias(x: AliasEnsureIn): AliasOut {
  const had = await loadAlias(x)
  if (had != null) {
    return had
  }
  let seed = TEXT_NONE
  const row = firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_SEED, params: [x.userId], map: toSeed }))
  if (row != null) {
    seed = row
  }
  const name = aliasNameOf(seed)
  for (let i = 0; i < ALIAS_TRIES; i++) {
    await x.db.query(SQL.INBOX_ALIAS_ADD, [x.userId, name + ALIAS_SEP + aliasRandOf(ALIAS_RAND_LEN)])
    const now = await loadAlias(x)
    if (now != null) {
      return now
    }
  }
  throw fail({ name: ERR_NAME.inboxAlias, msg: name, code: null })
}

/**
 * 本人的专属地址与转发开关。
 *
 * @param x 连接与用户 id。
 * @returns 地址;还没建给 null。
 */
export async function loadAlias(x: UserIn): MaybeAliasOut {
  return firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_ALIAS_ONE, params: [x.userId], map: toAlias }))
}

/**
 * 专属地址库行 → 地址(开关缺省按开)。
 *
 * @param r 库行。
 * @returns 地址。
 */
export function toAlias(r: AliasDbRow): AliasFact {
  return { alias: text(r.alias), forward: r.forward !== false }
}

/**
 * 名字段来源库行 → 串。
 *
 * @param r 库行。
 * @returns 串(没有给空串)。
 */
export function toSeed(r: SeedDbRow): string {
  return text(r.seed)
}

/**
 * 名字段:取 @ 前(是邮箱的话),转小写只留字母,截 12 个;一个字母都没有用替补。
 *
 * @param seed 英文署名或账户邮箱。
 * @returns 名字段。
 */
export function aliasNameOf(seed: string): string {
  let head = seed.trim().toLowerCase()
  const at = head.indexOf(AT)
  if (at > 0) {
    head = head.slice(0, at)
  }
  const name = head.replace(NAME_DROP_RE, TEXT_NONE).slice(0, ALIAS_NAME_MAX)
  if (name === TEXT_NONE) {
    return ALIAS_NAME_FALLBACK
  }
  return name
}

/**
 * 随机段(Web Crypto;字母表 32 个,256 整除 32,不偏)。
 *
 * @param len 几位。
 * @returns 随机段。
 */
export function aliasRandOf(len: number): string {
  let out = TEXT_NONE
  for (const b of crypto.getRandomValues(new Uint8Array(len))) {
    out += ALIAS_RAND_CHARS.charAt(b % ALIAS_RAND_CHARS.length)
  }
  return out
}

/**
 * 完整地址:地址名(+ a<投递行 id>)@ 收信子域。
 *
 * @param x 地址名与挂的投递。
 * @returns 地址。
 */
export function addressOf(x: AddressIn): string {
  let local = x.alias
  if (x.appId != null) {
    local += PLUS + APP_TAG + x.appId
  }
  return local + AT + INBOUND_DOMAIN
}

/**
 * 去掉子地址标记(给本人看的回复邮箱不带 +a123)。
 *
 * @param addr 地址。
 * @returns 地址。
 */
export function baseAddrOf(addr: string): string {
  const at = addr.indexOf(AT)
  const plus = addr.indexOf(PLUS)
  if (plus < 0 || at < 0 || plus > at) {
    return addr
  }
  return addr.slice(0, plus) + addr.slice(at)
}

/**
 * 收件人里认本站地址:域名是收信子域、地址名合形;+ 后面是 a<数字> 就是挂的投递。
 *
 * @param x 收件人与收信子域。
 * @returns 认出的地址;没有给 null。
 */
export function recipientHitOf(x: RecipientHitIn): MaybeRecipientHit {
  if (x.domain === TEXT_NONE) {
    return null
  }
  for (const raw of x.addrs) {
    const a = parseAddr(raw).addr
    if (domainOf(a) !== x.domain) {
      continue
    }
    let alias = a.slice(0, a.lastIndexOf(AT))
    let tag = TEXT_NONE
    const plus = alias.indexOf(PLUS)
    if (plus >= 0) {
      tag = alias.slice(plus + 1)
      alias = alias.slice(0, plus)
    }
    if (ALIAS_RE.test(alias)) {
      return { alias, appId: tagAppIdOf(tag) }
    }
  }
  return null
}

/**
 * 「名字 <地址>」拆成地址(小写)与显示名;没尖括号整段当地址。
 *
 * @param raw 原样。
 * @returns 地址与显示名。
 */
export function parseAddr(raw: string): ParsedAddr {
  const g = ADDR_IN_ANGLE_RE.exec(raw)
  if (g == null || g.groups == null || g.groups.addr == null) {
    return { addr: raw.trim().toLowerCase(), name: TEXT_NONE }
  }
  return { addr: g.groups.addr.toLowerCase(), name: raw.slice(0, raw.indexOf(ANGLE_L)).replace(NAME_QUOTES_RE, TEXT_NONE) }
}

/**
 * 地址的域名段。
 *
 * @param addr 地址(小写)。
 * @returns 域名;不像地址给空串。
 */
export function domainOf(addr: string): string {
  const at = addr.lastIndexOf(AT)
  if (at <= 0) {
    return TEXT_NONE
  }
  return addr.slice(at + 1).toLowerCase()
}

/**
 * 子地址标记 → 投递行 id。
 *
 * @param tag + 后面那段。
 * @returns 投递行 id;不是 a<数字> 给 null。
 */
export function tagAppIdOf(tag: string): MaybeId {
  const g = APP_TAG_RE.exec(tag)
  if (g == null || g.groups == null || g.groups.id == null) {
    return null
  }
  return Number(g.groups.id)
}

// =========================================================================
// 2. 收信
// =========================================================================

/**
 * Resend 收信回调(已验签):认人 → 取全文 → 对投递 → 记库 → 投递记「雇主回复」→ 开着转发就转一份到账户邮箱。
 * 不是收信事件、不是本站地址、发件人是本站收信子域(回环)、地址不是任何人的,都不记;同一封重放只记一次。
 *
 * @param x 连接、回调原始体与转发收件人换算。
 * @returns 结果(RECV_* 之一);取不到全文 = fetch(调用方回 502 让 Resend 重试)。
 */
export async function receiveInbound(x: ReceiveIn): ReceiveOut {
  const ev = eventOf(x.body)
  if (ev.type !== EV_RECEIVED || ev.data == null) {
    return RECV_IGNORED
  }
  const d = toReceived(ev.data)
  const hit = recipientHitOf({ addrs: d.addrs, domain: INBOUND_DOMAIN })
  if (hit == null || d.emailId === TEXT_NONE) {
    return RECV_IGNORED
  }
  const from = parseAddr(d.from)
  if (domainOf(from.addr) === INBOUND_DOMAIN) {
    return RECV_LOOP
  }
  const user = firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_ALIAS_USER, params: [hit.alias], map: toAliasUser }))
  if (user == null) {
    return RECV_UNKNOWN
  }
  const full = await fetchReceived(d.emailId)
  if (full == null) {
    return RECV_FETCH
  }
  const appId = await linkAppOf({ db: x.db, userId: user.userId, tagAppId: hit.appId, refs: full.refs, from: from.addr })
  const mail = inMailOf({ d, full, user, from, alias: hit.alias, appId })
  const id = firstOf(await queryRows({
    db: x.db, sql: SQL.INBOX_IN_ADD,
    params: [
      user.userId, mail.appId, from.addr, from.name, mail.to, mail.subject, mail.text, mail.messageId, mail.inReplyTo,
      mail.inboundId,
    ],
    map: toId,
  }))
  if (id == null) {
    return RECV_DUP
  }
  if (mail.appId != null) {
    await x.db.query(SQL.INBOX_APP_REPLIED, [mail.appId, user.userId])
  }
  if (user.forward) {
    await forwardIn({ db: x.db, mail, msgId: id, mailTo: x.mailTo })
  }
  return RECV_STORED
}

/**
 * 回调体解析(验过签的体也可能不是 JSON:当不认得的事件)。
 *
 * @param body 原始体。
 * @returns 回调体;解析不了给空对象。
 */
export function eventOf(body: string): ReceivedEventJson {
  try {
    return JSON.parse(body) as ReceivedEventJson
  } catch {
    return {}
  }
}

/**
 * 回调 data 段 → 洗净(行构造器:收件人 + 抄送并成一张清单,本人地址可能在抄送里;缺席的格按空串)。
 *
 * @param d 回调 data 段。
 * @returns 洗净的元信息。
 */
export function toReceived(d: ReceivedDataJson): ReceivedFact {
  const addrs: TextList = []
  if (Array.isArray(d.to)) {
    addrs.push(...d.to)
  }
  if (Array.isArray(d.cc)) {
    addrs.push(...d.cc)
  }
  return {
    emailId: text(d.email_id), from: text(d.from), addrs, subject: text(d.subject), messageId: text(d.message_id),
  }
}

/**
 * 认人库行 → 人。
 *
 * @param r 库行。
 * @returns 人。
 */
export function toAliasUser(r: AliasUserDbRow): AliasUserFact {
  return { userId: count(r.user_id), forward: r.forward !== false, email: text(r.email) }
}

/**
 * 取一封收到的信的全文(Resend 收信接口;回调里只有元信息)。没配发信密钥、HTTP 失败、网络异常都留痕给 null。
 *
 * @param id Resend 收信 id。
 * @returns 全文(洗净);取不到给 null。
 */
export async function fetchReceived(id: string): ReceivedOut {
  const key = process.env.RESEND_API_KEY
  if (key == null || key === TEXT_NONE) {
    log({ tag: INBOX_LOG.tag, text: INBOX_LOG.noKey })
    return null
  }
  try {
    const r = await fetch(RECEIVED_URL + encodeURIComponent(id), { headers: { [HDR_AUTH]: BEARER_PREFIX + key } })
    if (r.ok === false) {
      log({ tag: INBOX_LOG.tag, text: INBOX_LOG.fetchFailed + r.status })
      return null
    }
    return toReceivedEmail(await r.json() as ReceivedEmailJson)
  } catch (e) {
    log({ tag: INBOX_LOG.tag, text: INBOX_LOG.fetchFailed + String(e) })
    return null
  }
}

/**
 * 全文 → 洗净(行构造器):标题、纯文本正文(没有纯文本把 HTML 去标签;不存、不渲外来 HTML)、Message-ID、
 * In-Reply-To 与这一封回的是哪几封(In-Reply-To + References 里的 Message-ID)。
 *
 * @param full 全文。
 * @returns 洗净的全文。
 */
export function toReceivedEmail(full: ReceivedEmailJson): ReceivedEmailFact {
  const inReplyTo = headerOf({ full, key: HDR_IN_REPLY_TO_LC })
  const refs = refsOf(inReplyTo + NEWLINE + headerOf({ full, key: HDR_REFERENCES_LC }))
  return {
    subject: text(full.subject), text: textOf({ text: text(full.text), html: text(full.html) }),
    messageId: text(full.message_id), inReplyTo, refs,
  }
}

/**
 * 全文邮件头里的一个(数组形拼成一行)。
 *
 * @param x 全文与小写头名。
 * @returns 值;没有给空串。
 */
export function headerOf(x: HeaderOfIn): string {
  if (x.full.headers == null) {
    return TEXT_NONE
  }
  const v = x.full.headers[x.key]
  if (Array.isArray(v)) {
    return v.join(NEWLINE)
  }
  if (typeof v === 'string') {
    return v
  }
  return TEXT_NONE
}

/**
 * 从邮件头里抠 Message-ID。
 *
 * @param s In-Reply-To 与 References 拼起来的一段。
 * @returns Message-ID 清单(带尖括号)。
 */
export function refsOf(s: string): TextList {
  const m = s.match(MSG_ID_RE)
  if (m == null) {
    return []
  }
  return m
}

/**
 * 正文:有纯文本用纯文本,没有就把 HTML 去标签;截到上限。
 *
 * @param x 两种正文。
 * @returns 纯文本。
 */
export function textOf(x: TextOfIn): string {
  if (x.text.trim() !== TEXT_NONE) {
    return x.text.slice(0, BODY_MAX)
  }
  return htmlTextOf(x.html).slice(0, BODY_MAX)
}

/**
 * HTML → 纯文本:丢样式脚本、块尾换行、去标签、还原几个常见实体、压空行。
 *
 * @param html HTML。
 * @returns 纯文本。
 */
export function htmlTextOf(html: string): string {
  return html.replace(HTML_DROP_RE, TEXT_NONE).replace(HTML_BREAK_RE, NEWLINE).replace(HTML_TAG_RE, TEXT_NONE)
    .replace(HTML_ENTITY_RE, entityOf).replace(TRAIL_SPACE_RE, NEWLINE).replace(BLANKS_RE, NEWLINE + NEWLINE).trim()
}

/**
 * 实体 → 字(replace 的回调;签名由 String.prototype.replace 定死,只读第一参)。
 *
 * @param m 匹配到的实体。
 * @returns 字;表里没有原样。
 */
export function entityOf(m: string): string {
  const ch = HTML_ENTITIES[m]
  if (ch == null) {
    return m
  }
  return ch
}

/**
 * 对投递(尽力而为,三档依次):① 子地址标记里的投递行是本人的;② 回的那一封在本人收件箱里且挂着投递;
 * ③ 发件人就是本人投过的雇主邮箱(最近那一封)。都对不上给 null(信照收,不挂投递)。
 *
 * @param x 连接、用户 id、标记、Message-ID 与发件地址。
 * @returns 投递行 id 或 null。
 */
export async function linkAppOf(x: LinkAppIn): LinkAppOut {
  if (x.tagAppId != null) {
    const tagged = firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_APP_TAG, params: [x.tagAppId, x.userId], map: toId }))
    if (tagged != null) {
      return tagged
    }
  }
  if (x.refs.length > 0) {
    const threaded = firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_APP_THREAD, params: [x.userId, x.refs], map: toId }))
    if (threaded != null) {
      return threaded
    }
  }
  if (x.from === TEXT_NONE) {
    return null
  }
  return firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_APP_SENDER, params: [x.userId, x.from], map: toId }))
}

/**
 * id 库行 → id。
 *
 * @param r 库行。
 * @returns id。
 */
export function toId(r: IdDbRow): number {
  return count(r.id)
}

/**
 * 一封收到的信(记库与转发用):标题、Message-ID 以全文为准,回调元信息兜底。
 *
 * @param x 洗净的元信息与全文、人、发件人、地址名与对上的投递。
 * @returns 一封信。
 */
export function inMailOf(x: InMailOfIn): InMail {
  let subject = x.full.subject
  if (subject === TEXT_NONE) {
    subject = x.d.subject
  }
  let messageId = x.full.messageId
  if (messageId === TEXT_NONE) {
    messageId = x.d.messageId
  }
  return {
    user: x.user, appId: x.appId, from: x.from, to: x.alias + AT + INBOUND_DOMAIN, subject, text: x.full.text, messageId,
    inReplyTo: x.full.inReplyTo, inboundId: x.d.emailId,
  }
}

/**
 * 转一份到账户邮箱:回复地址设成原发件人(在邮箱里直接回就是回给雇主);账户邮箱本身在收信子域上不转(防回环)。
 * 发出去了记转发时刻;没发出去 postMail 已留痕,信照样在收件箱里。
 *
 * @param x 连接、那一封、信 id 与收件人换算。
 * @returns 无。
 */
export async function forwardIn(x: ForwardIn): WriteOut {
  const to = x.mail.user.email
  if (to === TEXT_NONE || domainOf(to) === INBOUND_DOMAIN) {
    return
  }
  const body = forwardTextOf({ mail: x.mail, msgId: x.msgId })
  const r = await postMail({
    to: x.mailTo({ userEmail: to, employerEmail: to }), subject: FWD_SUBJECT_HEAD + x.mail.subject, html: htmlOf(body),
    text: body, from: TEXT_NONE, replyTo: x.mail.from.addr, attachments: [], idemKey: TEXT_NONE, headers: {},
  })
  if (r.ok) {
    await x.db.query(SQL.INBOX_FORWARDED, [x.msgId])
  }
}

/**
 * 转发信正文:分隔行、原发件人、原标题、原文、去站内看的链接、为什么收到。
 *
 * @param x 那一封与信 id。
 * @returns 纯文本。
 */
export function forwardTextOf(x: ForwardTextIn): string {
  return [
    FWD_SEP,
    FWD_FROM + senderLineOf(x.mail.from),
    FWD_SUBJECT + x.mail.subject,
    TEXT_NONE,
    x.mail.text,
    TEXT_NONE,
    FWD_LINK + SITE + INBOX_PATH_HEAD + x.msgId,
    FWD_FOOT,
  ].join(NEWLINE)
}

/**
 * 发件人一行:有名字写「名字 <地址>」,没有只写地址。
 *
 * @param p 发件人。
 * @returns 一行。
 */
export function senderLineOf(p: ParsedAddr): string {
  if (p.name === TEXT_NONE) {
    return p.addr
  }
  return p.name + ADDR_L + p.addr + ADDR_R
}

/**
 * 纯文本 → HTML 正文(转义 + 换行)。
 *
 * @param s 纯文本。
 * @returns HTML。
 */
export function htmlOf(s: string): string {
  return s.replace(HTML_ESC_RE, escOf).split(NEWLINE).join(HTML_BR)
}

/**
 * 一个要转义的字 → 实体(replace 的回调;签名由 String.prototype.replace 定死)。
 *
 * @param ch 字。
 * @returns 实体。
 */
export function escOf(ch: string): string {
  const e = HTML_ESC[ch]
  if (e == null) {
    return ch
  }
  return e
}

// =========================================================================
// 3. 回信
// =========================================================================

/**
 * 站内回信:只回本人收到的那一封;发件人 = 「署名 via Offer2PR」,回复地址 = 本人专属地址(挂同一条投递的标记;
 * 收件箱没开通退回账户邮箱),带 In-Reply-To / References 接上那一串;发出去了记进同一串(本人写的不算未读)。
 *
 * @param x 连接、本人、回哪一封、正文与两个注入的换算。
 * @returns 发没发出去、原因与记进去的那一封。
 */
export async function sendReply(x: SendReplyIn): SendReplyOut {
  const m = firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_MSG_ONE, params: [x.userId, x.id], map: toMsgOne }))
  if (m == null) {
    return { ok: false, why: E_NOT_FOUND, reply: null }
  }
  const subject = reSubjectOf(m.subject)
  let from = TEXT_NONE
  if (m.senderName !== TEXT_NONE) {
    from = x.fromOf(m.senderName)
  }
  let replyTo = x.userEmail
  if (INBOUND_DOMAIN !== TEXT_NONE) {
    replyTo = addressOf({ alias: m.alias, appId: m.appId })
  }
  const headers: MailHeaders = {}
  if (m.messageId !== TEXT_NONE) {
    headers[HDR_IN_REPLY_TO] = m.messageId
    headers[HDR_REFERENCES] = m.messageId
  }
  const sent = await postMail({
    to: x.mailTo({ userEmail: x.userEmail, employerEmail: m.fromAddr }), subject, html: htmlOf(x.text), text: x.text,
    from, replyTo, attachments: [], idemKey: TEXT_NONE, headers,
  })
  if (sent.ok === false) {
    return { ok: false, why: sent.why, reply: null }
  }
  const row = firstOf(await queryRows({
    db: x.db, sql: SQL.INBOX_OUT_ADD,
    params: [x.userId, m.appId, baseAddrOf(replyTo), m.fromAddr, subject, x.text, sent.id, m.id], map: toOutAdd,
  }))
  if (row == null) {
    return { ok: true, why: TEXT_NONE, reply: null }
  }
  return { ok: true, why: TEXT_NONE, reply: { id: row.id, text: x.text, at: row.at } }
}

/**
 * 要回的那一封库行 → 洗净。
 *
 * @param r 库行。
 * @returns 那一封。
 */
export function toMsgOne(r: MsgOneDbRow): MsgOneFact {
  return {
    id: count(r.id), appId: numOrNull(r.application_id), fromAddr: text(r.from_addr), subject: text(r.subject),
    messageId: text(r.message_id), alias: text(r.alias), senderName: text(r.sender_name),
  }
}

/**
 * 记回出去的信回行 → 洗净。
 *
 * @param r 库行。
 * @returns id 与时刻。
 */
export function toOutAdd(r: OutAddDbRow): OutAddFact {
  return { id: count(r.id), at: isoOf(r.received_at) }
}

/**
 * 回信标题:已经是 Re: 开头的不再叠。
 *
 * @param s 原标题。
 * @returns 回信标题。
 */
export function reSubjectOf(s: string): string {
  if (RE_RE.test(s.trim())) {
    return s
  }
  return RE_HEAD + s
}

// =========================================================================
// 4. 清单与一条投递
// =========================================================================

/**
 * 收件箱:专属地址(开通了才建)、转发开关、账户邮箱与收到的信(回出去的挂在下面)。
 *
 * @param x 连接、用户 id 与账户邮箱。
 * @returns 回包。
 */
export async function loadInbox(x: InboxIn): InboxOut {
  let address = TEXT_NONE
  let forward = true
  if (INBOUND_DOMAIN !== TEXT_NONE) {
    const a = await ensureAlias({ db: x.db, userId: x.userId })
    address = addressOf({ alias: a.alias, appId: null })
    forward = a.forward
  } else {
    const a = await loadAlias({ db: x.db, userId: x.userId })
    if (a != null) {
      forward = a.forward
    }
  }
  const facts = await queryRows({ db: x.db, sql: SQL.INBOX_LIST, params: [x.userId, LIST_LIMIT], map: toMsg })
  return { address, forward, account: x.email, items: inboxRowsOf({ facts, desc: true }) }
}

/**
 * 收件箱一封库行 → 洗净。
 *
 * @param r 库行。
 * @returns 一封。
 */
export function toMsg(r: MsgDbRow): MsgFact {
  return {
    id: count(r.id), appId: numOrNull(r.application_id), out: r.direction === DIR_OUT, fromAddr: text(r.from_addr),
    fromName: text(r.from_name), subject: text(r.subject), text: text(r.body_text), at: isoOf(r.received_at),
    read: r.read_at != null, replyOf: numOrNull(r.reply_of), jobTitle: text(r.job_title),
  }
}

/**
 * 两个方向的信 → 收件箱清单:收到的一封一行(原顺序),回出去的挂在它回的那一封下面(先发的在前)。
 *
 * @param x 信与原顺序。
 * @returns 清单。
 */
export function inboxRowsOf(x: InboxRowsIn): InboxMsgRows {
  const replies = new Map<number, InboxReplyRow[]>()
  for (const f of x.facts) {
    if (f.out === false || f.replyOf == null) {
      continue
    }
    let list = replies.get(f.replyOf)
    if (list == null) {
      list = []
      replies.set(f.replyOf, list)
    }
    const r = { id: f.id, text: f.text, at: f.at }
    if (x.desc) {
      list.unshift(r)
    } else {
      list.push(r)
    }
  }
  const out: InboxMsgRow[] = []
  for (const f of x.facts) {
    if (f.out) {
      continue
    }
    let mine = replies.get(f.id)
    if (mine == null) {
      mine = []
    }
    out.push({
      id: f.id, appId: f.appId, fromAddr: f.fromAddr, fromName: f.fromName, subject: f.subject, text: f.text, at: f.at,
      read: f.read, jobTitle: f.jobTitle, replies: mine,
    })
  }
  return out
}

/**
 * 本人几封没读的。
 *
 * @param x 连接与用户 id。
 * @returns 封数。
 */
export async function loadUnread(x: UserIn): CountOut {
  const n = firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_UNREAD, params: [x.userId], map: toCount }))
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 计数库行 → 数。
 *
 * @param r 库行。
 * @returns 数。
 */
export function toCount(r: CountDbRow): number {
  return count(r.n)
}

/**
 * 读了一封(只认本人的;别人的 id 改不动)。
 *
 * @param x 连接、用户 id 与信 id。
 * @returns 无。
 */
export async function markRead(x: UserIdIn): WriteOut {
  await x.db.query(SQL.INBOX_READ, [x.userId, x.id])
}

/**
 * 改转发开关(还没建地址先建)。
 *
 * @param x 连接、用户 id 与开关。
 * @returns 无。
 */
export async function saveForward(x: ForwardSetIn): WriteOut {
  await ensureAlias({ db: x.db, userId: x.userId })
  await x.db.query(SQL.INBOX_FORWARD_SET, [x.userId, x.forward])
}

/**
 * 「打开」一条投递:发出那一封、挂在上面的往来信、转发开关与账户邮箱。
 *
 * @param x 连接、用户 id、账户邮箱与投递行 id。
 * @returns 回包;不是本人的 / 还没发给 null。
 */
export async function loadThread(x: ThreadIn): ThreadOut {
  const app = firstOf(await queryRows({ db: x.db, sql: SQL.INBOX_THREAD_APP, params: [x.userId, x.appId], map: toThreadApp }))
  if (app == null) {
    return null
  }
  const facts = await queryRows({ db: x.db, sql: SQL.INBOX_THREAD_MSGS, params: [x.userId, x.appId], map: toMsg })
  const a = await loadAlias({ db: x.db, userId: x.userId })
  let forward = true
  if (a != null) {
    forward = a.forward
  }
  return { app, messages: inboxRowsOf({ facts, desc: false }), forward, account: x.email }
}

/**
 * 发出那一封的库行 → 对外(回复邮箱去掉子地址标记)。
 *
 * @param r 库行。
 * @returns 那一封。
 */
export function toThreadApp(r: ThreadAppDbRow): ThreadAppRow {
  return {
    id: count(r.id), company: text(r.company), replyTo: baseAddrOf(text(r.reply_to)), resumeFile: text(r.resume_file),
    coverFile: text(r.cover_file), subject: text(r.subject), body: text(r.body_text), sentAt: isoOf(r.sent_at),
    senderName: text(r.sender_name),
  }
}

/**
 * 时刻格 → ISO 串(空折空串)。
 *
 * @param x 库回的时刻格。
 * @returns ISO 串。
 */
function isoOf(x: TimeCell): string {
  if (x == null) {
    return TEXT_NONE
  }
  if (x instanceof Date) {
    return x.toISOString()
  }
  return x
}

// =========================================================================
// 5. 请求体收窄
// =========================================================================

/**
 * 读了一封的请求体 → 信 id。
 *
 * @param raw 请求体原样。
 * @returns 信 id;不合形给 null。
 */
export function toReadId(raw: ReadBodyJson): MaybeId {
  if (raw.id == null) {
    return null
  }
  return idOf(raw.id)
}

/**
 * 回信请求体收窄:信 id 正整数、正文去两头空白后 1 到 1 万字。
 *
 * @param raw 请求体原样。
 * @returns 收窄后的请求体或 null。
 */
export function toReplyBody(raw: ReplyBodyJson): MaybeReplyBody {
  if (raw.id == null || typeof raw.text !== 'string') {
    return null
  }
  const id = idOf(raw.id)
  const body = raw.text.trim()
  if (id == null || body === TEXT_NONE || body.length > REPLY_MAX) {
    return null
  }
  return { id, text: body }
}

/**
 * 正整数 id(请求体或查询参数里的)。
 *
 * @param raw 原样。
 * @returns id;不合形给 null。
 */
export function idOf(raw: RawId): MaybeId {
  if (raw == null) {
    return null
  }
  const n = Number(raw)
  if (Number.isInteger(n) === false || n <= 0) {
    return null
  }
  return n
}
