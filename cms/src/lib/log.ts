/**
 * 全站留痕:唯一一处 `console.log`,各域的日志字面量也都在这里。
 *
 * @author Frank
 * @time 2026-08-19 07:41:03
 */

// =========================================================================
// 1. 出口
// =========================================================================

/**
 * 写一行日志要的两样。
 */
export type LogIn = {
  /**
   * 来源标签,不带方括号,`log()` 会补上。
   */
  tag: string

  /**
   * 正文。字面量从下面各域的表里取,代码只负责拼变量。
   */
  text: string
}

/**
 * 写日志没有返回值。
 */
export type LogOut = void

/**
 * 写一行日志。全站只有这一处 `console.log`。
 *
 * @param input 来源标签与正文。
 * @returns 没有返回值。
 */
export function log(input: LogIn): LogOut {
  console.log(`[${input.tag}] ${input.text}`)
}

/**
 * 日志里截断长消息的上限。留痕要看得见,但别把一整篇回包灌进日志。
 */
export const LOG_MSG_MAX = 160

// =========================================================================
// 2. 模型域(lib/llm)
// =========================================================================

/**
 * `lib/llm` 写出去的全部字面量。
 *
 * 标签仍是 `friendLlm`,没跟着文件改名 —— 生产日志是人肉 grep 的,换关键词等于把历史记录切断。
 */
export const LLM_LOG = {
  /**
   * 这个域每一行日志的来源标签。
   */
  tag: 'friendLlm',

  /**
   * 主通道成功那一行的开头,后面接「走没走流」。
   */
  v1Ok: 'v1 ok stream=',

  /**
   * 上游 `x-cache` 响应头的原值,HIT 或 MISS。
   */
  xCache: ' x-cache=',

  /**
   * 送进去多少字符。
   */
  in: ' in=',

  /**
   * 拿回来多少字符。
   */
  out: ' out=',

  /**
   * 上面两个数的单位。
   */
  ch: 'ch',

  /**
   * 上游报的 token 用量,进和出两个数。
   */
  tok: ' tok=',

  /**
   * 那两个数中间的分隔。
   */
  slash: '/',

  /**
   * 上游为什么停,stop 或 length。
   */
  finish: ' fr=',

  /**
   * 该有值却没有。比如旧链没有 `x-cache` 这个头。
   */
  none: '-',

  /**
   * 上游没给这个字段。比如 usage 整个缺失。
   */
  missing: '?',

  /**
   * 流解出来是空的,准备原地非流式重来。括号里带上 x-cache,好判断是不是缓存的锅。
   */
  streamEmptyHead: 'v1 stream empty (x-cache=',

  /**
   * 接上一条的收尾。
   */
  streamEmptyTail: ') → retry non-stream',

  /**
   * 回退链成功那一行的开头,后面接「是不是缓存」。
   */
  legacyOk: 'legacy ok cached=',

  /**
   * 这一发有没有真用上联网搜索。
   */
  webSearch: ' websearch=',

  /**
   * 主通道失败、准备回退,后面接错误码。
   */
  v1FailHead: 'v1 fail code=',

  /**
   * 接上一条的收尾,说明退去了哪条链。
   */
  v1FailTail: ' → fallback legacy /api/chat',

  /**
   * 退到旧链也没成,这一趟彻底失败。
   */
  fallbackFailed: 'legacy fallback also failed: ',

  /**
   * 出错留痕时,夹在函数名和原因之间。
   */
  failedTail: ' failed: ',

  /**
   * 补充信息的左括号。
   */
  paren: ' (',

  /**
   * 补充信息的右括号。
   */
  parenEnd: ')',
}

/**
 * 留痕里报的是哪个函数。
 */
export const LLM_FN = {
  /**
   * 这个域里唯一带 try/catch 又会留痕的函数。
   */
  friendChatOrThrow: 'friendChatOrThrow',
}

// =========================================================================
// 3. 对话兜底(lib/agent)
// =========================================================================

/**
 * `lib/agent` 写出去的全部字面量。兜底只写日志不抛错,所以它的行都在这里。
 */
export const AGENT_LOG = {
  /**
   * 这个域每一行日志的来源标签。
   */
  tag: 'agent',

  /**
   * 出错留痕。`(ignored)` 是说这次失败被吞掉了,主路径没受影响 —— 别跟模型域那句压成一样。
   */
  failedTail: ' failed (ignored): ',

  /**
   * 一个槽位都没解出来,后面接「模型是不是自己交回的」。
   */
  noSlots: 'no slots gaveUp=',

  /**
   * 模型给的 NOC 没被采信。
   */
  rejected: 'rejected noc=',

  /**
   * 接上一条,说明为什么不采信。
   */
  rejectedWhy: ' (not in search results)',

  /**
   * 解出来了,后面接 NOC。
   */
  resolved: 'resolved noc=',

  /**
   * 一起解出来的省码。
   */
  provs: ' provs=',

  /**
   * 这一趟花了多久。
   */
  ms: ' ms=',

  /**
   * 模型自己写的「为什么挑它」。只进日志,不给用户看。
   */
  reason: ' reason=',

  /**
   * 收尾,说明回到了原来的反问。
   */
  reask: ' — falling back to reask',
}

/**
 * 留痕里报的是哪个函数。只有真会抛的那三个带 try/catch,所以这里也只有三个。
 */
export const AGENT_FN = {
  /**
   * 查职业候选,要读库。
   */
  searchCandidates: 'searchCandidates',

  /**
   * 跑 pi 的循环,是外部调用。
   */
  runLoop: 'runLoop',

  /**
   * 模块入口那道网。
   */
  resolveByAgent: 'resolveByAgent',
}
