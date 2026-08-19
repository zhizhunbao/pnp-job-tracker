// 兜底这一域的旋钮:模型、预算、超时、截断上限、工具名。
// 🔴 工具名只在这里写一遍 —— 提示词里点名叫它的那几句插值取,两处对不上模型就调空。

import type { Model } from '@earendil-works/pi-ai'
import { ALL_PROVS } from '@/lib/location'

// =========================================================================
// 1. 模型与预算
// =========================================================================

// 兜底不产见客文字,只产工具调用 —— 512 够了,多给只是多花钱。
export const MAX_TOKENS = 512

// 兜底不许拖慢反问:超时就回原路。
export const TIMEOUT_MS = 12000

// 只有 Haiku。换后端 = 换这里的 `api`/`baseUrl` 与 planner 里那行 stream,pi-ai 把差异都吃掉了。
export const MODEL: Model<'anthropic-messages'> = {
  id: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5', name: 'haiku',
  api: 'anthropic-messages', provider: 'anthropic', baseUrl: 'https://api.anthropic.com',
  reasoning: false, input: ['text'], contextWindow: 200000, maxTokens: MAX_TOKENS,
  cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
} as Model<'anthropic-messages'>

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
//
// 🔴 名字在**两处**出现:这里的 name 与提示词里点名叫它的那几句。
//    两处对不上,模型就会去调一个不存在的工具 —— 所以名字只在这里写一遍,提示词插值取。

export const TOOLS = {
  search:   { name: 'search_occupations', label: '查职业候选' },
  setSlots: { name: 'set_slots',          label: '记下槽位' },
  giveUp:   { name: 'give_up',            label: '交回反问' },
} as const

// =========================================================================
// 4. 采信用的白名单
// =========================================================================

// 认得出的省码(九省 + QC)。模型给的省码不在这里就丢掉 —— 宁可少一个省,不许把 NB 当 NS。
//  表本身在 `lib/location`(省码的家)。**本域不从别的领域取常量**,共享叶子例外 ——
// 而且只在这一个文件里取:agent 的其余文件一律从 `./constants` 拿,对外依赖就这一行。
export const PROVS = ALL_PROVS

// NOC 就是五位数字。模型给别的形状一律不采信。
export const NOC_RE = /^\d{5}$/
