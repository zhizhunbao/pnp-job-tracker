/**
 * 对话助手的行为:照清单拼站内链接、拼给模型的提示与正文、移民话题闸与链接收口、限流键、探活缓存、串号与留痕、一轮编排。
 * 模型、收 JSON、探活都是路由注进来的函数(方案 A:本文件不碰模型域,也不连库)。
 * 🔴 三条红线都在这里用代码收口,不靠提示词:移民话题不给正文(提问命中闸就不调模型;模型的回复命中也改成不答);
 * 正文里一条链接都不留,链接只由 linkOf 照页面清单与参数白名单拼;回复里出现系统提示原文就整条不用。
 *
 * @author Frank
 * @time 2026-11-14 10:00:00
 */

import { createHash } from 'node:crypto'
import { SQL } from '../db'
import { ALL_PROVS, PROV_NAMES } from '../location'
import { ASSISTANT_LOG, log } from '../log'
import {
  ADVICE_RE, ANSWER_MAX, DOMAIN_RE, ELIGIBILITY_RE, EMPTY_PAREN_RE, ERR_LLM, ERR_OFF, ERR_REFUSE, GAP_RE, HASH_HEX, HASH_SHA256,
  HISTORY_MSGS_MAX, IMMIGRATION_RE, IP_DAILY, IP_MINUTE, JOB_ATTR_RE, JOB_SEEK_RE, KEY_DAILY, KEY_MINUTE, KEY_SEP, KIND,
  LANG_FALLBACK, LANGS, LEAK_LINE_MIN,
  LINE_ASSISTANT, LINE_USER, LINKS_MAX, MD_LINK_KEEP, MD_LINK_RE, MINUTE_MS, NL, OFF_PAGES, P_PROV, P_Q, PAGE_PARAMS,
  PAGE_ROUTE, PATH_RE, PUNCT_KEEP, Q_PARAM_MAX, Q_STRIP_RE, QUERY_AND, QUERY_EQ, QUERY_HEAD, READY_TTL_MS, REFUSE_PAGES,
  ROLE, SAY_MAX, SPACE, SPACE_PUNCT_RE, SPACES_RE, TEXT_MAX, TEXT_NONE, THREAD_ID_LEN, THREAD_SEED_LEN, TURN_MAX, URL_RE,
} from './constants'
import {
  PAGE_BULLET, PAGE_DESC, SYSTEM_HEAD, USER_HISTORY_HEAD, USER_HISTORY_NONE, USER_LANG_HEAD, USER_MESSAGE_HEAD, USER_TAIL,
} from './prompts'
import { CACHE } from './variables'
import type {
  AdviceIn, ChatInput, FixedIn, GetReadyIn, GetReadyOut, Kind, Lang, LeakedIn, LimitPairs, LimitsIn, Link, Links, LinksOfIn, MaybeChatBody,
  MaybeLink, MaybeText, MaybeWirePick, ModelReply, PagePicksIn, Pick, Picks, RecordTurnIn, RecordTurnOut, ReplyDone, ReplyIn, SettleIn,
  Settled, ThreadIdIn, ToModelReplyIn, Turn, Turns, UserOfIn, WireReply, WireTurns,
} from './types'

// =========================================================================
// 1. 站内页面清单
// =========================================================================

/**
 * 一组挑的页 → 一组链接:不在清单里的丢,同一页只留第一条,最多 LINKS_MAX 条。
 *
 * @param input 挑的页。
 * @returns 链接。
 */
export function linksOf(input: LinksOfIn): Links {
  const out: Link[] = []
  const seen: string[] = []
  for (const p of input.picks) {
    const link = linkOf(p)
    if (link == null || seen.includes(link.key)) {
      continue
    }
    seen.push(link.key)
    out.push(link)
    if (out.length >= LINKS_MAX) {
      break
    }
  }
  return out
}

/**
 * 挑的一页 → 站内地址:页面键必须在清单里;参数只带这页登记过的,省要是省码,关键词清洗截长后转义。
 *
 * @param pick 挑的一页。
 * @returns 链接;页面键不在清单里是 null。
 */
export function linkOf(pick: Pick): MaybeLink {
  if (Object.hasOwn(PAGE_ROUTE, pick.page) === false) {
    return null
  }
  const route = String(PAGE_ROUTE[pick.page])
  let allowed: string[] = []
  if (Object.hasOwn(PAGE_PARAMS, pick.page)) {
    const listed = PAGE_PARAMS[pick.page]
    if (listed != null) {
      allowed = listed
    }
  }
  const parts: string[] = []
  const prov = provCodeOf(pick.prov)
  if (allowed.includes(P_PROV) && prov !== TEXT_NONE) {
    parts.push(P_PROV + QUERY_EQ + prov)
  }
  const q = keywordOf(pick.q)
  if (allowed.includes(P_Q) && q !== TEXT_NONE) {
    parts.push(P_Q + QUERY_EQ + encodeURIComponent(q))
  }
  if (parts.length === 0) {
    return { key: pick.page, url: route }
  }
  let head = QUERY_HEAD
  if (route.includes(QUERY_HEAD)) {
    head = QUERY_AND
  }
  return { key: pick.page, url: route + head + parts.join(QUERY_AND) }
}

/**
 * 省的写法 → 两位省码:认省码与英文全名,其余给空串。
 *
 * @param raw 省的原文。
 * @returns 省码;认不出是空串。
 */
export function provCodeOf(raw: string): string {
  const t = raw.trim()
  const code = t.toUpperCase()
  if (ALL_PROVS.has(code)) {
    return code
  }
  const name = t.toLowerCase()
  for (const [k, v] of Object.entries(PROV_NAMES)) {
    if (v.toLowerCase() === name) {
      return k
    }
  }
  return TEXT_NONE
}

/**
 * 关键词清洗:不认的字符换成空格,连续空白并成一个,截长。
 *
 * @param raw 关键词原文。
 * @returns 清洗后的关键词;没有是空串。
 */
function keywordOf(raw: string): string {
  return raw.replace(Q_STRIP_RE, SPACE).replace(SPACES_RE, SPACE).trim().slice(0, Q_PARAM_MAX).trim()
}

/**
 * 一句话里提到的省(英文全名)→ 省码。
 *
 * @param text 一句话。
 * @returns 省码;没提到是空串。
 */
export function provOf(text: string): string {
  const low = text.toLowerCase()
  for (const [k, v] of Object.entries(PROV_NAMES)) {
    if (low.includes(v.toLowerCase())) {
      return k
    }
  }
  return TEXT_NONE
}

/**
 * 一组页面键 → 一组挑的页,都带同一个省。
 *
 * @param input 页面键与省码。
 * @returns 挑的页。
 */
function pagePicksOf(input: PagePicksIn): Picks {
  const out: Pick[] = []
  for (const page of input.pages) {
    out.push({ page: page, prov: input.prov, q: TEXT_NONE })
  }
  return out
}

// =========================================================================
// 2. 类别与模型
// =========================================================================

/**
 * 系统提示:规则 + 页面清单(每页一行说明)。
 *
 * @returns 系统提示全文。
 */
export function systemOf(): string {
  const lines: string[] = [SYSTEM_HEAD]
  for (const key of Object.keys(PAGE_ROUTE)) {
    lines.push(PAGE_BULLET + String(PAGE_DESC[key]))
  }
  return lines.join(NL)
}

/**
 * 本轮发给模型的正文:界面语种、之前几轮、本轮提问。朋友网关把多条消息并成一段,所以之前几轮在这里排成对话稿。
 *
 * @param input 本轮提问、语种与之前几轮。
 * @returns 正文。
 */
export function userOf(input: UserOfIn): string {
  const lines: string[] = [USER_LANG_HEAD + input.lang, TEXT_NONE, USER_HISTORY_HEAD]
  if (input.history.length === 0) {
    lines.push(USER_HISTORY_NONE)
  }
  for (const h of input.history) {
    if (h.role === ROLE.user) {
      lines.push(LINE_USER + h.content)
    } else {
      lines.push(LINE_ASSISTANT + h.content)
    }
  }
  lines.push(TEXT_NONE, USER_MESSAGE_HEAD, input.text, TEXT_NONE, USER_TAIL)
  return lines.join(NL)
}

// =========================================================================
// 4. 移民话题闸与链接收口
// =========================================================================

/**
 * 是不是在找带 LMIA、签证或担保的职位、雇主(求职问题,交给模型答):
 * 提问里的移民字样只有「职位属性」那几个(拿掉后不再命中移民话题),句子在找职位或雇主,而且不是在问自己能不能、要什么条件。
 * 2026-11-14 Frank「开始做吧」「照表做」:这类原先被正则直接拒掉。
 *
 * @param text 提问。
 * @returns 是找这类职位或雇主。
 */
export function isSponsoredJobSearch(text: string): boolean {
  if (isImmigration(text) === false) {
    return false
  }
  if (isImmigration(text.replace(JOB_ATTR_RE, SPACE))) {
    return false
  }
  return JOB_SEEK_RE.test(text) && ELIGIBILITY_RE.test(text) === false
}

/**
 * 模型写的正文是不是在谈移民。平常:命中移民话题的任何说法就算。
 * 找带 LMIA 或担保的职位、雇主那一类:正文里提到这几个字不算(要说「去职位板看」绕不开),
 * 但出现指向明确的移民说法,或在说谁够格、保证办得下来,仍然算。
 *
 * @param input 删过链接的正文与这一轮是不是找这类职位。
 * @returns 在谈移民。
 */
export function isAdvice(input: AdviceIn): boolean {
  if (input.seek === false) {
    return isImmigration(input.say)
  }
  return isImmigration(input.say.replace(JOB_ATTR_RE, SPACE)) || ADVICE_RE.test(input.say)
}

/**
 * 是不是移民话题(提问与模型的回复都过它)。
 *
 * @param text 一段话。
 * @returns 命中移民话题的说法。
 */
export function isImmigration(text: string): boolean {
  return IMMIGRATION_RE.test(text)
}

/**
 * 正文里的链接全删:Markdown 链接留字删网址,网址、域名、单独写出来的路径直接删,再收拾删完留下的空括号与多余空格。
 *
 * @param say 模型写的正文。
 * @returns 不含任何链接的正文(已截长)。
 */
export function cleanSay(say: string): string {
  return say
    .replace(MD_LINK_RE, MD_LINK_KEEP)
    .replace(URL_RE, TEXT_NONE)
    .replace(DOMAIN_RE, TEXT_NONE)
    .replace(PATH_RE, TEXT_NONE)
    .replace(EMPTY_PAREN_RE, TEXT_NONE)
    .replace(GAP_RE, SPACE)
    .replace(SPACE_PUNCT_RE, PUNCT_KEEP)
    .trim()
    .slice(0, SAY_MAX)
}

/**
 * 回复里有没有系统提示的原文:提示里够长的任何一行原样出现就算。
 *
 * @param input 回复正文与这一轮的系统提示。
 * @returns 抖出来了。
 */
export function leaked(input: LeakedIn): boolean {
  const say = input.say.toLowerCase()
  for (const line of input.system.split(NL)) {
    const t = line.trim().toLowerCase()
    if (t.length >= LEAK_LINE_MIN && say.includes(t)) {
      return true
    }
  }
  return false
}

// =========================================================================
// 5. 限流
// =========================================================================

/**
 * 这个 IP 这一刻要过的两道配额位:每天一道、每分钟一道(分钟序号进键,过一分钟自然换键)。
 *
 * @param input 来访 IP 与现在的时刻。
 * @returns 两个配额位。
 */
export function limitsOf(input: LimitsIn): LimitPairs {
  const minute = Math.floor(input.nowMs / MINUTE_MS)
  return [
    [KEY_DAILY + input.ip, IP_DAILY],
    [KEY_MINUTE + input.ip + KEY_SEP + String(minute), IP_MINUTE],
  ]
}

// =========================================================================
// 6. 探活
// =========================================================================

/**
 * 助手现在能不能用:READY_TTL_MS 之内用上一次的结果,过了才真去探一次盒子。
 *
 * @param input 探活函数与现在的时刻。
 * @returns 能不能用。
 */
export async function getReady(input: GetReadyIn): GetReadyOut {
  if (CACHE.readyAt > 0 && input.nowMs - CACHE.readyAt < READY_TTL_MS) {
    return { ready: CACHE.ready }
  }
  const r = await input.probe()
  CACHE.ready = r.ok
  CACHE.readyAt = input.nowMs
  return { ready: r.ok }
}

// =========================================================================
// 7. 串号与留痕
// =========================================================================

/**
 * 一段对话的串号 = 首轮提问文本的哈希(沿 chat_logs 口径)。不用 IP、UA、会话:那三样都指向人。
 *
 * @param input 本轮提问与之前几轮。
 * @returns 16 位十六进制串。
 */
export function threadIdOf(input: ThreadIdIn): string {
  let first = input.text
  for (const h of input.history) {
    if (h.role === ROLE.user) {
      first = h.content
      break
    }
  }
  return createHash(HASH_SHA256).update(first.trim().slice(0, THREAD_SEED_LEN)).digest(HASH_HEX).slice(0, THREAD_ID_LEN)
}

/**
 * 这一段里的第几轮:之前几轮里访客的消息数 + 1。
 *
 * @param history 之前几轮。
 * @returns 轮次(1 起)。
 */
export function turnOf(history: Turns): number {
  let n = 0
  for (const h of history) {
    if (h.role === ROLE.user) {
      n = n + 1
    }
  }
  return n + 1
}

/**
 * 往 chat_logs 写一行。留痕是副产品:写库失败只留一行日志,答复不受影响。
 *
 * @param input 一行里本域写的八格。
 * @returns 无。
 */
export async function recordTurn(input: RecordTurnIn): RecordTurnOut {
  let answer = input.answer
  if (answer != null) {
    answer = answer.slice(0, ANSWER_MAX)
  }
  try {
    await input.db.query(SQL.ASSISTANT_LOG_INSERT, [
      input.thread, input.turn, input.lang, input.question.slice(0, TEXT_MAX), answer, input.degraded, input.err,
      Math.round(input.ms),
    ])
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: ASSISTANT_LOG.tag, text: ASSISTANT_LOG.logFailed + why })
  }
}

// =========================================================================
// 8. 一轮编排
// =========================================================================

/**
 * 一轮:提问命中移民话题就不调模型直接给页面;否则调模型 → 验形 → 收口;最后留痕。
 * 2026-11-14:命中的只是 LMIA、签证、担保这几个字、句子又在找职位或雇主的,照常调模型(isSponsoredJobSearch)。
 * 模型没答上来回 failed(路由回 502),照样记一行。
 *
 * @param input 库、校验后的输入与两个注入函数。
 * @returns 一轮的结果。
 */
export async function reply(input: ReplyIn): ReplyDone {
  const t0 = Date.now()
  const x = input.input
  const thread = threadIdOf({ text: x.text, history: x.history })
  const turn = turnOf(x.history)
  const prov = provOf(x.text)
  const seek = isSponsoredJobSearch(x.text)
  let settled: Settled = fixedOf({ kind: KIND.refuse, prov: prov, degraded: false })
  if (isImmigration(x.text) === false || seek) {
    const system = systemOf()
    let raw = TEXT_NONE
    try {
      raw = await input.complete({
        messages: [
          { role: ROLE.system, content: system },
          { role: ROLE.user, content: userOf({ text: x.text, lang: x.lang, history: x.history }) },
        ],
      })
    } catch (e) {
      let why = String(e)
      if (e instanceof Error) {
        why = e.message
      }
      log({ tag: ASSISTANT_LOG.tag, text: ASSISTANT_LOG.llmFailed + why })
      await recordTurn({
        db: input.db, thread: thread, turn: turn, lang: x.lang, question: x.text, answer: null, degraded: false,
        err: ERR_LLM, ms: Date.now() - t0,
      })
      return { kind: KIND.off, say: TEXT_NONE, links: [], thread: thread, turn: turn, failed: true }
    }
    settled = settle({ reply: toModelReply({ parsed: input.parse(raw), raw: raw }), system: system, prov: prov, seek: seek })
  }
  const ms = Date.now() - t0
  await recordTurn({
    db: input.db, thread: thread, turn: turn, lang: x.lang, question: x.text, answer: answerOf(settled),
    degraded: settled.degraded, err: errOf(settled.kind), ms: ms,
  })
  log({
    tag: ASSISTANT_LOG.tag,
    text: ASSISTANT_LOG.done + settled.kind + ASSISTANT_LOG.linksSep + String(settled.links.length) + ASSISTANT_LOG.msSep + String(ms),
  })
  return { kind: settled.kind, say: settled.say, links: settled.links, thread: thread, turn: turn, failed: false }
}

/**
 * 不出正文的两类(不谈移民、答不了):只给固定的几页。
 *
 * @param input 类别、省码与是不是改过模型的结果。
 * @returns 收口后的一轮。
 */
function fixedOf(input: FixedIn): Settled {
  let pages = OFF_PAGES
  if (input.kind === KIND.refuse) {
    pages = REFUSE_PAGES
  }
  return {
    kind: input.kind, say: TEXT_NONE, links: linksOf({ picks: pagePicksOf({ pages: pages, prov: input.prov }) }),
    degraded: input.degraded,
  }
}

/**
 * 模型的回复过收口:它自己判不谈移民或答不了的照办(正文一律不用);正常回答的删链接,
 * 删完是空的、带出系统提示原文的按答不了,正文命中移民话题的按不谈移民。
 *
 * @param input 验过形的回复、系统提示、提问里的省,以及这一轮是不是在找带 LMIA 或担保的职位。
 * @returns 收口后的一轮。
 */
export function settle(input: SettleIn): Settled {
  const r = input.reply
  if (r.kind === KIND.refuse) {
    const picks: Pick[] = []
    for (const p of r.picks) {
      if (REFUSE_PAGES.includes(p.page)) {
        picks.push(p)
      }
    }
    const links = linksOf({ picks: picks })
    if (links.length === 0) {
      return fixedOf({ kind: KIND.refuse, prov: input.prov, degraded: false })
    }
    return { kind: KIND.refuse, say: TEXT_NONE, links: links, degraded: false }
  }
  if (r.kind === KIND.off) {
    return fixedOf({ kind: KIND.off, prov: TEXT_NONE, degraded: false })
  }
  const say = cleanSay(r.say)
  if (say === TEXT_NONE || leaked({ say: r.say, system: input.system })) {
    return fixedOf({ kind: KIND.off, prov: TEXT_NONE, degraded: true })
  }
  if (isAdvice({ say: say, seek: input.seek })) {
    return fixedOf({ kind: KIND.refuse, prov: input.prov, degraded: true })
  }
  return { kind: KIND.answer, say: say, links: linksOf({ picks: r.picks }), degraded: say !== r.say.trim() }
}

/**
 * 存进 chat_logs 的答复:正常回答存正文;另两类没有正文,存给出去的站内地址。
 *
 * @param settled 收口后的一轮。
 * @returns 答复;什么都没给是 null。
 */
function answerOf(settled: Settled): MaybeText {
  if (settled.kind === KIND.answer) {
    return settled.say
  }
  const urls: string[] = []
  for (const l of settled.links) {
    urls.push(l.url)
  }
  if (urls.length === 0) {
    return null
  }
  return urls.join(SPACE)
}

/**
 * 存进 chat_logs 的结果码。
 *
 * @param kind 类别。
 * @returns 结果码;正常回答是 null。
 */
function errOf(kind: Kind): MaybeText {
  if (kind === KIND.refuse) {
    return ERR_REFUSE
  }
  if (kind === KIND.off) {
    return ERR_OFF
  }
  return null
}

// =========================================================================
// 9. 行构造器(值级清洗全在这里;其余函数入参一律已有效)
// =========================================================================

/**
 * 线上的请求体 → 校验后的输入:提问 trim 截长,语种认不出回落,历史只留认得的角色、截长、留最近几轮。
 *
 * @param body 线上的请求体;不是 JSON 对象是 null。
 * @returns 校验后的输入(提问空串 = 没提问,路由按 400 办)。
 */
export function toInput(body: MaybeChatBody): ChatInput {
  let text = TEXT_NONE
  let lang: Lang = LANG_FALLBACK
  let history: Turns = []
  if (body != null && typeof body === 'object') {
    if (typeof body.text === 'string') {
      text = body.text.trim().slice(0, TEXT_MAX)
    }
    if (typeof body.lang === 'string' && isLang(body.lang)) {
      lang = body.lang
    }
    if (Array.isArray(body.history)) {
      history = toTurns(body.history)
    }
  }
  return { text: text, lang: lang, history: history }
}

/**
 * 语种白名单谓词。
 *
 * @param s 线上的字符串。
 * @returns 是不是三语之一。
 */
function isLang(s: string): s is Lang {
  return LANGS.includes(s)
}

/**
 * 线上的历史 → 校验后的历史:不是对象的、角色不认的、内容不是字或是空的都丢;内容截长;只留最近 HISTORY_MSGS_MAX 条。
 *
 * @param wire 线上的历史。
 * @returns 校验后的历史。
 */
export function toTurns(wire: WireTurns): Turns {
  const picked: Turn[] = []
  for (const h of wire) {
    if (h == null || typeof h !== 'object' || typeof h.content !== 'string') {
      continue
    }
    const content = h.content.trim().slice(0, TURN_MAX)
    if (content === TEXT_NONE) {
      continue
    }
    if (h.role === ROLE.user || h.role === ROLE.assistant) {
      picked.push({ role: h.role, content: content })
    }
  }
  return picked.slice(-HISTORY_MSGS_MAX)
}

/**
 * 模型回的 JSON → 验过形的回复:类别不认的按 answer;正文不是字按没有;挑的页逐条验。
 * 模型没按 JSON 回:原文像半截 JSON 的按没有正文,否则原文当正文。
 * 体内 `as WireReply` 是跨边界断言:收出来的对象先按声明形状收下,逐格在这里验。
 *
 * @param input 收出来的 JSON 对象与模型原文。
 * @returns 验过形的回复。
 */
export function toModelReply(input: ToModelReplyIn): ModelReply {
  if (input.parsed == null) {
    const raw = input.raw.trim()
    if (raw.startsWith('{')) {
      return { kind: KIND.answer, say: TEXT_NONE, picks: [] }
    }
    return { kind: KIND.answer, say: raw, picks: [] }
  }
  const wire = input.parsed as WireReply
  let kind: Kind = KIND.answer
  if (wire.kind === KIND.refuse || wire.kind === KIND.off) {
    kind = wire.kind
  }
  let say = TEXT_NONE
  if (typeof wire.say === 'string') {
    say = wire.say
  }
  const picks: Pick[] = []
  if (Array.isArray(wire.links)) {
    for (const l of wire.links) {
      const p = toPick(l)
      if (p.page !== TEXT_NONE) {
        picks.push(p)
      }
    }
  }
  return { kind: kind, say: say, picks: picks }
}

/**
 * 模型回的一页 → 验过形的一页:三格都只认字符串。
 *
 * @param wire 线上的一页。
 * @returns 一页;页面键不是字的给空键。
 */
function toPick(wire: MaybeWirePick): Pick {
  const out: Pick = { page: TEXT_NONE, prov: TEXT_NONE, q: TEXT_NONE }
  if (wire == null || typeof wire !== 'object') {
    return out
  }
  if (typeof wire.page === 'string') {
    out.page = wire.page.trim()
  }
  if (typeof wire.prov === 'string') {
    out.prov = wire.prov
  }
  if (typeof wire.q === 'string') {
    out.q = wire.q
  }
  return out
}
