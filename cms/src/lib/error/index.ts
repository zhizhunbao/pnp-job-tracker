/**
 * 失败域的桶 —— 全站唯一的造错/判错入口(2026-08-23 自 lib/error.ts 升目录,按十件套分抽屉;
 * `../error` 与 `@/lib/error` 的既有 import 经本桶原样续命)。门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

export type {
  ChatErrCode, ChatErrorIn, ChatErrorOut, ChatFailure, FailIn, FailOut, Failure, FriendErrCode,
  GatewayErrorBody, GatewayErrorIn, GatewayErrorOfIn, GatewayErrorOfOut, GatewayErrorOut, GatewayFailure,
  HasNameIn, HasNameOut, LlmErrorIn, LlmErrorOut, LlmFailure, MartErrorOut, MartMetaErrorIn, MartShardErrorIn,
  MartSourceErrorIn, TranslateErrCode, TranslateErrorIn, TranslateErrorOut, TranslateFailure,
} from './types'
export {
  CHAT_CODE, CHAT_ERR_NAME, ERR_BY_STATUS, ERR_BY_TYPE, ERR_DEFAULT, ERR_MSG_MAX, ERR_NAME, FRIEND_CODE,
  FRIEND_MSG, GATEWAY_MSG, LEGACY_TOO_LONG, LEGACY_TOO_LONG_TYPE, LLM_MSG, MART_ERR_NAME, POINTS_ERR,
  TRANSLATE_CODE, TRANSLATE_ERR_NAME, TRANSLATE_TIMEOUT, UPSTREAM_HEAD,
} from './constants'
export {
  chatError, fail, gatewayError, gatewayErrorOf, hasName, isChatError, isGatewayError, isLlmError, llmError,
  martMetaError, martShardError, martSourceError, translateError,
} from './functions'
