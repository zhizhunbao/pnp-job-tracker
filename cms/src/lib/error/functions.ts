/**
 * 失败域的行为:唯一一处造错与判错。不用 class —— 抛出去的是原生 `Error`,
 * 身份挂在 `name` 上,判定走类型谓词(跨模块边界照样认得出,vi.mock 也打不哑)。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

import {
  CHAT_ERR_NAME, ERR_BY_STATUS, ERR_BY_TYPE, ERR_DEFAULT, ERR_FIELD_NONE, ERR_MSG_MAX, ERR_NAME, ERR_TAIL_NONE,
  HTTP_ERROR_TYPE, LEGACY_TOO_LONG, LEGACY_TOO_LONG_TYPE, MART_ERR_NAME, MART_HEAD, MART_META_TAIL,
  MART_NO_SOURCE_HEAD, MART_NO_SOURCE_MID, MART_NO_SOURCE_TAIL, MART_SHARD_MID, MART_SHARD_OF, MART_SHARD_TAIL,
  MSG_SEP, TRANSLATE_ERR_NAME,
} from './constants'
import type {
  ChatErrorIn, ChatErrorOut, ChatFailure, FailIn, FailOut, GatewayErrorBody, GatewayErrorIn, GatewayErrorOfIn,
  GatewayErrorOfOut, GatewayErrorOut, GatewayFailure, HasNameIn, HasNameOut, LlmErrorIn, LlmErrorOut, LlmFailure,
  MartErrorOut, MartMetaErrorIn, MartShardErrorIn, MartSourceErrorIn, TranslateErrorIn, TranslateErrorOut,
} from './types'

// =========================================================================
// 1. 机制
// =========================================================================

/**
 * 造一个失败。堆栈是真的,所以留痕里看得见抛点。
 *
 * @param input 身份、消息、错误码。
 * @returns 一个原生 Error,带上这三样。
 */
export function fail<Code extends string | null>(input: FailIn<Code>): FailOut<Code> {
  // eslint-disable-next-line local/no-new-error -- 本域就是「造错」的家:全站唯一合法的 new Error 就是这一行
  return Object.assign(new Error(input.msg), { name: input.name, code: input.code })
}

/**
 * 判它是不是那一种失败。调用方先用 `instanceof Error` 收窄,再交给它。
 *
 * @param input 接住的错与期待的身份。
 * @returns 是不是这一种失败。
 */
export function hasName(input: HasNameIn): HasNameOut {
  return input.err.name === input.name
}

// =========================================================================
// 2. 模型域(lib/llm)
// =========================================================================

/**
 * 造一个见客的失败。码透到路由层,让「各说各话」成立。
 *
 * @param input 给用户看的话与可选的错误码。
 * @returns 见客的失败。
 */
export function llmError(input: LlmErrorIn): LlmErrorOut {
  return fail({ name: ERR_NAME.llm, msg: input.msg, code: input.code })
}

/**
 * 造一个网关层的失败。出口那一层再把码翻成给用户看的话。
 *
 * @param input 技术留痕与错误码。
 * @returns 网关层的失败。
 */
export function gatewayError(input: GatewayErrorIn): GatewayErrorOut {
  return fail({ name: ERR_NAME.gateway, msg: input.msg, code: input.code })
}

/**
 * 判它是不是见客的失败。是的话,它的 message 可以直接发给用户。
 *
 * @param err catch 里接住、已经收窄成 Error 的那个。
 * @returns 是不是见客的那一种。
 */
export function isLlmError(err: Error): err is LlmFailure {
  return hasName({ err, name: ERR_NAME.llm })
}

/**
 * 判它是不是网关层的失败。是的话,它的 message 只能进日志。
 *
 * @param err catch 里接住、已经收窄成 Error 的那个。
 * @returns 是不是网关层的那一种。
 */
export function isGatewayError(err: Error): err is GatewayFailure {
  return hasName({ err, name: ERR_NAME.gateway })
}

/**
 * 把上游回包认成我们的错误码。认不出的按 HTTP 状态兜底。
 *
 * 非 JSON 回包解不动就跳过,按 HTTP 状态兜底认码。
 *
 * @param input HTTP 状态与原始回包正文。
 * @returns 认好码的网关失败。
 */
export function gatewayErrorOf(input: GatewayErrorOfIn): GatewayErrorOfOut {
  let type = ERR_FIELD_NONE
  let message = ERR_FIELD_NONE
  try {
    const parsed: GatewayErrorBody = JSON.parse(input.body)
    if (parsed.error != null) {
      if (parsed.error.type != null) {
        type = String(parsed.error.type)
      } else if (parsed.error.code != null) {
        type = String(parsed.error.code)
      }
      if (parsed.error.message != null) {
        message = String(parsed.error.message)
      }
    }
    if (type === '' && parsed.detail != null) {
      const detail = String(parsed.detail)
      if (LEGACY_TOO_LONG.test(detail)) {
        type = LEGACY_TOO_LONG_TYPE
        message = detail
      }
    }
  } catch {}
  const code = ERR_BY_TYPE[type] || ERR_BY_STATUS[input.status] || ERR_DEFAULT
  let tail = ERR_TAIL_NONE
  if (message !== '') {
    tail = MSG_SEP + message.slice(0, ERR_MSG_MAX)
  }
  return gatewayError({ msg: `${input.status} ${type || HTTP_ERROR_TYPE}${tail}`, code })
}

// =========================================================================
// 3. 逐行翻译链
// =========================================================================

/**
 * 造一个翻译链的失败。
 *
 * 只有造没有判:这条链的失败没人按码分流,路由一律当「翻不了」处理。零消费者的判定函数不写。
 *
 * @param input 留痕与错误码。
 * @returns 翻译链的失败。
 */
export function translateError(input: TranslateErrorIn): TranslateErrorOut {
  return fail({ name: TRANSLATE_ERR_NAME, msg: input.msg, code: input.code })
}

// =========================================================================
// 5. 对话域(lib/chat)
// =========================================================================

/**
 * 造一个对话编排的失败。
 *
 * @param input 错误码、留痕、可选的槽位。
 * @returns 对话编排的失败。
 */
export function chatError<Slots>(input: ChatErrorIn<Slots>): ChatErrorOut<Slots> {
  return Object.assign(fail({ name: CHAT_ERR_NAME, msg: input.msg, code: input.code }), { slots: input.slots })
}

/**
 * 判它是不是对话编排的失败。调用方先用 `instanceof Error` 收窄,再交给它,
 * 并在这一行把自己的槽位类型填进去(`isChatError<Slots>(e)`)。
 *
 * @param err catch 里接住、已经收窄成 Error 的那个。
 * @returns 是不是对话编排的那一种。
 */
export function isChatError<Slots>(err: Error): err is ChatFailure<Slots> {
  return hasName({ err, name: CHAT_ERR_NAME })
}

// =========================================================================
// 交接域(lib/mart)—— seed 读 mart 文件的三种失败(2026-08-26 形制批)
// =========================================================================

/**
 * 造一个「meta 声明无效」的失败(片数解析不出或小于 1)。
 *
 * @param input 出事的 meta 文件名。
 * @returns mart 文件失败。
 */
export function martMetaError(input: MartMetaErrorIn): MartErrorOut {
  return fail({ name: MART_ERR_NAME, msg: MART_HEAD + input.file + MART_META_TAIL, code: null })
}

/**
 * 造一个「分片缺失」的失败(半程上传 → 整事务回滚)。
 *
 * @param input 表名、缺的片号与总片数。
 * @returns mart 文件失败。
 */
export function martShardError(input: MartShardErrorIn): MartErrorOut {
  return fail({
    name: MART_ERR_NAME,
    msg: MART_HEAD + input.name + MART_SHARD_MID + input.k + MART_SHARD_OF + input.parts + MART_SHARD_TAIL,
    code: null,
  })
}

/**
 * 造一个「数据目录全无」的失败(本轮上传丢失,如部署重启清 /tmp → 整事务回滚)。
 *
 * @param input 两级目录路径。
 * @returns mart 文件失败。
 */
export function martSourceError(input: MartSourceErrorIn): MartErrorOut {
  return fail({
    name: MART_ERR_NAME,
    msg: MART_NO_SOURCE_HEAD + input.tmp + MART_NO_SOURCE_MID + input.local + MART_NO_SOURCE_TAIL,
    code: null,
  })
}
