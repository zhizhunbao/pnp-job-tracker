/**
 * 失败域的死值:错误身份(ERR_NAME 一族)、上游回包 → 错误码的映射表、见客话术。
 * 为什么这么定、两种失败为什么不合成一种:见 docs/implementation/文案收拢/14_lib-llm域重构.md §4。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

// eslint-disable-next-line local/no-import-in-leaf -- 映射表/话术的键型护栏是本域错误码(特批牌形态,同 noc/constants)
import type { FriendErrCode } from './types'

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

  /**
   * Wikidata 懒查的 HTTP 失败(employers 域;只在域内 catch 留痕,不见客)。
   */
  wikidata: 'WikidataHttpError',
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

// =========================================================================
// 数据库层(lib/db)—— 摸池失败(2026-08-26 自 new Error 收编)
// =========================================================================

/**
 * 摸不到连接池的身份(数据库没连上,或 payload 用的不是 postgres adapter)。
 */
export const DB_ERR_NAME = 'DbPoolError'

/**
 * 摸池失败的话术(与原 new Error 逐字一致,生产日志靠它认)。
 */
export const DB_POOL_MSG = 'database: payload.db.pool 不存在 —— 数据库没连上,或 payload 用的不是 postgres adapter'

// =========================================================================
// 交接域(lib/mart)—— seed 读 mart 文件的三种失败(2026-08-26 形制批自 new Error 收编)
// =========================================================================

/**
 * mart 文件失败的身份(meta 无效 / 分片缺失 / 目录全无共用 —— 都是「本轮上传坏了,
 * 整事务回滚」这一种事故)。
 */
export const MART_ERR_NAME = 'MartFileError'

/**
 * mart 失败话术的公共头(后接文件名)。
 */
export const MART_HEAD = 'mart '

/**
 * meta 声明无效的尾话。
 */
export const MART_META_TAIL = ' invalid'

/**
 * 分片缺失话术:表名后、片号前的那截。
 */
export const MART_SHARD_MID = ' shard '

/**
 * 分片缺失话术:片号/总片数的分隔。
 */
export const MART_SHARD_OF = '/'

/**
 * 分片缺失的尾话(半程上传 → 回滚)。
 */
export const MART_SHARD_TAIL = ' missing (partial upload? rolling back)'

/**
 * 目录全无的头话(两个目录都不存在 = 本轮上传丢失)。
 */
export const MART_NO_SOURCE_HEAD = 'mart no data source: neither '

/**
 * 目录全无话术:两个目录名之间的那截。
 */
export const MART_NO_SOURCE_MID = ' nor '

/**
 * 目录全无的尾话。
 */
export const MART_NO_SOURCE_TAIL = ' exists (upload lost? rolling back)'

/**
 * 我们这侧掐断时报的话。
 */
export const TRANSLATE_TIMEOUT = 'timeout'

// =========================================================================
// 顾问域(lib/advisor)—— 流式起头失败(2026-08-26 自 new Error 收编)
// =========================================================================

/**
 * 顾问流式起头失败的身份(pi 循环一个字没吐就失败,controller.error 交给前端走 error 态)。
 */
export const ADVISOR_ERR_NAME = 'AdvisorLlmError'

/**
 * 顾问流式起头失败的话术(与原 new Error 逐字一致,老链 502 同文;
 * 原 advisor/constants 的 E_LLM_DOWN 收编至此)。
 */
export const ADVISOR_LLM_DOWN_MSG = '大模型不可用。'

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

/**
 * 见客消息里状态行与上游正文之间的分隔。
 */
export const MSG_SEP = ': '

/**
 * 上游没给错误 type 时的兜底 type 名。
 */
export const HTTP_ERROR_TYPE = 'http_error'

/**
 * 上游回包里认不出 type、也没给 message 时,那一格的初值。
 * 空串在这里是**哨兵**:`type === ''` 才回头去试旧链的 detail,
 * `message !== ''` 才把上游正文接进见客消息 —— 两处判断都靠它。
 * 不用 null,是因为这两格的来源是 `String(...)`,本来就只可能是字符串;
 * 掺一个 null 进来,每个读它的人都得先想一次「是 null 还是空串」。
 */
export const ERR_FIELD_NONE = ''

/**
 * 上游没给正文时,见客消息不接尾巴。
 * 尾巴 = `MSG_SEP` 加上游正文,没正文就整段不拼 ——
 * 于是消息干净地停在「状态码 + type」上,不会留一个后面什么都没有的冒号。
 */
export const ERR_TAIL_NONE = ''
