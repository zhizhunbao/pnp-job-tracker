/**
 * 站内向导的行为:提示词拼装 → 一次结构化调用 → 回包校验 → 槽位解析 → 拼站内 URL → 留痕。
 * 不循环、不裁决;模型挂了或回包不成形一律按「问题」记下,用户永远看不到错误态。
 * 2026-09-06 答题批(Frank「参考下 GPT 的」):问题类带题目的先按题目取站内事实(§3),第二次调用只把 FACTS
 * 组织成几行 —— 数字全来自库,模型不许添;取不到或没答上来才退回「记下」。
 * 模型与职业检索都由路由注进来(`complete` / `resolveNoc`),本文件只依赖 db / location / log 三片基建。
 *
 * @author Frank
 * @time 2026-09-05 00:30:00
 */

import { createHash } from 'node:crypto'
import { count, numOrNull, queryRows, SQL, text } from '../db'
import { cleanProvs } from '../location'
import { GUIDE_LOG, log } from '@/lib/log'
import {
  ANSWER_CAP, ANSWER_LINES_MAX, ANSWER_MAX_TOKENS, BRACE_CLOSE, BRACE_OPEN, CAT_PARAMS_HEAD, CAT_PARAMS_SEP,
  CAT_PARAMS_TAIL, CAT_SEP, DEST_ROUTE, DEST_SUB, DEST_URL_KEYS, EMAIL_MAX, EMAIL_RE, ERR_ANSWER, ERR_FACTS, ERR_LLM,
  ERR_LOG_CAP, ERR_PARSE, FACT_HEAD, FACT_KV, FACT_SEP, HASH_HEX, HASH_SHA256, HISTORY_MAX, ID_RE, JOBS_WORDS, KIND,
  KINDS, LANG_FALLBACK, LANG_NAME, LANGS, LMIA_ROWS_MAX, LMIA_WORDS, MAX_TOKENS, NL, PARA, PATH_CAP, PROGRAMME_Q_RE,
  PROV_RE, PROV_ROWS_MAX, Q_CAP, QS_HEAD, RAW_LOG_CAP, REPLY_KEY, REQ_EMPLOYER_TAG, REQ_LINE_SEP, REQ_ROWS_MAX, ROLE,
  SAY_CAP, SLASH, SLOT_CAP, SUB_DESC_CLOSE, SUB_DESC_OPEN, SUB_HEAD, SUBJECT_EMPLOYER, TEXT_MAX, TEXT_NONE, THREAD_ID_LEN,
  THREAD_SEED, TOPIC, TOPIC_DEST, TOPICS, TURN_CAP,
} from './constants'
import {
  ANSWER_ROLE, CATALOGUE_HEAD, CURRENT_PAGE_HEAD, DEST_DESC, EXAMPLES, FACTS_HEAD, FACTS_NONE, OUTPUT_SHAPE,
  REPLY_LANGUAGE_HEAD, ROLE_LINE, RULE_DEST, RULE_KIND, RULE_SAY, RULE_SLOTS, RULE_TOPIC, SUB_DESC,
} from './prompts'
import type {
  AnswerFromFactsIn, AnswerIn, AnswerOut, AnswerSystemIn, AskId, AskIdDbRow, AttachEmailIn, AttachEmailOut, CellOfIn,
  ChatMessage, ClassifyIn, ClassifyOut, FactLinesOut, GuideIn, GuideOut, JobsProvDbRow, JobsProvFact, JobsProvFacts,
  JobsTotalsDbRow, JobsTotalsFact, JobsTotalsLineIn, JsonObject,
  JsonValue, Kind, Lang, LmiaDbRow, LmiaFact, LoadFactsIn, LoadFactsOut, MaybeEmailBody, MaybeEmailInput,
  MaybeJsonObject, MaybeText, MessagesOfIn, MessagesOfOut, ModelReply, RecordAskIn, RecordAskOut, ReqDbRow, ReqFact,
  ResolveSlotsIn, ResolveSlotsOut, SubLineIn, SubOfIn, SystemOfIn, SystemOfOut, ThreadIdIn, ToInputIn, Topic, Turn,
  TurnList, UrlOfIn, UrlOfOut, WireTurnList, GuideInput,
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
    raw = await input.complete({ messages: messages, maxTokens: MAX_TOKENS })
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
    ROLE_LINE, RULE_KIND, RULE_DEST, RULE_SLOTS, RULE_TOPIC, RULE_SAY, OUTPUT_SHAPE, EXAMPLES, lines.join(NL),
    REPLY_LANGUAGE_HEAD + langNameOf(input.lang),
  ]
  if (input.path !== TEXT_NONE) {
    parts.push(CURRENT_PAGE_HEAD + input.path)
  }
  return parts.join(PARA)
}

/**
 * 目录里的一行:键 — 说明 (accepts: 槽位) sub values: 清单(每个子项带题型与分部)。
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
    const parts: string[] = []
    for (const sub of subs) {
      parts.push(subLineOf({ dest: key, sub: sub }))
    }
    line = line + SUB_HEAD + parts.join(CAT_PARAMS_SEP)
  }
  return line
}

/**
 * 子项在目录里的写法:`ra (Read Aloud, Speaking)`;prompts 里没说明就只剩 slug(测试断言两表对齐,生产不会走到)。
 *
 * @param input 目的地键与子项。
 * @returns 子项一段。
 */
function subLineOf(input: SubLineIn): string {
  const table = SUB_DESC[input.dest]
  if (table == null) {
    return input.sub
  }
  const desc = table[input.sub]
  if (desc == null) {
    return input.sub
  }
  return input.sub + SUB_DESC_OPEN + desc + SUB_DESC_CLOSE
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
  return {
    kind: KIND.question, dest: null, occupation: null, prov: null, city: null, q: null, sub: null, topic: null, say: TEXT_NONE,
  }
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
  let q: string | null = r.q
  if (q != null && PROGRAMME_Q_RE.test(q.trim())) {
    q = null
  }
  return { noc: noc, prov: prov, city: r.city, q: q, sub: sub }
}

// =========================================================================
// 3. 站内事实:按题目取库 → 拼 FACTS 行 → 第二次调用只组织不添(2026-09-06 答题批)
// =========================================================================

/**
 * 问题类带题目的一轮:取事实 → 有事实才叫模型组织;事实空或调用失败都回空串,由调用方退回「记下」。
 *
 * @param input 库、题目、槽位、原话、语种与注入的补全函数。
 * @returns 答案与失败码。
 */
async function answerFromFacts(input: AnswerFromFactsIn): AnswerOut {
  const facts = await loadFacts({ db: input.db, topic: input.topic, slots: input.slots })
  if (facts.lines.length === 0) {
    return { say: TEXT_NONE, err: facts.err }
  }
  return answer({ text: input.text, lang: input.lang, facts: facts.lines, complete: input.complete })
}

/**
 * 按题目取站内事实,拼成 FACTS 行。省提名要省码,职业行情要职业码,缺了就是空(退回「记下」);
 * 库查询失败也是空并留痕 —— 事实取不到就不答,不拿别省别职业的凑。
 *
 * @param input 库、题目与槽位。
 * @returns FACTS 行与失败码。
 */
export async function loadFacts(input: LoadFactsIn): LoadFactsOut {
  try {
    if (input.topic === TOPIC.pnp) {
      return { lines: await reqFacts(input), err: null }
    }
    if (input.topic === TOPIC.lmia) {
      return { lines: await lmiaFacts(input), err: null }
    }
    return { lines: await jobsFacts(input), err: null }
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.factsFailed + why.slice(0, ERR_LOG_CAP) })
    return { lines: [], err: ERR_FACTS }
  }
}

/**
 * 省提名门槛:某省 pnp_requirements 按 seq 前 N 条,一行一条;条文空的行跳过。没省码是空。
 *
 * @param input 库、题目与槽位。
 * @returns FACTS 行。
 */
async function reqFacts(input: LoadFactsIn): FactLinesOut {
  if (input.slots.prov == null) {
    return []
  }
  const rows = await queryRows({
    db: input.db, sql: SQL.GUIDE_REQ_BY_PROV, params: [input.slots.prov, REQ_ROWS_MAX], map: toReqFact,
  })
  const out: string[] = []
  for (const r of rows) {
    if (r.label !== TEXT_NONE) {
      out.push(reqLineOf(r))
    }
  }
  return out
}

/**
 * 一条门槛的 FACTS 行:`- 通道 — 条文`,雇主侧条款尾带标记。
 *
 * @param f 洗净的条文。
 * @returns 一行。
 */
export function reqLineOf(f: ReqFact): string {
  let line = FACT_HEAD
  if (f.stream !== TEXT_NONE) {
    line = line + f.stream + REQ_LINE_SEP
  }
  line = line + f.label
  if (f.employerSide) {
    line = line + REQ_EMPLOYER_TAG
  }
  return line
}

/**
 * LMIA 雇主:拿过 LMIA 且在招的前 N 家(按 TEER 0-3 岗位数);省与职业码有就筛,没有就全国。
 *
 * @param input 库、题目与槽位。
 * @returns FACTS 行。
 */
async function lmiaFacts(input: LoadFactsIn): FactLinesOut {
  let prov = TEXT_NONE
  if (input.slots.prov != null) {
    prov = input.slots.prov
  }
  let noc = TEXT_NONE
  if (input.slots.noc != null) {
    noc = input.slots.noc
  }
  const rows = await queryRows({
    db: input.db, sql: SQL.GUIDE_LMIA_EMPLOYERS, params: [prov, noc, LMIA_ROWS_MAX], map: toLmiaFact,
  })
  const out: string[] = []
  for (const r of rows) {
    out.push(lmiaLineOf(r))
  }
  return out
}

/**
 * 一家 LMIA 雇主的 FACTS 行:名 + TEER 0-3 岗位数 + 总数 + 最近季度 + 本站在招数。
 *
 * @param f 洗净的雇主行。
 * @returns 一行。
 */
export function lmiaLineOf(f: LmiaFact): string {
  const parts: string[] = []
  if (f.skilled != null) {
    parts.push(String(f.skilled) + LMIA_WORDS.skilled)
  }
  parts.push(String(f.positions) + LMIA_WORDS.total)
  if (f.quarter !== TEXT_NONE) {
    parts.push(LMIA_WORDS.quarter + f.quarter)
  }
  parts.push(String(f.openJobs) + LMIA_WORDS.open)
  return FACT_HEAD + f.name + FACT_KV + parts.join(FACT_SEP)
}

/**
 * 职业行情:某职业码的在招总数 / 可提名数 / 中位年薪一行,省分布前 N 省一行。没职业码或在招为 0 是空。
 *
 * @param input 库、题目与槽位。
 * @returns FACTS 行。
 */
async function jobsFacts(input: LoadFactsIn): FactLinesOut {
  const noc = input.slots.noc
  if (noc == null) {
    return []
  }
  const totals = await queryRows({ db: input.db, sql: SQL.QUIZ_FACTS_TOTALS, params: [noc], map: toJobsTotalsFact })
  const first = totals[0]
  if (first == null || first.open === 0) {
    return []
  }
  const provs = await queryRows({ db: input.db, sql: SQL.QUIZ_FACTS_BY_PROV, params: [noc], map: toJobsProvFact })
  const out = [jobsTotalsLineOf({ noc: noc, fact: first })]
  const provLine = jobsProvLineOf(provs.slice(0, PROV_ROWS_MAX))
  if (provLine !== TEXT_NONE) {
    out.push(provLine)
  }
  return out
}

/**
 * 职业总量的 FACTS 行。
 *
 * @param input 职业码与总量行。
 * @returns 一行。
 */
export function jobsTotalsLineOf(input: JobsTotalsLineIn): string {
  const parts = [
    String(input.fact.open) + JOBS_WORDS.open + input.noc,
    String(input.fact.eligible) + JOBS_WORDS.eligible,
  ]
  if (input.fact.median == null) {
    parts.push(JOBS_WORDS.medianNone)
  } else {
    parts.push(JOBS_WORDS.median + String(Math.round(input.fact.median)))
  }
  return FACT_HEAD + parts.join(FACT_SEP)
}

/**
 * 职业省分布的 FACTS 行;没有省是空串。
 *
 * @param rows 省分布行(已截)。
 * @returns 一行或空串。
 */
export function jobsProvLineOf(rows: JobsProvFacts): string {
  if (rows.length === 0) {
    return TEXT_NONE
  }
  const parts: string[] = []
  for (const r of rows) {
    parts.push(r.province + FACT_KV + String(r.n))
  }
  return FACT_HEAD + JOBS_WORDS.byProv + parts.join(FACT_SEP)
}

/**
 * 第二次调用:FACTS + 原话 → 几行答案。调用失败不抛,答案空串 + err=answer。
 *
 * @param input 原话、语种、FACTS 行与注入的补全函数。
 * @returns 答案与失败码。
 */
export async function answer(input: AnswerIn): AnswerOut {
  const messages: ChatMessage[] = [
    { role: ROLE.system, content: answerSystemOf({ lang: input.lang, facts: input.facts }) },
    { role: ROLE.user, content: input.text },
  ]
  let raw = TEXT_NONE
  try {
    raw = await input.complete({ messages: messages, maxTokens: ANSWER_MAX_TOKENS })
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message
    }
    log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.answerFailed + why.slice(0, ERR_LOG_CAP) })
    return { say: TEXT_NONE, err: ERR_ANSWER }
  }
  return { say: answerTextOf(raw), err: null }
}

/**
 * 答案的 system prompt:角色铁律 → FACTS → 语种。
 *
 * @param input 语种与 FACTS 行。
 * @returns system prompt。
 */
export function answerSystemOf(input: AnswerSystemIn): string {
  let facts = FACTS_NONE
  if (input.facts.length > 0) {
    facts = input.facts.join(NL)
  }
  return [ANSWER_ROLE, FACTS_HEAD + NL + facts, REPLY_LANGUAGE_HEAD + langNameOf(input.lang)].join(PARA)
}

/**
 * 模型原文 → 见客的几行:去空行、最多 N 行、截长。模型偶尔多写,提示词管不住的在这里管。
 *
 * @param raw 模型原文。
 * @returns 几行(换行分隔);模型什么都没写是空串。
 */
export function answerTextOf(raw: string): string {
  const lines: string[] = []
  for (const l of raw.trim().split(NL)) {
    const t = l.trim()
    if (t !== TEXT_NONE) {
      lines.push(t)
    }
  }
  return lines.slice(0, ANSWER_LINES_MAX).join(NL).slice(0, ANSWER_CAP)
}

// =========================================================================
// 4. 请求体、线程与留痕:编排入口、线程 id、写 asks
// =========================================================================

/**
 * 一轮编排:分类 → 解析槽位 → (问题带题目:取事实答)→ 拼 URL → 留痕 → 对外形。留痕失败 id 为 null,答复照出。
 * 答上来的问题 kind 仍是 question(留痕分组不变),但 say 非空、dest 落题目对应页;没答上来的与原来一样。
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
  let dest = c.reply.dest
  let say = c.reply.say
  let err = c.err
  if (c.reply.kind === KIND.question && c.reply.topic != null) {
    const a = await answerFromFacts({
      db: input.db, topic: c.reply.topic, slots: slots, text: x.text, lang: x.lang, complete: input.complete,
    })
    if (a.say !== TEXT_NONE) {
      say = a.say
      const d = TOPIC_DEST[c.reply.topic]
      if (d != null) {
        dest = d
      }
    }
    if (a.err != null) {
      err = a.err
    }
  }
  let url: string | null = null
  if (dest != null) {
    url = urlOf({ dest: dest, slots: slots })
  }
  const ms = Date.now() - t0
  const id = await recordAsk({
    db: input.db, thread: thread, turn: turn, lang: x.lang, path: x.path, question: x.text.slice(0, Q_CAP),
    kind: c.reply.kind, dest: dest, params: slots, say: say, ms: ms, err: err,
  })
  log({ tag: GUIDE_LOG.tag, text: GUIDE_LOG.routed + c.reply.kind + GUIDE_LOG.destSep + String(dest) + GUIDE_LOG.msSep + String(ms) })
  return {
    id: id, thread: thread, turn: turn, kind: c.reply.kind, dest: dest, url: url, say: say,
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
// 5. 行构造器(值级清洗全在这里;其余函数入参一律已有效)
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
  let topic: Topic | null = null
  const topicCell = cellOf({ obj: obj, key: REPLY_KEY.topic, cap: SLOT_CAP })
  if (topicCell != null && kind === KIND.question && isTopic(topicCell)) {
    topic = topicCell
  }
  return {
    kind: kind, dest: dest,
    occupation: cellOf({ obj: obj, key: REPLY_KEY.occupation, cap: SLOT_CAP }),
    prov: prov,
    city: cellOf({ obj: obj, key: REPLY_KEY.city, cap: SLOT_CAP }),
    q: cellOf({ obj: obj, key: REPLY_KEY.q, cap: SLOT_CAP }),
    sub: cellOf({ obj: obj, key: REPLY_KEY.sub, cap: SLOT_CAP }),
    topic: topic,
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
 * 题目白名单谓词。
 *
 * @param s 模型给的字符串。
 * @returns 是不是三个题目之一。
 */
function isTopic(s: string): s is Topic {
  return TOPICS.includes(s)
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

/**
 * 门槛条文行 → 干净条文:通道与条文空串兜底,主体是不是雇主侧当场判成布尔。
 *
 * @param r 原始行。
 * @returns 洗净的条文。
 */
export function toReqFact(r: ReqDbRow): ReqFact {
  return { stream: text(r.stream), employerSide: text(r.subject) === SUBJECT_EMPLOYER, label: text(r.label) }
}

/**
 * LMIA 雇主行 → 干净行:TEER 0-3 岗位数官方没拆保 null(折 0 = 替官方编数)。
 *
 * @param r 原始行。
 * @returns 洗净的雇主行。
 */
export function toLmiaFact(r: LmiaDbRow): LmiaFact {
  return {
    name: text(r.name), positions: count(r.lmia_positions), skilled: numOrNull(r.lmia_positions_skilled),
    quarter: text(r.lmia_last_quarter), openJobs: count(r.open_jobs),
  }
}

/**
 * 职业总量行 → 干净行:中位年薪算不出保 null。
 *
 * @param r 原始行。
 * @returns 洗净的总量行。
 */
export function toJobsTotalsFact(r: JobsTotalsDbRow): JobsTotalsFact {
  return { open: count(r.open), eligible: count(r.eligible), median: numOrNull(r.med) }
}

/**
 * 职业省分布行 → 干净行。
 *
 * @param r 原始行。
 * @returns 洗净的省分布行。
 */
export function toJobsProvFact(r: JobsProvDbRow): JobsProvFact {
  return { province: text(r.province), n: count(r.n) }
}
