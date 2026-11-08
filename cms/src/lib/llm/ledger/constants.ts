/**
 * 账本子桶的参数:官方单价、预扣的估算口径、用量行的状态词。
 * 单价抄自官方定价页(platform.claude.com/docs/en/about-claude/pricing,2026-11-08 读),美元每百万 token。
 *
 * @author Frank
 * @time 2026-11-08 12:00:00
 */

// =========================================================================
// 1. 单价
// =========================================================================

/**
 * 模型单价。🔴 表里没有的模型一律不发:算不出最坏成本就谈不上不超额度。
 */
export const MODEL_PRICE = {
  /**
   * 现役模型。
   */
  'claude-haiku-4-5': { in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.1 },

  /**
   * 100000 token 以内的单价;输入上限 INPUT_BYTES_MAX 保证不进更贵的那档。
   */
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },

  /**
   * 实测候选。
   */
  'claude-sonnet-5-5': { in: 2, out: 10, cacheWrite: 2.5, cacheRead: 0.1 },

  /**
   * 实测候选。
   */
  'claude-opus-5-5': { in: 4, out: 20, cacheWrite: 5, cacheRead: 0.2 },
}

/**
 * 单价的分母:每百万 token。
 */
export const TOKENS_PER_PRICE = 1_000_000

/**
 * 金额精度:表里是 6 位小数,预扣往上取整到这一位。
 */
export const USD_SCALE = 1_000_000

// =========================================================================
// 2. 预扣口径
// =========================================================================

/**
 * 一个 token 至少吃掉一个 UTF-8 字节,所以字节数是输入 token 的上界。
 * 只用来预扣,结算时按上游报的真实用量退回。
 */
export const INPUT_OVERHEAD_TOKENS = 64

/**
 * 输入字节上限。全站最长的输入约 20000 字符,放宽到 Haiku 5.5 单价分档线,超了不发。
 */
export const INPUT_BYTES_MAX = 100_000

/**
 * 失败原因进库前截断。
 */
export const ERROR_LEN_MAX = 300

// =========================================================================
// 3. 用量行
// =========================================================================

/**
 * 用量行的状态。
 */
export const STATE = {
  /**
   * 成功,按真实用量记。
   */
  ok: 'ok',

  /**
   * 明确失败,预扣全退。
   */
  failed: 'failed',

  /**
   * 结局不明(5xx、断连),按预扣全额记,宁多勿少。
   */
  unknown: 'unknown',

  /**
   * 闸拦下了,没发请求。
   */
  blocked: 'blocked',
} as const

/**
 * 付费通道的名字,进用量行。
 */
export const CHANNEL_ANTHROPIC = 'anthropic'

/**
 * 没有失败原因时进库的值。
 */
export const ERROR_NONE = null

// =========================================================================
// 4. 失败分类
// =========================================================================

/**
 * HTTP 状态:请求本身有问题。
 */
export const STATUS_BAD_REQUEST = 400

/**
 * HTTP 状态:限流,官方花费封顶也回它。
 */
export const STATUS_TOO_MANY = 429

/**
 * HTTP 状态:400 以下不算客户端错误。
 */
export const STATUS_CLIENT_MIN = 400

/**
 * HTTP 状态:500 起算服务端错误。
 */
export const STATUS_SERVER_MIN = 500

/**
 * 官方报额度耗尽的 400 正文(自设花费上限、Workspace 上限、余额不足)。
 */
export const BUDGET_ERROR_RE = /usage limits|credit balance/i
