/**
 * 全站的失败:唯一一处造错与判错,错误码、话术、上游回包的映射表也都在这里。
 *
 * 不用 class。抛出去的是原生 `Error`,身份挂在 `name` 上,判定走各域的类型谓词。
 * 为什么这么定、两种失败为什么不合成一种:见 docs/implementation/文案收拢/14_lib-llm域重构.md §4。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

// =========================================================================
// 1. 机制
// =========================================================================

/**
 * 一个失败:原生 Error 加上域自己的错误码。Code 允许含 undefined,因为有的域的码是可选的。
 */
export type Failure<Code extends string | undefined> = Error & { code: Code }

/**
 * `fail` 的入参。
 */
export type FailIn<Code extends string | undefined> = {
  /**
   * 身份。判定认的就是它,取值见 ERR_NAME。
   */
  name: string

  /**
   * 这个失败对外说什么。见客还是留痕,由造它的那一层决定。
   */
  msg: string

  /**
   * 域自己的错误码。
   */
  code: Code
}

/**
 * `hasName` 的入参。
 */
export type HasNameIn = {
  /**
   * catch 里接住、已经用 `instanceof Error` 收窄过的那个。
   */
  err: Error

  /**
   * 期待的身份。
   */
  name: string
}

/**
 * 是不是这一种失败。
 */
export type HasNameOut = boolean

/**
 * 造一个失败。堆栈是真的,所以留痕里看得见抛点。
 *
 * @param input 身份、消息、错误码。
 * @returns 一个原生 Error,带上这三样。
 */
export function fail<Code extends string | undefined>(input: FailIn<Code>): Failure<Code> {
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
 * 两种失败的 `name`,判定认的就是这两个字符串。
 */
export const ERR_NAME = {
  /**
   * 见客的那一种。
   */
  llm: 'LlmError',

  /**
   * 网关那一种。名字沿用旧类名,因为生产日志是靠它 grep 的。
   */
  gateway: 'FriendLlmError',
}

/**
 * 朋友网关的七种失败。路由按它「各说各话」,不再一律回「稍后再试」。
 */
export type FriendErrCode =
  | 'offline'      // 未配置 env / 连不上 / DNS 挂了(旧链也没救)
  | 'tooLong'      // 输入超 FRIEND_INPUT_MAX(本地预检 或 上游 context_length_exceeded)
  | 'timeout'      // 我们这侧 abort 或上游 upstream_timeout(504)
  | 'upstream'     // 上游模型炸了(502 upstream_error)——回退也失败才会抛出来
  | 'authKey'      // key 错/缺(401 invalid_api_key)= 运维问题,重试没用
  | 'badRequest'   // 400 invalid_request_error = 我们发的 body 不对,是 bug
  | 'empty'        // 200 但答案是空串

/**
 * 见客的失败。它的 message 会原样进 HTTP 响应体,用户逐字读得到。
 */
export type LlmFailure = Error & { code?: FriendErrCode }

/**
 * 网关层的失败。它的 message 是技术留痕,只进日志;错误码一定有。
 */
export type GatewayFailure = Error & { code: FriendErrCode }

/**
 * `llmError` 的入参。
 */
export type LlmErrorIn = {
  /**
   * 给用户看的话。
   */
  msg: string

  /**
   * 错误码。三个后端的老抛点没有码,路由按兜底处理。
   */
  code?: FriendErrCode
}

/**
 * `gatewayError` 的入参。
 */
export type GatewayErrorIn = {
  /**
   * 技术留痕。
   */
  msg: string

  /**
   * 网关的失败一定带码。
   */
  code: FriendErrCode
}

/**
 * 造一个见客的失败。码透到路由层,让「各说各话」成立。
 *
 * @param input 给用户看的话与可选的错误码。
 * @returns 见客的失败。
 */
export function llmError(input: LlmErrorIn): LlmFailure {
  return fail({ name: ERR_NAME.llm, msg: input.msg, code: input.code })
}

/**
 * 造一个网关层的失败。出口那一层再把码翻成给用户看的话。
 *
 * @param input 技术留痕与错误码。
 * @returns 网关层的失败。
 */
export function gatewayError(input: GatewayErrorIn): GatewayFailure {
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
 * 上游的错误结构。新链给 `error`,旧链没换、给的还是 `detail`,两个都认。
 */
export type GatewayErrorBody = {
  /**
   * 新链的标准结构。type 与 code 认哪个都行,message 只进留痕。
   */
  error?: { type?: string; code?: string; message?: string }

  /**
   * 旧链的结构。超长报的就是这一句。
   */
  detail?: string
}

/**
 * `gatewayErrorOf` 的入参。
 */
export type GatewayErrorOfIn = {
  /**
   * HTTP 状态。type 认不出来时按它兜底。
   */
  status: number

  /**
   * 原始回包正文。JSON 解不动就整个跳过。
   */
  body: string
}

/**
 * 上游标准错误结构的 type 对到我们的错误码。
 */
export const ERR_BY_TYPE: Record<string, FriendErrCode> = {
  /**
   * 输入超过了上游的字符上限。
   */
  context_length_exceeded: 'tooLong',

  /**
   * 上游自己等超时了。
   */
  upstream_timeout: 'timeout',

  /**
   * 上游模型炸了。它和 offline 是仅有的两种值得回退旧链的失败。
   */
  upstream_error: 'upstream',

  /**
   * 钥匙不对。这是运维问题,重试没用。
   */
  invalid_api_key: 'authKey',

  /**
   * 我们发的 body 不对,属于我们这侧的 bug。
   */
  invalid_request_error: 'badRequest',
}

/**
 * 认不出 type 时,按 HTTP 状态兜底。
 */
export const ERR_BY_STATUS: Record<number, FriendErrCode> = {
  400: 'badRequest', 401: 'authKey', 403: 'authKey', 502: 'upstream', 504: 'timeout',
}

/**
 * 兜底的兜底:状态也认不出来,当上游炸了。
 */
export const ERR_DEFAULT: FriendErrCode = 'upstream'

/**
 * 认旧链超长用的。不单独认一下的话,回退链上的超长会被当成 badRequest,
 * 用户侧又变回一句笼统的「稍后再试」。
 */
export const LEGACY_TOO_LONG = /too long/i

/**
 * 认出旧链的超长之后,统一换成新链的 type,下游只需要认一种。
 */
export const LEGACY_TOO_LONG_TYPE = 'context_length_exceeded'

/**
 * 错误 message 进错误对象时的截断上限。
 */
export const ERR_MSG_MAX = 200

/**
 * 把上游回包认成我们的错误码。认不出的按 HTTP 状态兜底。
 *
 * @param input HTTP 状态与原始回包正文。
 * @returns 认好码的网关失败。
 */
export function gatewayErrorOf(input: GatewayErrorOfIn): GatewayFailure {
  let type = ''
  let message = ''
  try {
    const parsed: GatewayErrorBody = JSON.parse(input.body)
    type = String(parsed?.error?.type || parsed?.error?.code || '')
    message = String(parsed?.error?.message || '')
    if (!type) {
      const detail = String(parsed?.detail || '')
      if (LEGACY_TOO_LONG.test(detail)) { type = LEGACY_TOO_LONG_TYPE; message = detail }
    }
  } catch {
    /* 非 JSON 回包,下面按状态兜底 */
  }
  const code = ERR_BY_TYPE[type] || ERR_BY_STATUS[input.status] || ERR_DEFAULT
  const tail = message ? `: ${message.slice(0, ERR_MSG_MAX)}` : ''
  return gatewayError({ msg: `${input.status} ${type || 'http_error'}${tail}`, code })
}

// =========================================================================
// 3. 逐行翻译链
// =========================================================================

/**
 * 翻译链失败的身份。
 */
export const TRANSLATE_ERR_NAME = 'TranslateError'

/**
 * 上游非 200 时留的痕,后面接状态码。
 */
export const UPSTREAM_HEAD = 'upstream '

/**
 * 我们这侧掐断时报的话。
 */
export const TRANSLATE_TIMEOUT = 'timeout'

/**
 * 翻译链只有这两种失败。上游非 200 只在重试循环里当控制流,不会离开函数;掐断的那个会冒到路由。
 */
export type TranslateErrCode = 'upstream' | 'timeout'

/**
 * 翻译链的失败。它只进日志和重试判断,不会给用户看到。
 */
export type TranslateFailure = Error & { code: TranslateErrCode }

/**
 * `translateError` 的入参。
 */
export type TranslateErrorIn = {
  /**
   * 留痕。
   */
  msg: string

  /**
   * 上游炸了还是我们掐的。
   */
  code: TranslateErrCode
}

/**
 * 造一个翻译链的失败。
 *
 * 只有造没有判:这条链的失败没人按码分流,路由一律当「翻不了」处理。零消费者的判定函数不写。
 *
 * @param input 留痕与错误码。
 * @returns 翻译链的失败。
 */
export function translateError(input: TranslateErrorIn): TranslateFailure {
  return fail({ name: TRANSLATE_ERR_NAME, msg: input.msg, code: input.code })
}

// =========================================================================
// 4. 失败的话术
// =========================================================================

/**
 * 网关的错误码对到给用户看的话。路由再决定 HTTP 状态与错误字段,见 api/resume-match。
 *
 * 这一段是技术债:按宪法「给人看的文案只有一个家 lib/i18n/」,它该在那儿,而且该有三语。
 * 这轮只收位置不搬文案,别再往下加。
 */
export const FRIEND_MSG: Record<FriendErrCode, string> = {
  /**
   * 连不上。分不清是服务挂了还是网断了,所以统一说这一句。
   */
  offline: '无法连接本地模型服务,请稍后再试。',

  /**
   * 这句要让用户明白:重试没用,得自己删内容。
   */
  tooLong: '输入太长,超过模型服务的单次上限。',

  /**
   * 超时重试有用,所以说「稍后再试」。
   */
  timeout: '模型服务响应超时,请稍后再试。',

  /**
   * 上游炸了,重试同样有用。
   */
  upstream: '模型服务暂时不可用,请稍后再试。',

  /**
   * 是运维问题,但对用户也只能说到这个程度。
   */
  authKey: '模型服务鉴权失败(API key 无效)。',

  /**
   * 是我们的 bug,对用户只能这么说。
   */
  badRequest: '模型服务拒绝了本次请求(请求格式不对)。',

  /**
   * 上游回了 200 但答案是空的。空答案绝不交出去。
   */
  empty: '模型没有返回内容,请稍后再试。',
}

/**
 * 三个后端各自的失败话术。技术债同上。
 */
export const LLM_MSG = {
  /**
   * 网关整个连不上时的兜底话术。
   */
  friendOffline: '无法连接本地模型服务,请稍后再试。',

  /**
   * 只有本地 dev 会看到,所以直接点名 Ollama。
   */
  ollamaOffline: '无法连接本地大模型(Ollama),请确认服务在线。',

  /**
   * 后面接 HTTP 状态码。
   */
  ollamaStatusHead: '大模型返回错误(',

  /**
   * 接上一条收尾。
   */
  ollamaStatusTail: ')。',

  /**
   * 后面接 SDK 报的原话。
   */
  anthropicHead: '云模型错误:',

  /**
   * 模型自己拒答,不是我们这侧的错。
   */
  refusal: '模型拒绝了本次请求',
}
