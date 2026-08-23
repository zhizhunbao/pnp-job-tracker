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
  // eslint-disable-next-line local/no-optional -- 上游回包形状:网关的 JSON 由上游定,缺席是事实
  error?: {
    /**
     * 上游给的错误种类。认它的表是 `ERR_BY_TYPE`。
     */
    // eslint-disable-next-line local/no-optional -- 上游回包形状
    type?: string

    /**
     * 有些上游把种类放在这一格。两个都认,先 type 后 code。
     */
    // eslint-disable-next-line local/no-optional -- 上游回包形状
    code?: string

    /**
     * 上游的说明。**只进留痕**,不进见客话术。
     */
    // eslint-disable-next-line local/no-optional -- 上游回包形状
    message?: string
  }

  /**
   * 旧链的结构。超长报的就是这一句。
   */
  // eslint-disable-next-line local/no-optional -- 上游回包形状(旧链)
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
// 5. 对话域(lib/chat)
// =========================================================================

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
   * 抛这一下之前已经解出来的槽位;什么都没解出来就 null。路由把它原样回给前端,
   * 让下一轮不用从头再问一遍(只有 noOcc / busy / guard 三处带得出来)。
   */
  slots: Slots | null
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
   * 已经解出来的槽位;没有就显式给 null。
   */
  slots: Slots | null
}

/**
 * `chatError` 的返回:对话编排的失败。
 */
export type ChatErrorOut<Slots> = ChatFailure<Slots>
