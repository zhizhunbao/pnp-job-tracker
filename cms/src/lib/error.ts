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
export type Failure<Code extends string | undefined> = Error & {
  /**
   * 域自己的错误码。允许含 undefined,因为有的域的码是可选的(老抛点没有码)。
   */
  code: Code
}

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
 * `fail` 的返回:一个原生 Error,带上身份与错误码。
 */
export type FailOut<Code extends string | undefined> = Failure<Code>

/**
 * 造一个失败。堆栈是真的,所以留痕里看得见抛点。
 *
 * @param input 身份、消息、错误码。
 * @returns 一个原生 Error,带上这三样。
 */
export function fail<Code extends string | undefined>(input: FailIn<Code>): FailOut<Code> {
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
export type LlmFailure = Error & {
  /**
   * 错误码。**可选** —— 三个后端的老抛点没有码,路由那时按兜底处理。
   */
  code?: FriendErrCode
}

/**
 * 网关层的失败。它的 message 是技术留痕,只进日志;错误码一定有。
 */
export type GatewayFailure = Error & {
  /**
   * 错误码。**一定有** —— 网关层的失败全从 `gatewayErrorOf` 出来,那儿认不出也会落到兜底码。
   */
  code: FriendErrCode
}

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
 * `llmError` 的返回:见客的失败。
 */
export type LlmErrorOut = LlmFailure

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
 * `gatewayError` 的返回:网关层的失败。
 */
export type GatewayErrorOut = GatewayFailure

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
 * 上游的错误结构。新链给 `error`,旧链没换、给的还是 `detail`,两个都认。
 */
export type GatewayErrorBody = {
  /**
   * 新链的标准结构。type 与 code 认哪个都行,message 只进留痕。
   */
  error?: {
    /**
     * 上游给的错误种类。认它的表是 `ERR_BY_TYPE`。
     */
    type?: string

    /**
     * 有些上游把种类放在这一格。两个都认,先 type 后 code。
     */
    code?: string

    /**
     * 上游的说明。**只进留痕**,不进见客话术。
     */
    message?: string
  }

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
  /**
   * 我们发的 body 不对,属于我们这侧的 bug。
   */
  400: 'badRequest',

  /**
   * 钥匙不对。运维问题,重试没用。
   */
  401: 'authKey',

  /**
   * 也归钥匙:上游对「无权」与「钥匙错」分不清,对用户是同一句话。
   */
  403: 'authKey',

  /**
   * 上游模型炸了。它和 offline 是仅有的两种值得回退旧链的失败。
   */
  502: 'upstream',

  /**
   * 上游自己等超时了。
   */
  504: 'timeout',
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
 * `gatewayErrorOf` 的返回:认好码的网关失败。
 */
export type GatewayErrorOfOut = GatewayFailure

/**
 * 把上游回包认成我们的错误码。认不出的按 HTTP 状态兜底。
 *
 * @param input HTTP 状态与原始回包正文。
 * @returns 认好码的网关失败。
 */
export function gatewayErrorOf(input: GatewayErrorOfIn): GatewayErrorOfOut {
  let type = ''
  let message = ''
  try {
    const parsed: GatewayErrorBody = JSON.parse(input.body)
    type = String(parsed?.error?.type || parsed?.error?.code || '')
    message = String(parsed?.error?.message || '')
    if (!type) {
      const detail = String(parsed?.detail || '')
      if (LEGACY_TOO_LONG.test(detail)) {
        type = LEGACY_TOO_LONG_TYPE; message = detail 
      }
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
export type TranslateFailure = Error & {
  /**
   * 上游炸了还是我们掐的。只进日志与重试判断,不给用户看。
   */
  code: TranslateErrCode
}

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
 * `translateError` 的返回:翻译链的失败。
 */
export type TranslateErrorOut = TranslateFailure

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

// =========================================================================
// 5. 对话域(lib/chat)
// =========================================================================

/**
 * 对话编排失败的身份。名字沿用旧类名 `ChatError`,因为 chat_logs 的 err 列与生产日志都是靠它认的。
 */
export const CHAT_ERR_NAME = 'ChatError'

/**
 * 对话编排的五种失败。路由按它分 HTTP 状态,见 api/chat。
 */
export type ChatErrCode =
  | 'tooShort'   // 输入短到不成一句话(四字门;CJK 两字即放行,见 orchestrate 的 cjkOk)
  | 'noOcc'      // 依赖职业的问题拿不到 5 位 NOC —— 绝不猜职业码,反问
  | 'llm'        // 模型那头给了个用不了的回答:抽槽解析不出,或抽槽/合成自己炸了
  | 'guard'      // 出口校验没过,手里又没有 facts 可降级
  | 'busy'       // 模型那头等不来字(停摆闸响 / 上游超时)。**不降级成事实清单**
// (2026-08-09 Frank 拍板「不用降级 就显示稍后再试,系统繁忙」):
// 等太久之后再塞一张表格,读的人只会更烦。

/**
 * 对话编排的失败。
 *
 * 🔴 槽位的形状 `Slots` 是**调用方带进来的类型参数**,本文件一个字都不认识它 ——
 * `lib/error` 是共享叶子,反过来 import `lib/chat` 就是叶子依赖域,方向是倒的
 * (2026-08-19 Frank 当场驳回)。域自己在调用点把 `Slots` 填进来,叶子只管机制。
 */
export type ChatFailure<Slots> = Error & {
  /**
   * 哪一种。
   */
  code: ChatErrCode

  /**
   * 抛这一下之前已经解出来的槽位。路由把它原样回给前端,让下一轮不用从头再问一遍
   * (只有 noOcc / busy / guard 三处带得出来,另两种失败发生时还什么都没解出来)。
   */
  slots?: Slots
}

/**
 * `chatError` 的入参。
 */
export type ChatErrorIn<Slots> = {
  /**
   * 哪一种。
   */
  code: ChatErrCode

  /**
   * 技术留痕。只有 `@test.local` 的探针请求看得到它,对外只给错误码。
   */
  msg: string

  /**
   * 已经解出来的槽位,没有就不传。
   */
  slots?: Slots
}

/**
 * `chatError` 的返回:对话编排的失败。
 */
export type ChatErrorOut<Slots> = ChatFailure<Slots>

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

/**
 * 对话编排的错误码字面量。
 *
 * 🔵 域里不许写裸字符串,而错误码的家本来就是这里 —— 抛错那一行从这张表取,
 * 免得 `'busy'` 在三个 throw 点各写一遍,改一处剩两处对不上。
 */
export const CHAT_CODE = {
  /**
   * 输入短到不成一句话。
   */
  tooShort: 'tooShort',

  /**
   * 依赖职业却拿不到 5 位 NOC。
   */
  noOcc: 'noOcc',

  /**
   * 模型那头给了个用不了的回答。
   */
  llm: 'llm',

  /**
   * 出口校验没过,手里又没有 facts 可降级。
   */
  guard: 'guard',

  /**
   * 模型那头等不来字。**不降级成事实清单**(2026-08-09 Frank 拍板)。
   */
  busy: 'busy',
} as const

/**
 * 网关的错误码字面量。
 *
 * 🔵 错误码的家就是这里 —— 域里抛错那一行从这张表取,免得 `'timeout'` 在四个 throw 点各写一遍。
 * 类型是上面的 `FriendErrCode`,这张表是它的值。
 */
export const FRIEND_CODE = {
  /**
   * 未配置 env / 连不上 / DNS 挂了。
   */
  offline: 'offline',

  /**
   * 输入超上限。**重试没用,得删内容。**
   */
  tooLong: 'tooLong',

  /**
   * 我们这侧 abort 或上游 504。
   */
  timeout: 'timeout',

  /**
   * 上游模型炸了。
   */
  upstream: 'upstream',

  /**
   * key 错/缺。运维问题。
   */
  authKey: 'authKey',

  /**
   * 我们发的 body 不对,是 bug。
   */
  badRequest: 'badRequest',

  /**
   * 200 但答案是空串。**空答案绝不交出去。**
   */
  empty: 'empty',
} as const

/**
 * 翻译链的错误码字面量。
 */
export const TRANSLATE_CODE = {
  /**
   * 上游非 200。只在重试循环里当控制流,不会离开函数。
   */
  upstream: 'upstream',

  /**
   * 我们这侧掐断。这个会冒到路由。
   */
  timeout: 'timeout',
} as const

/**
 * 网关层的技术留痕措辞。**只进日志**,不给用户看(见客话术是上面的 `FRIEND_MSG`)。
 */
export const GATEWAY_MSG = {
  /**
   * 停摆闸响了,后面接毫秒数。
   */
  stalled: 'stalled ',

  /**
   * 硬超时,后面接毫秒数。
   */
  aborted: 'aborted after ',

  /**
   * 上面两条的单位。
   */
  ms: 'ms',

  /**
   * 连不上,后面接原因。
   */
  network: 'network: ',

  /**
   * 流到一半断了,后面接看门狗的话。
   */
  stream: 'stream ',

  /**
   * 接上一条,后面接已经收到多少字符。
   */
  after: ' after ',

  /**
   * 字符的单位。
   */
  ch: 'ch',

  /**
   * 本地预检发现输入超长,后面接实际字符数。
   */
  input: 'input ',

  /**
   * 接上一条,后面接上限。
   */
  overMax: ' chars > gateway max ',

  /**
   * 回包里一个 choice 都没有,后面接 x-cache。
   */
  emptyChoices: 'empty choices (x-cache=',

  /**
   * 接上一条收尾。
   */
  parenEnd: ')',

  /**
   * 旧链回了 200 但答案是空的。
   */
  emptyAnswer: 'empty answer',

  /**
   * env 没配。
   */
  notConfigured: 'TRANSLATE_API_BASE/KEY not configured',
}

// =========================================================================
// N. 分值域(lib/points)
// =========================================================================

/**
 * `lib/points` 造错、判错、留痕要用的全部字面量。
 */
export const POINTS_ERR = {
  /**
   * 身份。曼省 EOI 的官方表少了必须有的行时抛它。
   *
   * 🔴 **少一行就抛,不静默补 0** —— 官方表改版是要人去改抓取脚本的事,
   * 悄悄算出一个少了几百分的结果,比报错难查得多。
   */
  name: 'PointsError',

  /**
   * 曼省表少了某一行,后面接是哪一行。
   */
  rowMissingHead: 'MB score row missing for ',

  /**
   * 接在上一句后面的提示。
   */
  rowMissingTail: '(检查 pnp_score_factors 是否改版)',

  /**
   * 曼省年龄表里没有这个岁数的档,后面接岁数。
   */
  noAgeRowHead: 'no MB age row for age=',

  /**
   * 官方表里一条曼省的行都没有。
   */
  noMbRows: 'no MB rows in pnp_score_factors',
} as const
