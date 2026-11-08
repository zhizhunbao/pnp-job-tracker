/**
 * 账本子桶的行为:算最坏成本、原子预扣、按真实用量结算、记免费通道与被拦调用、判失败怎么收场。
 * 🔴 口径:任何一步拿不准都按「花不起」处理(模型不在价表、输入超线、库连不上、表没建),宁可降级不可超额。
 * 父桶 functions.ts 早已超 1000 行(基线存量),新关注点照 pathways/fit 的形开子桶。
 *
 * @author Frank
 * @time 2026-11-08 12:00:00
 */
import { queryRows, SQL } from '../../db'
import { LEDGER_LOG, log } from '../../log'
import {
  BUDGET_ERROR_RE, CHANNEL_ANTHROPIC, ERROR_LEN_MAX, ERROR_NONE, INPUT_BYTES_MAX, INPUT_OVERHEAD_TOKENS, MODEL_PRICE,
  STATE, STATUS_BAD_REQUEST, STATUS_CLIENT_MIN, STATUS_SERVER_MIN, STATUS_TOO_MANY, TOKENS_PER_PRICE, USD_SCALE,
} from './constants'
import type {
  Fate, FateIn, HoldDbRow, InputBytesIn, MaybePrice, MaybeText, MaybeTokens, MaybeUsd, PriceTable, RecordIn, ReserveIn,
  ReserveOut, SettleIn, UsageCostIn, WorstCostIn, WriteOut,
} from './types'

// =========================================================================
// 1. 单价
// =========================================================================

/**
 * 查模型单价。
 *
 * @param model 模型 id。
 * @returns 单价;表外的模型是 null。
 */
function priceOf(model: string): MaybePrice {
  const table: PriceTable = MODEL_PRICE
  const price = table[model]
  if (price == null) {
    return null
  }
  return price
}

/**
 * 一次调用的最坏成本:输入按字节上界算,输出按 max_tokens 算满。
 *
 * @param x 模型、输入字节数、输出上限。
 * @returns 美元;模型不在价表或输入超线是 null。
 */
export function worstCostOf(x: WorstCostIn): MaybeUsd {
  const price = priceOf(x.model)
  if (price == null || x.inputBytes > INPUT_BYTES_MAX) {
    return null
  }
  const raw = ((x.inputBytes + INPUT_OVERHEAD_TOKENS) * price.in + x.maxTokens * price.out) / TOKENS_PER_PRICE
  return Math.ceil(raw * USD_SCALE) / USD_SCALE
}

/**
 * 按上游报的用量算实际成本。
 *
 * @param x 模型与用量。
 * @returns 美元;模型不在价表是 null。
 */
export function usageCostOf(x: UsageCostIn): MaybeUsd {
  const price = priceOf(x.model)
  if (price == null) {
    return null
  }
  const write = tokensOf(x.usage.cache_creation_input_tokens)
  const read = tokensOf(x.usage.cache_read_input_tokens)
  const raw = (x.usage.input_tokens * price.in + x.usage.output_tokens * price.out
    + write * price.cacheWrite + read * price.cacheRead) / TOKENS_PER_PRICE
  return Math.ceil(raw * USD_SCALE) / USD_SCALE
}

/**
 * 可空的 token 格收成数字:没报就是 0。
 *
 * @param n 上游那一格。
 * @returns token 数。
 */
function tokensOf(n: MaybeTokens): number {
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 整轮消息的 UTF-8 字节数(输入 token 的上界)。
 *
 * @param x 整轮消息。
 * @returns 字节数。
 */
export function inputBytesOf(x: InputBytesIn): number {
  const enc = new TextEncoder()
  let n = 0
  for (const m of x.messages) {
    n += enc.encode(m.content).length
  }
  return n
}

/**
 * 整轮消息的字符数(进用量行)。
 *
 * @param x 整轮消息。
 * @returns 字符数。
 */
export function inputCharsOf(x: InputBytesIn): number {
  let n = 0
  for (const m of x.messages) {
    n += m.content.length
  }
  return n
}

// =========================================================================
// 2. 预扣与结算
// =========================================================================

/**
 * 发 Claude 请求之前先扣下最坏成本。零行、报错都算花不起。
 *
 * @param x 功能、模型、输入量、输出上限。
 * @returns 这笔预扣;花不起是 null。
 */
export async function reserve(x: ReserveIn): ReserveOut {
  const worst = worstCostOf({ model: x.model, inputBytes: x.inputBytes, maxTokens: x.maxTokens })
  if (worst == null) {
    log({ tag: LEDGER_LOG.tag, text: LEDGER_LOG.unpriced + x.feature + LEDGER_LOG.modelFrag + x.model })
    return null
  }
  let ids: string[]
  try {
    ids = await queryRows({
      db: x.db, sql: SQL.AI_RESERVE, params: [worst, x.feature, CHANNEL_ANTHROPIC, x.model, x.inputChars], map: toHoldId,
    })
  } catch (e) {
    log({ tag: LEDGER_LOG.tag, text: LEDGER_LOG.reserveFailed + x.feature + LEDGER_LOG.whyFrag + String(e) })
    return null
  }
  const id = ids[0]
  if (id == null) {
    log({ tag: LEDGER_LOG.tag, text: LEDGER_LOG.blocked + x.feature + LEDGER_LOG.costFrag + worst })
    await record({
      db: x.db, feature: x.feature, channel: CHANNEL_ANTHROPIC, model: x.model, state: STATE.blocked, degradedFrom: null,
      inputChars: x.inputChars, outputChars: 0, ms: null, error: ERROR_NONE, inputTokens: null, outputTokens: null,
    })
    return null
  }
  return { id: id, reservedUsd: worst }
}

/**
 * 预扣行 → 用量行 id。
 *
 * @param row 一行。
 * @returns id。
 */
function toHoldId(row: HoldDbRow): string {
  return String(row.id)
}

/**
 * 结算一笔预扣。写不成只留痕:答案已经拿到,预扣留在账上,方向是多记不是少记。
 *
 * @param x 预扣、终态、实际成本与用量。
 * @returns 无。
 */
export async function settle(x: SettleIn): WriteOut {
  let input: number | null = null
  let output: number | null = null
  let read: number | null = null
  let write: number | null = null
  if (x.usage != null) {
    input = x.usage.input_tokens
    output = x.usage.output_tokens
    read = x.usage.cache_read_input_tokens
    write = x.usage.cache_creation_input_tokens
  }
  try {
    await x.db.query(SQL.AI_SETTLE, [
      x.hold.id, x.state, x.costUsd, input, output, read, write, x.ms, errorCapOf(x.error), x.outputChars, null,
    ])
  } catch (e) {
    log({ tag: LEDGER_LOG.tag, text: LEDGER_LOG.settleFailed + x.hold.id + LEDGER_LOG.whyFrag + String(e) })
  }
}

/**
 * 记一次不走预扣的调用。写不成只留痕,不影响这次调用的结果。
 *
 * @param x 功能、通道、状态与用量。
 * @returns 无。
 */
export async function record(x: RecordIn): WriteOut {
  try {
    await x.db.query(SQL.AI_RECORD, [
      x.feature, x.channel, x.model, x.state, x.degradedFrom, x.inputChars, x.outputChars, x.ms, errorCapOf(x.error),
      x.inputTokens, x.outputTokens,
    ])
  } catch (e) {
    log({ tag: LEDGER_LOG.tag, text: LEDGER_LOG.recordFailed + x.feature + LEDGER_LOG.whyFrag + String(e) })
  }
}

/**
 * 失败原因进库前截断。
 *
 * @param error 失败原因。
 * @returns 截断后的原因;没有是 null。
 */
function errorCapOf(error: MaybeText): MaybeText {
  if (error == null) {
    return null
  }
  return error.slice(0, ERROR_LEN_MAX)
}

// =========================================================================
// 3. 失败分类
// =========================================================================

/**
 * 一次 Claude 失败怎么收场:请求本身有问题的退款并报错;额度耗尽、限流、鉴权类退款并换通道;
 * 5xx 与断连结局不明,按预扣全额记账再换通道。
 *
 * @param x HTTP 状态与报错正文。
 * @returns 终态、记不记账、换不换通道。
 */
export function fateOf(x: FateIn): Fate {
  if (x.status == null || x.status >= STATUS_SERVER_MIN) {
    return { state: STATE.unknown, keepHold: true, degrade: true }
  }
  if (x.status === STATUS_BAD_REQUEST && BUDGET_ERROR_RE.test(x.message) === false) {
    return { state: STATE.failed, keepHold: false, degrade: false }
  }
  if (x.status >= STATUS_CLIENT_MIN || x.status === STATUS_TOO_MANY) {
    return { state: STATE.failed, keepHold: false, degrade: true }
  }
  return { state: STATE.unknown, keepHold: true, degrade: true }
}
