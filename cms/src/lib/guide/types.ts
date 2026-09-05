/**
 * 站内向导这一域的类型:线格式、校验后的输入、模型回包、解析后的槽位、留痕行,以及每个函数的入参与返回。
 * 三段律:`GuideBody`(线,缺席=没发键)→ `GuideInput`(校验后,必填与 `| null` 两态)→ `GuideResult`(对外)。
 *
 * @author Frank
 * @time 2026-09-05 00:30:00
 */

import type { Db } from '../db'

// =========================================================================
// 1. 目的地目录(镜像 constants §1)
// =========================================================================

/**
 * 解析完的槽位:职业已换成码,省已过白名单,其余是截过长的原文;没有就是 null。
 */
export type ResolvedSlots = {
  /**
   * 五位职业码(模型给的职业名经库检索换来);检索不到是 null。
   */
  noc: string | null

  /**
   * 两位省码;不在白名单是 null。
   */
  prov: string | null

  /**
   * 城市名(英文原文)。
   */
  city: string | null

  /**
   * 页内搜索关键词。
   */
  q: string | null

  /**
   * 子路径(PTE 题型 / 榜名);不在清单是 null。
   */
  sub: string | null
}

/**
 * `urlOf` 的入参。
 */
export type UrlOfIn = {
  /**
   * 目的地键(已验在 DEST_ROUTE 里)。
   */
  dest: string

  /**
   * 解析完的槽位。
   */
  slots: ResolvedSlots
}

/**
 * `urlOf` 的返回:站内相对路径,带查询串。
 */
export type UrlOfOut = string

/**
 * `subOf` 的入参。
 */
export type SubOfIn = {
  /**
   * 该目的地的合法子路径清单。
   */
  subs: string[]

  /**
   * 模型给的子路径;没有是 null。
   */
  sub: string | null
}

// =========================================================================
// 2. 类别与模型(镜像 constants §2)
// =========================================================================

/**
 * 三语。各域自抄,不跨域取。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 四类。
 */
export type Kind = 'nav' | 'question' | 'suggestion' | 'chat'

/**
 * 喂模型的一条消息(与 lib/llm 的 ChatMessage 同形,本域自声明)。
 */
export type ChatMessage = {
  /**
   * 角色。
   */
  role: 'system' | 'user' | 'assistant'

  /**
   * 内容。
   */
  content: string
}

/**
 * 一次整段补全:由路由把 lib/llm 的 completeText 包好注进来,functions 不碰模型域。
 */
export type CompleteFn = (messages: ChatMessage[]) => Promise<string>

/**
 * 职业检索命中:向导只认这两格。
 */
export type NocPick = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 官方英文名。
   */
  title: string
}

/**
 * 职业名 → 候选:由路由把 lib/jobs 的 searchNocByTitle 包好注进来。
 */
export type NocResolveFn = (q: string) => Promise<NocPick[]>

/**
 * JSON 值(模型回包解析后的形状)。
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * 模型回包解析出的对象。
 */
export type JsonObject = Record<string, JsonValue>

/**
 * 模型回包解析出的对象;不是对象或坏 JSON 是 null。
 */
export type MaybeJsonObject = JsonObject | null

/**
 * 一格字符串;没有是 null。
 */
export type MaybeText = string | null

/**
 * `cellOf` 的入参:从 JSON 对象里取一格字符串。
 */
export type CellOfIn = {
  /**
   * 模型回包对象。
   */
  obj: JsonObject

  /**
   * 键名。
   */
  key: string

  /**
   * 截长。
   */
  cap: number
}

/**
 * 模型回包逐格校验后的形状。
 */
export type ModelReply = {
  /**
   * 类别。
   */
  kind: Kind

  /**
   * 目的地键;非 nav 是 null。
   */
  dest: string | null

  /**
   * 模型写的英文职业短名。
   */
  occupation: string | null

  /**
   * 两位省码(形状对了,白名单在解析时再过)。
   */
  prov: string | null

  /**
   * 城市名。
   */
  city: string | null

  /**
   * 关键词。
   */
  q: string | null

  /**
   * 子路径。
   */
  sub: string | null

  /**
   * 向导那一句;问题与建议是空串。
   */
  say: string
}

/**
 * `systemOf` 的入参。
 */
export type SystemOfIn = {
  /**
   * 回复语种。
   */
  lang: Lang

  /**
   * 提问时所在页路径。
   */
  path: string
}

/**
 * `systemOf` 的返回:整段 system prompt。
 */
export type SystemOfOut = string

/**
 * `messagesOf` 的入参。
 */
export type MessagesOfIn = {
  /**
   * system prompt。
   */
  system: string

  /**
   * 本轮提问。
   */
  text: string

  /**
   * 多轮历史(已截)。
   */
  history: Turn[]
}

/**
 * `messagesOf` 的返回。
 */
export type MessagesOfOut = ChatMessage[]

/**
 * `classify` 的入参。
 */
export type ClassifyIn = {
  /**
   * 本轮提问。
   */
  text: string

  /**
   * 回复语种。
   */
  lang: Lang

  /**
   * 提问时所在页路径。
   */
  path: string

  /**
   * 多轮历史(已截)。
   */
  history: Turn[]

  /**
   * 整段补全函数(注入)。
   */
  complete: CompleteFn
}

/**
 * `classify` 的返回:回包与失败码。模型挂了 / 回包不成形都不抛 —— 按「问题」记下,err 留痕。
 */
export type Classified = {
  /**
   * 校验后的回包;失败时是「问题」兜底形。
   */
  reply: ModelReply

  /**
   * 失败码(llm / parse);成功是 null。
   */
  err: string | null
}

/**
 * `classify` 的返回。
 */
export type ClassifyOut = Promise<Classified>

/**
 * `resolveSlots` 的入参。
 */
export type ResolveSlotsIn = {
  /**
   * 校验后的回包。
   */
  reply: ModelReply

  /**
   * 职业检索(注入)。
   */
  resolveNoc: NocResolveFn
}

/**
 * `resolveSlots` 的返回。
 */
export type ResolveSlotsOut = Promise<ResolvedSlots>

// =========================================================================
// 3. 请求体、线程与留痕(镜像 constants §3)
// =========================================================================

/**
 * 多轮历史里的一轮(校验后)。
 */
export type Turn = {
  /**
   * 谁说的。
   */
  role: 'user' | 'assistant'

  /**
   * 说了什么(已截)。
   */
  content: string
}

/**
 * 多轮历史(校验后)。
 */
export type TurnList = Turn[]

/**
 * 线上来的一轮:每格都可能没发。
 */
export type WireTurn = {
  /**
   * 谁说的。
   */
  role?: string

  /**
   * 说了什么。
   */
  content?: string
}

/**
 * 线上来的历史。
 */
export type WireTurnList = WireTurn[]

/**
 * POST /api/guide 的请求体(线格式:缺席 = 没发键)。
 */
export type GuideBody = {
  /**
   * 提问正文。
   */
  text?: string

  /**
   * 语种。
   */
  lang?: string

  /**
   * 提问时所在页路径(带参)。
   */
  path?: string

  /**
   * 多轮历史。
   */
  history?: WireTurn[]
}

/**
 * 校验后的输入:两态(必填 / null),不再有 `?:`。
 */
export type GuideInput = {
  /**
   * 提问正文(已 trim、已截);空串 = 没正文。
   */
  text: string

  /**
   * 语种(认不出已回落)。
   */
  lang: Lang

  /**
   * 所在页路径(已截);没发是空串。
   */
  path: string

  /**
   * 多轮历史(已截轮数与长度)。
   */
  history: Turn[]
}

/**
 * POST /api/guide/email 的请求体(线格式)。
 */
export type EmailBody = {
  /**
   * 那一轮的 asks.id。
   */
  id?: string | number

  /**
   * 那一串的 thread(与 id 一起认,防拿别人的 id 改邮箱)。
   */
  thread?: string

  /**
   * 邮箱。
   */
  email?: string
}

/**
 * 线上的留邮箱 body;不是 JSON 是 null。
 */
export type MaybeEmailBody = EmailBody | null

/**
 * `threadIdOf` 的入参。
 */
export type ThreadIdIn = {
  /**
   * 本轮提问。
   */
  text: string

  /**
   * 多轮历史。
   */
  history: Turn[]
}

/**
 * `guide` 的入参:校验后的输入 + 库 + 两个注入的函数。
 */
export type GuideIn = {
  /**
   * 库连接(池由路由注进来)。
   */
  db: Db

  /**
   * 校验后的输入。
   */
  input: GuideInput

  /**
   * 整段补全函数(注入)。
   */
  complete: CompleteFn

  /**
   * 职业检索(注入)。
   */
  resolveNoc: NocResolveFn
}

/**
 * 一轮的结果(对外形)。
 */
export type GuideResult = {
  /**
   * asks.id;写库失败是 null(留邮箱那步会跳过)。
   */
  id: number | null

  /**
   * 线程 id。
   */
  thread: string

  /**
   * 本串第几轮。
   */
  turn: number

  /**
   * 类别。
   */
  kind: Kind

  /**
   * 目的地键;非 nav 是 null。
   */
  dest: string | null

  /**
   * 带参的站内路径;非 nav 是 null。
   */
  url: string | null

  /**
   * 向导那一句;问题与建议是空串(前端用固定文案)。
   */
  say: string

  /**
   * 解析出的职业码(前端做胶囊用)。
   */
  noc: string | null

  /**
   * 解析出的省码。
   */
  prov: string | null
}

/**
 * `guide` 的返回。
 */
export type GuideOut = Promise<GuideResult>

/**
 * `recordAsk` 的入参:一行的全部格。
 */
export type RecordAskIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 线程 id。
   */
  thread: string

  /**
   * 本串第几轮。
   */
  turn: number

  /**
   * 语种。
   */
  lang: Lang

  /**
   * 所在页路径。
   */
  path: string

  /**
   * 提问原话(已截)。
   */
  question: string

  /**
   * 类别。
   */
  kind: Kind

  /**
   * 目的地键。
   */
  dest: string | null

  /**
   * 解析完的槽位(整份进 params 列)。
   */
  params: ResolvedSlots

  /**
   * 向导那一句。
   */
  say: string

  /**
   * 端到端耗时(毫秒)。
   */
  ms: number

  /**
   * 失败码;成功 null。
   */
  err: string | null
}

/**
 * `recordAsk` 的返回:新行 id;写库失败 null(已留痕)。
 */
export type RecordAskOut = Promise<number | null>

/**
 * `attachEmail` 的入参。
 */
export type AttachEmailIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 那一轮的 asks.id。
   */
  id: number

  /**
   * 那一串的 thread。
   */
  thread: string

  /**
   * 邮箱(已验形)。
   */
  email: string
}

/**
 * `attachEmail` 的返回:写到了没有(id 与 thread 对不上是 false)。
 */
export type AttachEmailOut = Promise<boolean>

/**
 * `ASK_INSERT` / `ASK_SET_EMAIL` 回来的一行原始列。
 */
export type AskIdDbRow = {
  /**
   * 主键。
   */
  id: number | string | null
}

/**
 * 洗净的 id 行。
 */
export type AskId = {
  /**
   * 主键。
   */
  id: number
}

/**
 * `toInput` 的入参:线上来的 body,可能整个是 null(不是 JSON)。
 */
export type ToInputIn = GuideBody | null

/**
 * `toEmailInput` 的返回:三格都验过;任一格不成形是 null。
 */
export type EmailInput = {
  /**
   * asks.id。
   */
  id: number

  /**
   * 线程 id。
   */
  thread: string

  /**
   * 邮箱。
   */
  email: string
}

/**
 * `toEmailInput` 的返回。
 */
export type MaybeEmailInput = EmailInput | null
