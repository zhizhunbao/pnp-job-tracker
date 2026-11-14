/**
 * 对话助手这一域的类型:线格式、校验后的输入、模型回复、链接、一轮的结果,以及每个函数的入参与返回。
 *
 * @author Frank
 * @time 2026-11-14 10:00:00
 */

import type { Db } from '../db'

// =========================================================================
// 1. 站内页面清单
// =========================================================================

/**
 * 回包里的一条链接:页面键(界面拿它取这页的名字)与服务端拼好的站内地址。
 */
export type Link = {
  /**
   * 页面键(PAGE_ROUTE 的键)。
   */
  key: string

  /**
   * 站内相对地址(带登记过的参数)。
   */
  url: string
}

/**
 * 可能没有的链接:页面键不在清单里是 null。
 */
export type MaybeLink = Link | null

/**
 * 一组链接。
 */
export type Links = Link[]

/**
 * 模型挑的一页(已验形,还没过清单):页面键与两个可带的参数。
 */
export type Pick = {
  /**
   * 页面键。
   */
  page: string

  /**
   * 省(模型给的原文;不是省码的在拼地址时丢)。
   */
  prov: string

  /**
   * 关键词(模型给的原文;拼地址时清洗截长)。
   */
  q: string
}

/**
 * 一组挑的页。
 */
export type Picks = Pick[]

/**
 * linksOf 的入参。
 */
export type LinksOfIn = {
  /**
   * 挑的页,按有用程度排。
   */
  picks: Picks
}

/**
 * pagePicksOf 的入参。
 */
export type PagePicksIn = {
  /**
   * 页面键清单。
   */
  pages: string[]

  /**
   * 两位省码;没有是空串。
   */
  prov: string
}

// =========================================================================
// 2. 类别与模型
// =========================================================================

/**
 * 一轮回复的三类。
 */
export type Kind = 'answer' | 'refuse' | 'off'

/**
 * 语种。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 发给模型的一条消息。
 */
export type ModelMessage = {
  /**
   * 谁说的。
   */
  role: 'system' | 'user' | 'assistant'

  /**
   * 说了什么。
   */
  content: string
}

/**
 * 调模型的入参(路由把 lib/llm 包成这个形状注进来)。
 */
export type CompleteIn = {
  /**
   * 整轮消息。
   */
  messages: ModelMessage[]
}

/**
 * 调模型的函数:回整段答案,失败抛错。
 */
export type CompleteFn = (input: CompleteIn) => Promise<string>

/**
 * 模型回的 JSON(线上形状,格格可缺,类型不可信;toModelReply 逐格验)。
 */
export type WireReply = {
  /**
   * 类别。
   */
  kind?: string

  /**
   * 正文。
   */
  say?: string

  /**
   * 挑的页。
   */
  links?: WirePick[]
}

/**
 * 模型回的一页(线上形状)。
 */
export type WirePick = {
  /**
   * 页面键。
   */
  page?: string

  /**
   * 省。
   */
  prov?: string

  /**
   * 关键词。
   */
  q?: string
}

/**
 * 可能不是对象的线上一页。
 */
export type MaybeWirePick = WirePick | null

/**
 * 从模型原文收出来的 JSON 对象;收不出来是 null。
 */
export type ParsedReply = object | null

/**
 * 把模型原文收成 JSON 对象的函数(路由注入 lib/resume 的那一只)。
 */
export type ParseFn = (text: string) => ParsedReply

/**
 * 验过形的模型回复。
 */
export type ModelReply = {
  /**
   * 类别;模型没给或给了不认的按 answer。
   */
  kind: Kind

  /**
   * 正文原文(还没删链接)。
   */
  say: string

  /**
   * 挑的页。
   */
  picks: Picks
}

/**
 * toModelReply 的入参。
 */
export type ToModelReplyIn = {
  /**
   * 收出来的 JSON 对象;null = 模型没按 JSON 回。
   */
  parsed: ParsedReply

  /**
   * 模型原文(没按 JSON 回时当正文用)。
   */
  raw: string
}

/**
 * userOf 的入参。
 */
export type UserOfIn = {
  /**
   * 本轮提问。
   */
  text: string

  /**
   * 界面语种。
   */
  lang: Lang

  /**
   * 这一段里之前几轮。
   */
  history: Turns
}

// =========================================================================
// 3. 输入边界
// =========================================================================

/**
 * 线上的一条历史(类型不可信)。
 */
export type WireTurn = {
  /**
   * 角色。
   */
  role?: string

  /**
   * 内容。
   */
  content?: string
}

/**
 * 可能不是对象的线上一条历史。
 */
export type MaybeWireTurn = WireTurn | null

/**
 * 线上的历史。
 */
export type WireTurns = MaybeWireTurn[]

/**
 * POST /api/assistant/chat 的请求体(线上形状,格格可缺)。
 */
export type ChatBody = {
  /**
   * 本轮提问。
   */
  text?: string

  /**
   * 界面语种。
   */
  lang?: string

  /**
   * 这一段里之前几轮(界面自己存着,每次带上)。
   */
  history?: WireTurns
}

/**
 * 可能不是对象的请求体。
 */
export type MaybeChatBody = ChatBody | null

/**
 * 一条校验后的历史。
 */
export type Turn = {
  /**
   * 角色。
   */
  role: 'user' | 'assistant'

  /**
   * 内容(已截长)。
   */
  content: string
}

/**
 * 校验后的历史。
 */
export type Turns = Turn[]

/**
 * 校验后的输入。
 */
export type ChatInput = {
  /**
   * 本轮提问(已 trim、已截);空串 = 没提问。
   */
  text: string

  /**
   * 界面语种。
   */
  lang: Lang

  /**
   * 最近几轮历史。
   */
  history: Turns
}

// =========================================================================
// 4. 移民话题闸与链接收口
// =========================================================================

/**
 * leaked 的入参。
 */
export type LeakedIn = {
  /**
   * 回复正文。
   */
  say: string

  /**
   * 这一轮发给模型的系统提示。
   */
  system: string
}

/**
 * isAdvice 的入参。
 */
export type AdviceIn = {
  /**
   * 删过链接的正文。
   */
  say: string

  /**
   * 这一轮是不是在找带 LMIA、签证或担保的职位、雇主。
   */
  seek: boolean
}

// =========================================================================
// 5. 限流
// =========================================================================

/**
 * limitsOf 的入参。
 */
export type LimitsIn = {
  /**
   * 来访 IP。
   */
  ip: string

  /**
   * 现在的毫秒时刻。
   */
  nowMs: number
}

/**
 * 一个配额位:计数键与上限(lib/quota 的 checkLimit 收的形状)。
 */
export type LimitPair = [string, number]

/**
 * 一组配额位。
 */
export type LimitPairs = LimitPair[]

// =========================================================================
// 6. 探活
// =========================================================================

/**
 * 探活函数回的结果(只读成败那一格)。
 */
export type ProbeFact = {
  /**
   * 盒子通不通。
   */
  ok: boolean
}

/**
 * 探活函数(路由注入 lib/llm 的 probeFriend)。
 */
export type ProbeFn = () => Promise<ProbeFact>

/**
 * getReady 的入参。
 */
export type GetReadyIn = {
  /**
   * 探活函数。
   */
  probe: ProbeFn

  /**
   * 现在的毫秒时刻。
   */
  nowMs: number
}

/**
 * 探活缓存:本域唯一的可变状态。
 */
export type ReadyCache = {
  /**
   * 上一次探活的毫秒时刻;0 = 还没探过。
   */
  readyAt: number

  /**
   * 上一次探活的结果。
   */
  ready: boolean
}

/**
 * GET /api/assistant/ready 的回包。
 */
export type ReadyOut = {
  /**
   * 助手现在能不能用;false 时界面不出入口。
   */
  ready: boolean
}

/**
 * getReady 的返回。
 */
export type GetReadyOut = Promise<ReadyOut>

// =========================================================================
// 7. 串号与留痕
// =========================================================================

/**
 * threadIdOf 的入参。
 */
export type ThreadIdIn = {
  /**
   * 本轮提问。
   */
  text: string

  /**
   * 这一段里之前几轮。
   */
  history: Turns
}

/**
 * 可能没有的一段字。
 */
export type MaybeText = string | null

/**
 * recordTurn 的返回:写完就完,没有值。
 */
export type RecordTurnOut = Promise<void>

/**
 * recordTurn 的入参:chat_logs 一行里本域写的八格。
 */
export type RecordTurnIn = {
  /**
   * 库连接。
   */
  db: Db

  /**
   * 串号。
   */
  thread: string

  /**
   * 第几轮。
   */
  turn: number

  /**
   * 语种。
   */
  lang: Lang

  /**
   * 提问原话。
   */
  question: string

  /**
   * 答复;没有是 null。
   */
  answer: string | null

  /**
   * 服务端是不是改过模型的结果。
   */
  degraded: boolean

  /**
   * 结果码;正常回答是 null。
   */
  err: string | null

  /**
   * 耗时毫秒。
   */
  ms: number
}

// =========================================================================
// 8. 一轮编排
// =========================================================================

/**
 * reply 的入参。
 */
export type ReplyIn = {
  /**
   * 库连接(留痕用;池由路由注进来)。
   */
  db: Db

  /**
   * 校验后的输入。
   */
  input: ChatInput

  /**
   * 调模型。
   */
  complete: CompleteFn

  /**
   * 收 JSON。
   */
  parse: ParseFn
}

/**
 * 一轮的结果。POST /api/assistant/chat 成功时的回包就是去掉 failed 的这几格。
 */
export type ReplyOut = {
  /**
   * 类别。
   */
  kind: Kind

  /**
   * 回复正文(不含任何链接);refuse 与 off 恒为空串,界面出固定的一句话。
   */
  say: string

  /**
   * 站内链接(只出自页面清单),最多 LINKS_MAX 条。
   */
  links: Links

  /**
   * 串号。
   */
  thread: string

  /**
   * 第几轮(1 起)。
   */
  turn: number

  /**
   * 模型没答上来(路由回 502)。
   */
  failed: boolean
}

/**
 * reply 的返回。
 */
export type ReplyDone = Promise<ReplyOut>

/**
 * 收口后的一轮:类别、正文、链接,以及服务端是不是改过模型的结果。
 */
export type Settled = {
  /**
   * 类别。
   */
  kind: Kind

  /**
   * 回复正文。
   */
  say: string

  /**
   * 站内链接。
   */
  links: Links

  /**
   * 服务端是不是改过模型的结果。
   */
  degraded: boolean
}

/**
 * settle 的入参。
 */
export type SettleIn = {
  /**
   * 验过形的模型回复。
   */
  reply: ModelReply

  /**
   * 这一轮发给模型的系统提示(查有没有被抖出来)。
   */
  system: string

  /**
   * 从提问里认出的省码;没有是空串。
   */
  prov: string

  /**
   * 这一轮是不是在找带 LMIA、签证或担保的职位、雇主(是的话正文里提到这几个字不算谈移民)。
   */
  seek: boolean
}

/**
 * fixedOf 的入参。
 */
export type FixedIn = {
  /**
   * 类别(refuse 或 off)。
   */
  kind: Kind

  /**
   * 从提问里认出的省码;没有是空串。
   */
  prov: string

  /**
   * 服务端是不是改过模型的结果。
   */
  degraded: boolean
}
