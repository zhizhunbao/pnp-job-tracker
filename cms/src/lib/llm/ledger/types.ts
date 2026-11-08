/**
 * 账本子桶的形状:预扣、结算、记账三道入口的入参,以及上游用量的线上形状。
 *
 * @author Frank
 * @time 2026-11-08 12:00:00
 */
import type { Db } from '@/lib/db'

// =========================================================================
// 1. 单价
// =========================================================================

/**
 * 一个模型的单价,美元每百万 token。
 */
export type ModelPrice = {
  /**
   * 输入
   */
  in: number

  /**
   * 输出
   */
  out: number

  /**
   * 写缓存
   */
  cacheWrite: number

  /**
   * 读缓存
   */
  cacheRead: number
}

/**
 * 按模型 id 查单价;表外的模型没有。
 */
export type PriceTable = Record<string, ModelPrice>

/**
 * 一个模型的单价;表外的模型是 null。
 */
export type MaybePrice = ModelPrice | null

/**
 * 上游可能不报的 token 数。
 */
export type MaybeTokens = number | null

/**
 * 可能没有的一段话。
 */
export type MaybeText = string | null

/**
 * worstCostOf 的入参。
 */
export type WorstCostIn = {
  /**
   * 模型 id
   */
  model: string

  /**
   * 输入的 UTF-8 字节数
   */
  inputBytes: number

  /**
   * 输出上限
   */
  maxTokens: number
}

/**
 * 美元金额;null = 算不出,不许发。
 */
export type MaybeUsd = number | null

/**
 * Anthropic 回包里的 usage(线上形状,只声明读的格)。
 */
export type UsageJson = {
  /**
   * 未走缓存的输入 token
   */
  input_tokens: number

  /**
   * 输出 token
   */
  output_tokens: number

  /**
   * 写缓存的 token;没用缓存时可能是 null
   */
  cache_creation_input_tokens: number | null

  /**
   * 读缓存的 token;没用缓存时可能是 null
   */
  cache_read_input_tokens: number | null
}

/**
 * usageCostOf 的入参。
 */
export type UsageCostIn = {
  /**
   * 模型 id
   */
  model: string

  /**
   * 上游报的用量
   */
  usage: UsageJson
}

// =========================================================================
// 2. 预扣与结算
// =========================================================================

/**
 * reserve 的入参。
 */
export type ReserveIn = {
  /**
   * 连接
   */
  db: Db

  /**
   * 功能名
   */
  feature: string

  /**
   * 模型 id
   */
  model: string

  /**
   * 输入的 UTF-8 字节数
   */
  inputBytes: number

  /**
   * 输入字符数
   */
  inputChars: number

  /**
   * 输出上限
   */
  maxTokens: number
}

/**
 * 预扣语句回的一行。
 */
export type HoldDbRow = {
  /**
   * 用量行 id
   */
  id: string | number
}

/**
 * 一笔在途预扣。
 */
export type Hold = {
  /**
   * 用量行 id
   */
  id: string

  /**
   * 预扣的最坏成本
   */
  reservedUsd: number
}

/**
 * reserve 的出参;null = 花不起,不许发。
 */
export type ReserveOut = Promise<Hold | null>

/**
 * settle 的入参。
 */
export type SettleIn = {
  /**
   * 连接
   */
  db: Db

  /**
   * 要结算的预扣
   */
  hold: Hold

  /**
   * 终态
   */
  state: string

  /**
   * 实际成本
   */
  costUsd: number

  /**
   * 上游报的用量;失败时没有
   */
  usage: UsageJson | null

  /**
   * 耗时毫秒
   */
  ms: number

  /**
   * 失败原因;成功时没有
   */
  error: string | null

  /**
   * 拿回来的字符数
   */
  outputChars: number
}

/**
 * record 的入参。
 */
export type RecordIn = {
  /**
   * 连接
   */
  db: Db

  /**
   * 功能名
   */
  feature: string

  /**
   * 通道
   */
  channel: string

  /**
   * 模型 id
   */
  model: string

  /**
   * 状态
   */
  state: string

  /**
   * 从哪个通道降级来的;没降级没有
   */
  degradedFrom: string | null

  /**
   * 输入字符数
   */
  inputChars: number

  /**
   * 拿回来的字符数
   */
  outputChars: number

  /**
   * 耗时毫秒;没发请求没有
   */
  ms: number | null

  /**
   * 输入 token;上游没报是 null
   */
  inputTokens: number | null

  /**
   * 输出 token;上游没报是 null
   */
  outputTokens: number | null

  /**
   * 失败原因;成功时没有
   */
  error: string | null
}

/**
 * 写库函数的出参。
 */
export type WriteOut = Promise<void>

// =========================================================================
// 3. 失败分类
// =========================================================================

/**
 * fateOf 的入参。
 */
export type FateIn = {
  /**
   * HTTP 状态;断连没有
   */
  status: number | null

  /**
   * 上游的报错正文
   */
  message: string
}

/**
 * 一次失败怎么收场。
 */
export type Fate = {
  /**
   * 用量行的终态
   */
  state: string

  /**
   * 预扣是否全额记账(否 = 全退)
   */
  keepHold: boolean

  /**
   * 是否换备用通道
   */
  degrade: boolean
}

// =========================================================================
// 4. 输入量
// =========================================================================

/**
 * 一条消息(只声明读的格)。
 */
export type LedgerMessage = {
  /**
   * 正文
   */
  content: string
}

/**
 * inputBytesOf 的入参。
 */
export type InputBytesIn = {
  /**
   * 整轮消息
   */
  messages: LedgerMessage[]
}
