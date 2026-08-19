/**
 * 对话兜底这一域的类型:产出、三个工具的 details、以及每个函数的入参与返回。
 *
 * @author Frank
 * @time 2026-08-19 03:28:12
 */

import type { AgentMessage, AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core'
import type { Message, Model, Static } from '@earendil-works/pi-ai'
import type { Db } from '../db/database'
import type { Lang } from '@/lib/i18n'
import type { GIVE_UP_PARAMS, SEARCH_PARAMS, SET_SLOTS_PARAMS } from './schemas'

// =========================================================================
// 1. 库形状的本地名字
// =========================================================================

// 循环里流动的一条消息(LLM 的三种 + pi harness 塞的 4 种自定义)。库改形状只动这一段。
export type TranscriptMessage = AgentMessage
// 真能喂给模型的那种消息:user / assistant / toolResult。
export type LlmMessage = Message
// 我们用的那个模型的形状 —— 库的 Model,协议锁死 anthropic-messages。
export type ModelOut = Model<'anthropic-messages'>
// 🔴 这一趟的收件箱 —— **全模块唯一的共享可变状态**,Frank 2026-08-19 特批。
// 为什么只有它能是例外:pi 的 execute 是**库调我们**,返回值只回给模型,结果没有别的路能出来;
// 另一条(从 runAgentLoop 返回的 transcript 里读 details)得赌库一定保留那个字段,赌输了是静默失效。
// 我们自己的代码一律不用成员变量,这里是外部调用的特例。
export type Inbox = {
  candidates: Candidate[]
  claim: SlotsClaim | null
  gaveUp: boolean
}

// 一个职业候选:兜底只认这两样,别的字段(label 之类)归对话域自己管。
export type Candidate = { noc: string; title: string }
// pi 分配的本次工具调用 id —— 我们不用,但签名里必须收。
export type ToolCallId = string

// =========================================================================
// 2. 产出
// =========================================================================

// 兜底解出来的槽位:哪个职业(NOC)、哪些省,外加一句「为什么挑它」(只进日志,不见客)。
export type AgentSlots = {
  noc: string | null
  provs: string[]
  reason: string
}

// =========================================================================
// 3. 三个工具:details、参数、工具本身
// =========================================================================

// 三个工具回给**模型**的结构化附件 —— 给我们自己的那份走收件箱(见上面 Inbox)。
export type SearchDetails = { candidates: Candidate[] }
// 模型填的槽位,**还没采信** —— 字段名与 schema 对齐。
export type SlotsClaim = { noc: string | null; provinces?: string[]; reason?: string }
// give_up 的回执:模型自己交回反问。
export type GiveUpDetails = { gaveUp: true }

// search 的入参:模型拼的检索词。从 schema 推,不手抄 —— 手抄会变成两份真相。
export type SearchArgs = Static<typeof SEARCH_PARAMS>
// set_slots 的入参:NOC、省码、一句理由。
export type SetSlotsArgs = Static<typeof SET_SLOTS_PARAMS>
// give_up 的入参:一句「为什么放弃」,可不填。
export type GiveUpArgs = Static<typeof GIVE_UP_PARAMS>

// search 执行完回给模型的东西(候选清单 + 那批候选本身)。
export type SearchExecOut = Promise<AgentToolResult<SearchDetails>>
// set_slots 执行完回给模型的东西(一句「记下了」+ 模型填的槽位)。
export type SetSlotsExecOut = Promise<AgentToolResult<SlotsClaim>>
// give_up 执行完回给模型的东西(一句「放弃了」+ 放弃标记)。
export type GiveUpExecOut = Promise<AgentToolResult<GiveUpDetails>>

// 查职业候选的那把工具。
export type SearchTool = AgentTool<typeof SEARCH_PARAMS, SearchDetails>
// 记下槽位的那把工具。
export type SetSlotsTool = AgentTool<typeof SET_SLOTS_PARAMS, SlotsClaim>
// 交回反问的那把工具。
export type GiveUpTool = AgentTool<typeof GIVE_UP_PARAMS, GiveUpDetails>
// 一次兜底解析交给模型的全部工具,顺序固定成三元组。
export type AgentTools = [SearchTool, SetSlotsTool, GiveUpTool]

// =========================================================================
// 4. 采信校验的入参与返回
// =========================================================================

// 待规范化的省码:模型给的原样字符串。
export type UpperTrimIn = { prov: string }
// 规范化后的省码:去空格、转大写。
export type UpperTrimOut = string

// 待核对的省码,已规范化。
export type IsKnownProvIn = { prov: string }
// 认不认得出这个省码。
export type IsKnownProvOut = boolean

// 模型给的整串省码,可能压根没给。
export type CleanProvsIn = { raw: string[] | undefined }
// 认得出的那些省码,认不出的已丢掉(不猜)。
export type CleanProvsOut = string[]

// 拿一个 NOC 去比对搜索真实返回的候选。
export type InCandidatesIn = { candidates: Candidate[]; noc: string }
// 这个 NOC 在不在候选里。
export type InCandidatesOut = boolean

// 模型挑的 NOC(可能是 null)+ 这一轮搜到的全部候选。
export type AcceptNocIn = { raw: string | null; candidates: Candidate[] }
// 采信通过的 NOC;null = 形状不对或不在候选里,不收。
export type AcceptNocOut = string | null

// =========================================================================
// 5. 三个工具的入参与返回
// =========================================================================

// 拼一条工具回执:给模型看的文字 + 给我们自己读的 details + 这一步要不要收工。
export type SayIn<T> = { text: string; details: T; stop: boolean }
// 拼好的工具回执。
export type SayOut<T> = AgentToolResult<T>

// 查职业候选要的东西:连接和检索词(不要语言 —— 候选只取 noc/title,三语职业名归对话域)。
export type SearchCandidatesIn = { pool: Db; query: string }
// 查到的候选;查不动就是空数组(错已留痕)。
export type SearchCandidatesOut = Promise<Candidate[]>

// 要渲染成一行的那个候选。
export type CandidateLineIn = { hit: Candidate }
// 渲染好的一行:`NOC — 职业名`。
export type CandidateLineOut = string

// 这一次搜到的全部候选。
export type SearchReplyIn = { hits: Candidate[] }
// 回给模型的那段话:候选清单,或者「一个都没有」。
export type SearchReplyOut = string

// 查候选那把工具要的:连接 + 收件箱(候选要攒起来当采信白名单)。
export type SearchToolIn = { pool: Db; out: Inbox }
// 记槽位那把工具要的:只要收件箱。
export type SetSlotsToolIn = { out: Inbox }
// 交回反问那把工具要的:只要收件箱。
export type GiveUpToolIn = { out: Inbox }
// makeTools 原样转交下去的那份入参。
export type MakeToolsIn = { pool: Db; out: Inbox }
// 造好的三把工具。
export type MakeToolsOut = AgentTools

// =========================================================================
// 6. 入口的入参与返回
// =========================================================================

// 每次调模型前,循环把整条 transcript 交过来。
export type PassThroughMessagesIn = TranscriptMessage[]
// 滤剩下的、真能喂给模型的那些消息。
export type PassThroughMessagesOut = LlmMessage[]
// 事件回调不产出任何东西 —— 结果走收件箱。
export type IgnoreEventsOut = void

// 跑一趟循环要的全部东西:连接、用户原话、密钥、超时信号、收件箱。
export type RunLoopIn = { pool: Db; text: string; apiKey: string; signal: AbortSignal; out: Inbox }
// 跑完了没有;false = 出错或超时(已留痕,当它没发生过)。结果不走返回值,走收件箱。
export type RunLoopOut = Promise<boolean>

// 出错留痕要的两样:哪个函数、什么原因。
export type LogFailureIn = { fn: string; reason: string }
// 留痕不产出任何东西。
export type LogFailureOut = void

// 兜底这条路开没开(env `AGENT_FALLBACK=1`)。
export type AgentFallbackOnOut = boolean

// 兜底入口的入参 —— lib/chat/orchestrate 的 rescueOcc 按这个形状注入。
// `lang` 是那份契约带来的,兜底本身用不上(候选只取 noc/title),原样收着不往下传。
export type ResolveByAgentIn = { pool: Db; text: string; lang: Lang }
// 解出来的槽位 + 这趟花了多少毫秒;null = agent 也没辙,调用方照旧反问。
export type ResolveByAgentOut = Promise<(AgentSlots & { ms: number }) | null>
