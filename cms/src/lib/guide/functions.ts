/**
 * 站内向导的行为:提示词拼装 → 一次结构化调用 → 回包校验 → 槽位解析 → 拼站内 URL → 留痕。
 * 不循环、不取事实、不裁决;模型挂了或回包不成形一律按「问题」记下,用户永远看不到错误态。
 * 模型与职业检索都由路由注进来(`complete` / `resolveNoc`),本文件只依赖 db / location / log 三片基建。
 *
 * @author Frank
 * @time 2026-09-05 00:30:00
 */

import { createHash } from 'node:crypto'
import { count, queryRows, SQL } from '../db'
import { cleanProvs } from '../location'
import { GUIDE_LOG, log } from '@/lib/log'
import {
  BRACE_CLOSE, BRACE_OPEN, CAT_PARAMS_HEAD, CAT_PARAMS_SEP, CAT_PARAMS_TAIL, CAT_SEP, DEST_ROUTE, DEST_SUB, DEST_URL_KEYS,
  EMAIL_MAX, EMAIL_RE, ERR_LLM, ERR_LOG_CAP, ERR_PARSE, HASH_HEX, HASH_SHA256, HISTORY_MAX, ID_RE, KIND, KINDS,
  LANG_FALLBACK, LANG_NAME, LANGS, NL, PARA, PATH_CAP, PROV_RE, Q_CAP, QS_HEAD, RAW_LOG_CAP, REPLY_KEY, ROLE, SAY_CAP, SLASH,
  SLOT_CAP, SUB_HEAD, TEXT_MAX, TEXT_NONE, THREAD_ID_LEN, THREAD_SEED, TURN_CAP,
} from './constants'
import {
  CATALOGUE_HEAD, CURRENT_PAGE_HEAD, DEST_DESC, EXAMPLES, OUTPUT_SHAPE, REPLY_LANGUAGE_HEAD, ROLE_LINE, RULE_DEST,
  RULE_KIND, RULE_SAY, RULE_SLOTS,
} from './prompts'
import type {
  AskId, AskIdDbRow, AttachEmailIn, AttachEmailOut, CellOfIn, ChatMessage, ClassifyIn, ClassifyOut, GuideIn,
  GuideOut, JsonObject, JsonValue, Kind, Lang, MaybeEmailBody, MaybeEmailInput, MaybeJsonObject, MaybeText, MessagesOfIn, MessagesOfOut, ModelReply,
  RecordAskIn, RecordAskOut, ResolveSlotsIn, ResolveSlotsOut, SubOfIn, SystemOfIn, SystemOfOut, ThreadIdIn,
  ToInputIn, Turn, TurnList, UrlOfIn, UrlOfOut, WireTurnList, GuideInput,
} from './types'

// =========================================================================
// 1. 目的地目录:键 + 槽位 → 站内 URL
// =========================================================================

/**
 * 目的地 + 解析完的槽位 → 带参的站内路径。子路径不在清单里落清单第一项;该页不收的槽位丢弃。
 *
 * @param input 目的地键(已验在目录里)与槽位。
 * @returns 相对路径;目录里没有这个键时是空串(调用方已验,这里只是类型收窄)。
 */
export function urlOf(input: UrlOfIn): UrlOfOut {
  const route = DEST_ROUTE[input.dest]
  if (route == null) {
    return TEXT_NONE
  }
  let path = route
  const subs = DEST_SUB[input.dest]
  if (subs != null) {
    path = path + SLASH + subOf({ subs: subs, sub: input.slots.sub })
  }
  const qs = queryOf(input)
  if (qs === TEXT_NONE) {
    return path
  }
  return path + QS_HEAD + qs
}

/**
 * 子路径:在清单里就用它,否则清单第一项。
 *
 * @param input 清单与模型给的子路径。
 * @returns 子路径。
 */
function subOf(input: SubOfIn): string {
  if (input.sub != null && input.subs.includes(input.sub)) {
    return input.sub
  }
  const first = input.subs[0]
  if (first == null) {
    return TEXT_NONE
  }
  return first
}

/**
 * 该页收的槽位拼成查询串;一个都没有是空串。
 *
 * @param input 目的地键与槽位。
 * @returns 查询串(不带问号)。
 */
function queryOf(input: UrlOfIn): string {
  const keys = DEST_URL_KEYS[input.dest]
  if (keys == null) {
    return TEXT_NONE
  }
  const vals: Record<string, string | null> = {
    noc: input.slots.noc, prov: input.slots.prov, city: input.slots.city, q: input.slots.q,
  }
  const p = new URLSearchParams()
  for (const [slot, urlKey] of Object.entries(keys)) {
    const v = vals[slot]
    if (v != null && v !== TEXT_NONE) {
      p.set(urlKey, v)
    }
  }
  return p.toString()
}

// =========================================================================
// 2. 类别与模型:提示词、一次调用、回包校验、槽位解析
// =========================================================================

/**
 * 一次结构化调用。模型挂了 → err=llm;回包不是 JSON → err=parse;两种都按「问题」兜底,不抛。
 *
 * @param input 提问、语种、所在页、历史与注入的补全函数。
 * @returns 校验后的回包与失败码。
 */
export async function classify(input: ClassifyIn): ClassifyOut {
  const system = systemOf({ lang: input.lang, path: input.path })
  const messages = messagesOf({ system: system, text: input.text, history: input.history })
  let raw = TEXT_NONE
  try {
    raw = await input.complete(messages)
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.llmFailed + why.slice(0, ERR_LOG_CAP) })
    return { reply: questionReply(), err: ERR_LLM }
  }
  const obj = jsonOf(raw)
  if (obj == null) {
    log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.parseFailed + raw.slice(0, RAW_LOG_CAP) })
    return { reply: questionReply(), err: ERR_PARSE }
  }
  return { reply: toModelReply(obj), err: null }
}

/**
 * 整段 system prompt:规则 → 输出形状 → 示例 → 目录 → 语种 → 当前页。
 *
 * @param input 语种与所在页。
 * @returns system prompt。
 */
export function systemOf(input: SystemOfIn): SystemOfOut {
  const lines: string[] = [CATALOGUE_HEAD]
  for (const key of Object.keys(DEST_ROUTE)) {
    lines.push(catalogueLineOf(key))
  }
  const parts = [
    ROLE_LINE, RULE_KIND, RULE_DEST, RULE_SLOTS, RULE_SAY, OUTPUT_SHAPE, EXAMPLES, lines.join(NL),
    REPLY_LANGUAGE_HEAD + langNameOf(input.lang),
  ]
  if (input.path !== TEXT_NONE) {
    parts.push(CURRENT_PAGE_HEAD + input.path)
  }
  return parts.join(PARA)
}

/**
 * 目录里的一行:键 — 说明 (accepts: 槽位) sub values: 清单。
 *
 * @param key 目的地键。
 * @returns 一行。
 */
function catalogueLineOf(key: string): string {
  let line = key + CAT_SEP + descOf(key)
  const keys = DEST_URL_KEYS[key]
  if (keys != null) {
    line = line + CAT_PARAMS_HEAD + Object.keys(keys).join(CAT_PARAMS_SEP) + CAT_PARAMS_TAIL
  }
  const subs = DEST_SUB[key]
  if (subs != null) {
    line = line + SUB_HEAD + subs.join(CAT_PARAMS_SEP)
  }
  return line
}

/**
 * 目的地的说明;prompts 里漏了这键就只剩键名(测试断言两表键集相等,生产不会走到)。
 *
 * @param key 目的地键。
 * @returns 说明。
 */
function descOf(key: string): string {
  const d = DEST_DESC[key]
  if (d == null) {
    return key
  }
  return d
}

/**
 * 回复语种的英文名。
 *
 * @param lang 语种。
 * @returns 语言名。
 */
function langNameOf(lang: Lang): string {
  const n = LANG_NAME[lang]
  if (n == null) {
    return LANG_FALLBACK
  }
  return n
}

/**
 * system + 历史 + 本轮 → 整轮消息。
 *
 * @param input system prompt、本轮提问与历史。
 * @returns 消息清单。
 */
export function messagesOf(input: MessagesOfIn): MessagesOfOut {
  const out: ChatMessage[] = [{ role: ROLE.system, content: input.system }]
  for (const h of input.history) {
    out.push({ role: h.role, content: h.content })
  }
  out.push({ role: ROLE.user, content: input.text })
  return out
}

/**
 * 模型原文 → JSON 对象:先整体 parse,不行再截第一对配平的花括号(模型爱在前后加话)。
 * 两个 catch 都是解析算法的分支切换,不是降级;体内 `as` 是跨边界断言(JSON.parse 没有形状)。
 *
 * @param text 模型原文。
 * @returns JSON 对象;不是对象或坏 JSON 是 null。
 */
export function jsonOf(text: string): MaybeJsonObject {
  const t = text.trim()
  const whole = wholeJsonOf(t)
  if (whole != null) {
    return whole
  }
  const i = t.indexOf(BRACE_OPEN)
  if (i < 0) {
    return null
  }
  let depth = 0
  for (let j = i; j < t.length; j++) {
    if (t[j] === BRACE_OPEN) {
      depth = depth + 1
    } else if (t[j] === BRACE_CLOSE) {
      depth = depth - 1
      if (depth === 0) {
        return wholeJsonOf(t.slice(i, j + 1))
      }
    }
  }
  return null
}

/**
 * 整体 JSON.parse 且要求是对象(裸数组 / 标量不算)。
 *
 * @param t 修剪过的文本。
 * @returns JSON 对象;不是对象或坏 JSON 是 null。
 */
function wholeJsonOf(t: string): MaybeJsonObject {
  try {
    const parsed = JSON.parse(t) as JsonValue
    if (parsed != null && typeof parsed === 'object' && Array.isArray(parsed) === false) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * 「问题」兜底回包:模型没答上来时用它,前端走固定文案。
 *
 * @returns 一份 kind=question 的回包。
 */
function questionReply(): ModelReply {
  return { kind: KIND.question, dest: null, occupation: null, prov: null, city: null, q: null, sub: null, say: TEXT_NONE }
}

/**
 * 回包里的槽位 → 站内认的值:职业名经库检索换成码(取第一命中),省过白名单,子路径过清单。
 * 检索挂了 → 职业码 null 并留痕,其余照常。
 *
 * @param input 校验后的回包与注入的职业检索。
 * @returns 解析完的槽位。
 */
export async function resolveSlots(input: ResolveSlotsIn): ResolveSlotsOut {
  const r = input.reply
  let noc: string | null = null
  if (r.occupation != null) {
    try {
      const hits = await input.resolveNoc(r.occupation)
      const first = hits[0]
      if (first != null) {
        noc = first.noc
      }
    } catch (e) {
      let why = String(e)
      if (e instanceof Error) {
        why = e.message
      }
      log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.resolveFailed + why.slice(0, ERR_LOG_CAP) })
    }
  }
  let prov: string | null = null
  if (r.prov != null) {
    const kept = cleanProvs({ raw: [r.prov] })
    const first = kept[0]
    if (first != null) {
      prov = first
    }
  }
  let sub: string | null = null
  if (r.dest != null && r.sub != null) {
    const subs = DEST_SUB[r.dest]
    if (subs != null && subs.includes(r.sub)) {
      sub = r.sub
    }
  }
  return { noc: noc, prov: prov, city: r.city, q: r.q, sub: sub }
}

// =========================================================================
// 3. 请求体、线程与留痕:编排入口、线程 id、写 asks
// =========================================================================

/**
 * 一轮编排:分类 → 解析槽位 → 拼 URL → 留痕 → 对外形。留痕失败 id 为 null,答复照出。
 *
 * @param input 库、校验后的输入与两个注入函数。
 * @returns 一轮的结果。
 */
export async function guide(input: GuideIn): GuideOut {
  const t0 = Date.now()
  const x = input.input
  const thread = threadIdOf({ text: x.text, history: x.history })
  const turn = turnOf(x.history)
  const c = await classify({ text: x.text, lang: x.lang, path: x.path, history: x.history, complete: input.complete })
  const slots = await resolveSlots({ reply: c.reply, resolveNoc: input.resolveNoc })
  let url: string | null = null
  if (c.reply.kind === KIND.nav && c.reply.dest != null) {
    url = urlOf({ dest: c.reply.dest, slots: slots })
  }
  const ms = Date.now() - t0
  const id = await recordAsk({
    db: input.db, thread: thread, turn: turn, lang: x.lang, path: x.path, question: x.text.slice(0, Q_CAP),
    kind: c.reply.kind, dest: c.reply.dest, params: slots, say: c.reply.say, ms: ms, err: c.err,
  })
  log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.routed + c.reply.kind + GUIDE_LOG.destSep + String(c.reply.dest) + GUIDE_LOG.msSep + String(ms) })
  return {
    id: id, thread: thread, turn: turn, kind: c.reply.kind, dest: c.reply.dest, url: url, say: c.reply.say,
    noc: slots.noc, prov: slots.prov,
  }
}

/**
 * 同一串追问的 id = 首轮提问文本的哈希(沿 chat_logs 口径)。不用 IP / UA / session —— 那三样都指向人。
 *
 * @param input 本轮提问与历史。
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
  return createHash(HASH_SHA256).update(first.trim().slice(0, THREAD_SEED)).digest(HASH_HEX).slice(0, THREAD_ID_LEN)
}

/**
 * 本串里的第几轮:history 里的 user 消息数 + 1。
 *
 * @param history 多轮历史。
 * @returns 轮次(1 起)。
 */
export function turnOf(history: TurnList): number {
  let n = 0
  for (const h of history) {
    if (h.role === ROLE.user) {
      n = n + 1
    }
  }
  return n + 1
}

/**
 * 写一行 asks。留痕是副产品:写库失败只留痕、回 null,答复不受影响。
 *
 * @param input 一行的全部格。
 * @returns 新行 id;失败 null。
 */
export async function recordAsk(input: RecordAskIn): RecordAskOut {
  const params = [
    input.thread, input.turn, input.lang, input.path, input.question, input.kind, input.dest,
    JSON.stringify(input.params), input.say, Math.round(input.ms), input.err,
  ]
  try {
    const rows = await queryRows({ db: input.db, sql: SQL.ASK_INSERT, params: params, map: toAskId })
    const first = rows[0]
    if (first == null) {
      return null
    }
    return first.id
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.askFailed + why.slice(0, ERR_LOG_CAP) })
    return null
  }
}

/**
 * 用户主动留邮箱:写到 id 与 thread 都对得上的那一行。
 *
 * @param input 库、id、thread、邮箱(已验形)。
 * @returns 写到了没有;写库失败 false(已留痕)。
 */
export async function attachEmail(input: AttachEmailIn): AttachEmailOut {
  try {
    const rows = await queryRows({
      db: input.db, sql: SQL.ASK_SET_EMAIL, params: [input.id, input.thread, input.email], map: toAskId,
    })
    return rows.length > 0
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.emailFailed + why.slice(0, ERR_LOG_CAP) })
    return false
  }
}

// =========================================================================
// 4. 行构造器(值级清洗全在这里;其余函数入参一律已有效)
// =========================================================================

/**
 * 线上的 body → 校验后的输入:正文 trim + 截长,语种认不出回落,路径只收站内相对路径,历史截轮数与长度。
 *
 * @param body 线上的 body;不是 JSON 是 null。
 * @returns 校验后的输入(正文空串 = 没正文,路由按 400 处理)。
 */
export function toInput(body: ToInputIn): GuideInput {
  let text = TEXT_NONE
  let lang: Lang = LANG_FALLBACK
  let path = TEXT_NONE
  let history: Turn[] = []
  if (body != null) {
    if (typeof body.text === 'string') {
      text = body.text.trim().slice(0, TEXT_MAX)
    }
    if (typeof body.lang === 'string' && isLang(body.lang)) {
      lang = body.lang
    }
    if (typeof body.path === 'string' && body.path.startsWith(SLASH)) {
      path = body.path.slice(0, PATH_CAP)
    }
    if (Array.isArray(body.history)) {
      history = toTurns(body.history)
    }
  }
  return { text: text, lang: lang, path: path, history: history }
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
 * 线上的历史 → 校验后的轮:角色不认的丢,内容截长,只留最近 HISTORY_MAX 轮。
 *
 * @param wire 线上的历史。
 * @returns 校验后的轮。
 */
export function toTurns(wire: WireTurnList): TurnList {
  const picked: Turn[] = []
  for (const h of wire) {
    if (typeof h.content !== 'string') {
      continue
    }
    if (h.role === ROLE.user || h.role === ROLE.assistant) {
      picked.push({ role: h.role, content: h.content.slice(0, TURN_CAP) })
    }
  }
  return picked.slice(-HISTORY_MAX)
}

/**
 * 线上的留邮箱 body → 三格都验过的输入;任一格不成形是 null。
 *
 * @param body 线上的 body;不是 JSON 是 null。
 * @returns 校验后的输入或 null。
 */
export function toEmailInput(body: MaybeEmailBody): MaybeEmailInput {
  if (body == null) {
    return null
  }
  const idText = String(body.id)
  if (ID_RE.test(idText) === false) {
    return null
  }
  if (typeof body.thread !== 'string' || body.thread.length !== THREAD_ID_LEN) {
    return null
  }
  if (typeof body.email !== 'string') {
    return null
  }
  const email = body.email.trim()
  if (email.length > EMAIL_MAX || EMAIL_RE.test(email) === false) {
    return null
  }
  return { id: Number(idText), thread: body.thread, email: email }
}

/**
 * 模型回包(已是 JSON 对象)→ 逐格校验的回包。类别不认 → question;nav 但目的地不在目录 → question;
 * 非 nav 目的地清空;省码只留两位大写形状;问题与建议的 say 一律空串(站有固定文案)。
 *
 * @param obj JSON 对象。
 * @returns 校验后的回包。
 */
export function toModelReply(obj: JsonObject): ModelReply {
  let kind: Kind = KIND.question
  const kindCell = cellOf({ obj: obj, key: REPLY_KEY.kind, cap: SLOT_CAP })
  if (kindCell != null && isKind(kindCell)) {
    kind = kindCell
  }
  let dest: string | null = null
  if (kind === KIND.nav) {
    dest = cellOf({ obj: obj, key: REPLY_KEY.dest, cap: SLOT_CAP })
    if (dest == null || DEST_ROUTE[dest] == null) {
      kind = KIND.question
      dest = null
    }
  }
  let prov: string | null = null
  const provCell = cellOf({ obj: obj, key: REPLY_KEY.prov, cap: SLOT_CAP })
  if (provCell != null && PROV_RE.test(provCell.toUpperCase())) {
    prov = provCell.toUpperCase()
  }
  let say = TEXT_NONE
  const sayCell = cellOf({ obj: obj, key: REPLY_KEY.say, cap: SAY_CAP })
  if (sayCell != null && (kind === KIND.nav || kind === KIND.chat)) {
    say = sayCell
  }
  return {
    kind: kind, dest: dest,
    occupation: cellOf({ obj: obj, key: REPLY_KEY.occupation, cap: SLOT_CAP }),
    prov: prov,
    city: cellOf({ obj: obj, key: REPLY_KEY.city, cap: SLOT_CAP }),
    q: cellOf({ obj: obj, key: REPLY_KEY.q, cap: SLOT_CAP }),
    sub: cellOf({ obj: obj, key: REPLY_KEY.sub, cap: SLOT_CAP }),
    say: say,
  }
}

/**
 * 类别白名单谓词。
 *
 * @param s 模型给的字符串。
 * @returns 是不是四类之一。
 */
function isKind(s: string): s is Kind {
  return KINDS.includes(s)
}

/**
 * JSON 对象里的一格 → 非空字符串(trim、截长);不是字符串或空串是 null。
 *
 * @param input 对象、键与截长。
 * @returns 字符串或 null。
 */
function cellOf(input: CellOfIn): MaybeText {
  const v = input.obj[input.key]
  if (typeof v !== 'string') {
    return null
  }
  const s = v.trim().slice(0, input.cap)
  if (s === TEXT_NONE) {
    return null
  }
  return s
}

/**
 * id 行 → 干净 id。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toAskId(r: AskIdDbRow): AskId {
  return { id: count(r.id) }
}
