/**
 * 失败域的形状:每种失败一族(Failure 机制 + 各域的错误码与 In/Out)。
 * 分段与 constants/functions 同名对齐,一族三抽屉同段号。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

// =========================================================================
// 1. 机制
// =========================================================================

/**
 * 一个失败:原生 Error 加上域自己的错误码。Code 允许含 null,因为有的域的码是可选的
 * (老抛点没有码;2026-08-21 四禁后「没有码」显式写 null,undefined 退役)。
 */
export type Failure<Code extends string | null> = Error & {
  /**
   * 域自己的错误码。允许含 null,因为有的域的码是可选的(老抛点没有码)。
   */
  code: Code
}

/**
 * `fail` 的入参。
 */
export type FailIn<Code extends string | null> = {
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
export type FailOut<Code extends string | null> = Failure<Code>

// =========================================================================
// 2. 模型域(lib/llm)
// =========================================================================

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
   * 错误码;老抛点没有码就 null,路由按兜底处理(2026-08-21 摘 `?`:缺席显式写)。
   */
  code: FriendErrCode | null
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
   * 错误码;老抛点没有码就 null,路由按兜底处理。
   */
  code: FriendErrCode | null
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
 * `gatewayError` 的返回:网关层的失败。
 */
export type GatewayErrorOut = GatewayFailure

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
 * `gatewayErrorOf` 的返回:认好码的网关失败。
 */
export type GatewayErrorOfOut = GatewayFailure

// =========================================================================
// 3. 逐行翻译链
// =========================================================================

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

// =========================================================================
// 数据库层(lib/db)—— 摸池失败(2026-08-26)
// =========================================================================

/**
 * 摸不到连接池的失败;没有域内错误码,code 恒 null。
 */
export type DbErrorOut = FailOut<null>

// =========================================================================
// 交接域(lib/mart)—— seed 读 mart 文件的失败(2026-08-26 形制批)
// =========================================================================

/**
 * mart 文件失败(meta 无效 / 分片缺失 / 目录全无);没有域内错误码,code 恒 null。
 */
export type MartErrorOut = FailOut<null>

/**
 * `martMetaError` 的入参。
 */
export type MartMetaErrorIn = {
  /**
   * 出事的 meta 文件名(含 `__meta` 后缀,不含扩展名)。
   */
  file: string
}

/**
 * `martShardError` 的入参。
 */
export type MartShardErrorIn = {
  /**
   * 表名。
   */
  name: string

  /**
   * 缺的那一片(1 起,给人读的序号)。
   */
  k: number

  /**
   * meta 声明的总片数。
   */
  parts: number
}

/**
 * `martSourceError` 的入参。
 */
export type MartSourceErrorIn = {
  /**
   * tmpdir 侧目录。
   */
  tmp: string

  /**
   * 本地回退目录。
   */
  local: string
}
