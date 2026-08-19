/**
 * 对话兜底的参数:模型、预算、超时、四个截断上限、三个工具名。
 *
 * @author Frank
 * @time 2026-08-19 03:28:12
 */

import { ALL_PROVS } from '@/lib/location'

// =========================================================================
// 1. 模型与预算
// =========================================================================

// 兜底不产见客文字,只产工具调用 —— 512 够了,多给只是多花钱。
export const MAX_TOKENS = 512

// 兜底不许拖慢反问:超时就回原路。
export const TIMEOUT_MS = 12000

// 只有 Haiku;换后端 = 换下面这几个值 + functions.ts 里那行 stream,pi-ai 把协议差异都吃掉了。
export const MODEL_ID = 'claude-haiku-4-5'
// 日志与调试里认的短名。
export const MODEL_NAME = 'haiku'
// 走哪套接口协议。
export const MODEL_API = 'anthropic-messages'
// 服务商。
export const MODEL_PROVIDER = 'anthropic'
// 接口地址。
export const MODEL_BASE_URL = 'https://api.anthropic.com'
// 兜底不需要思考链,省钱也省时间。
export const MODEL_REASONING = false
// 上下文窗口,单位 token。
export const MODEL_CONTEXT_WINDOW = 200000
// 每百万 token 的价:进。
export const COST_INPUT = 1
// 每百万 token 的价:出。
export const COST_OUTPUT = 5
// 每百万 token 的价:读缓存。
export const COST_CACHE_READ = 0.1
// 每百万 token 的价:写缓存。
export const COST_CACHE_WRITE = 1.25

// =========================================================================
// 2. 截断上限
// =========================================================================

// 喂进去的用户原话。
export const MAX_INPUT_CHARS = 1200

// 模型自己拼的检索词(它可能把整句话塞进来)。
export const MAX_QUERY_CHARS = 80

// 它写的「为什么挑这个 NOC」——只进日志,不见客。
export const MAX_REASON_CHARS = 200

// 一次检索返回几个候选:够它挑,又不至于把上下文塞满。
export const SEARCH_LIMIT = 5

// =========================================================================
// 3. 工具名
// =========================================================================

// 🔴 名字只在这里写一遍、提示词插值取 —— 两处对不上,模型就会去调一个不存在的工具。
export const TOOLS = {
  search:   { name: 'search_occupations', label: '查职业候选' },
  setSlots: { name: 'set_slots',          label: '记下槽位' },
  giveUp:   { name: 'give_up',            label: '交回反问' },
}

// =========================================================================
// 4. 采信用的白名单
// =========================================================================

// 认得出的省码(九省 + QC),表在 `lib/location`:不在这里的一律丢掉 —— 宁可少一个省,不许把 NB 当 NS。
export const PROVS = ALL_PROVS

// NOC 就是五位数字。模型给别的形状一律不采信。
export const NOC_RE = /^\d{5}$/

// 垫底那条不是候选是噪音:检索词会命中官方要求文本,连带捞出不相干的职业
// (对话域实测:「读 IT」连带命中「图书档案技术员」8 个岗,而榜首 112)。
// 判据用**相对量**不用绝对量 —— 冷门职业整行都小,写死一个门槛会把它的真候选一起砍掉。
export const NOISE_RATIO = 0.1

// 检索词里的 LIKE 元字符,拼模式串前要转义 —— 模型爱在检索词里带 % 和 _。
export const LIKE_SPECIAL = /[%_\\]/g

// =========================================================================
// 5. 能喂给模型的消息
// =========================================================================

// pi 的 harness 往 AgentMessage 里塞了 4 种非 LLM 消息(bashExecution 等),只有这三个 role 能进模型。
// 🔴 必须 `as const`:代码里靠**比对这三个字面量**让编译器自己窄化类型,退成 string 就白写了。
export const ROLE = { user: 'user', assistant: 'assistant', toolResult: 'toolResult' } as const

// =========================================================================
// 6. 日志字面量
// =========================================================================

// 兜底只写日志不抛错(铁律①),它写出去的字面量全在这儿 —— 代码里只拼变量,不散字符串。
export const LOG = {
  failedHead: '[agent] ',
  failedTail: ' failed (ignored): ',
  noSlots: '[agent] no slots gaveUp=',
  rejected: '[agent] rejected noc=',
  rejectedWhy: ' (not in search results)',
  resolved: '[agent] resolved noc=',
  provs: ' provs=',
  ms: ' ms=',
  reason: ' reason=',
  reask: ' — falling back to reask',
}

// =========================================================================
// 7. 函数名录
// =========================================================================

// 出错留痕时报的是哪个函数 —— 只有真会抛的那三个才有 try/catch,所以这里也只有三个。
export const FN = {
  searchCandidates: 'searchCandidates',
  runLoop: 'runLoop',
  resolveByAgent: 'resolveByAgent',
}
