/**
 * 对话兜底这一域的类型:产出、三个工具的 details、以及每个函数的入参与返回。
 *
 * @author Frank
 * @time 2026-08-19 03:28:12
 */

import type { AgentMessage, AgentTool, AgentToolResult } from '@earendil-works/pi-agent-core'
import type { Message, Model, Static } from '@earendil-works/pi-ai'
import type { Db } from '../db'
import type { Lang } from '@/lib/i18n'
import type { GIVE_UP_PARAMS, SEARCH_PARAMS, SET_SLOTS_PARAMS } from './schemas'

// =========================================================================
// 1. 库形状的本地名字
// =========================================================================

/**
 * 循环里流动的一条消息(LLM 的三种 + pi harness 塞的 4 种自定义)。库改形状只动这一段。
 */
export type TranscriptMessage = AgentMessage

/**
 * 真能喂给模型的那种消息:user / assistant / toolResult。
 */
export type LlmMessage = Message

/**
 * 我们用的那个模型的形状 —— 库的 Model,协议锁死 anthropic-messages。
 */
export type ModelOut = Model<'anthropic-messages'>

/**
 * 🔴 这一趟的收件箱 —— **全模块唯一的共享可变状态**,Frank 2026-08-19 特批。
 * 为什么只有它能是例外:pi 的 execute 是**库调我们**,返回值只回给模型,结果没有别的路能出来;
 * 另一条(从 runAgentLoop 返回的 transcript 里读 details)得赌库一定保留那个字段,赌输了是静默失效。
 * 我们自己的代码一律不用成员变量,这里是外部调用的特例。
 */
export type Inbox = {
  /**
   * 这一趟检索真返回过的候选。采信校验拿它当白名单:不在里面的码一律不认。
   */
  candidates: Candidate[]

  /**
   * 模型填的槽位,**还没采信**。一次都没调 set_slots 就是 null。
   */
  claim: SlotsClaim | null

  /**
   * 模型自己交回了反问。它和「没填槽位」走同一条回落路,但日志里分得清。
   */
  gaveUp: boolean
}

/**
 * 一个职业候选:兜底只认这两样,别的字段(label 之类)归对话域自己管。
 */
export type Candidate = {
  /**
   * 五位职业码。**采信白名单认的就是它** —— 不在候选里的码一律不采信。
   */
  noc: string

  /**
   * 官方职业名(英文)。只用来摆给模型挑,不进见客答复。
   */
  title: string
}

/**
 * pi 分配的本次工具调用 id —— 我们不用,但签名里必须收。
 */
export type ToolCallId = string

// =========================================================================
// 2. 产出
// =========================================================================

/**
 * 兜底解出来的槽位:哪个职业(NOC)、哪些省,外加一句「为什么挑它」(只进日志,不见客)。
 */
export type AgentSlots = {
  /**
   * 解出来的职业码。null = 这个问题不依赖职业,不是「没解出来」。
   */
  noc: string | null

  /**
   * 解出来的省码,已经过白名单;认不出的在这一步之前就丢掉了。
   */
  provs: string[]

  /**
   * 模型写的「为什么挑它」。只进日志,不见客。
   */
  reason: string
}

// =========================================================================
// 3. 三个工具:details、参数、工具本身
// =========================================================================

/**
 * 三个工具回给**模型**的结构化附件 —— 给我们自己的那份走收件箱(见上面 Inbox)。
 */
export type SearchDetails = {
  /**
   * 这一次检索真返回的候选。给模型看的是它渲染出来的行;我们自己那份走收件箱。
   */
  candidates: Candidate[]
}

/**
 * 模型填的槽位,**还没采信** —— 字段名与 schema 对齐。
 */
export type SlotsClaim = {
  /**
   * 模型填的职业码。**允许 null** —— 它说不上来时该老实交回,而不是编一个。
   */
  noc: string | null

  /**
   * 模型认为用户提过的省码。白名单过滤在 `cleanProvs`,这里只是原样收着。
   */
  // eslint-disable-next-line local/no-optional -- 模型经 pi 交来的槽位:填不填由工具 schema(TypeBox Optional)定
  provinces?: string[]

  /**
   * 一句「为什么挑它」。只进日志,不给用户看。
   */
  // eslint-disable-next-line local/no-optional -- 模型经 pi 交来的槽位:填不填由工具 schema(TypeBox Optional)定
  reason?: string
}

/**
 * give_up 的回执:模型自己交回反问。
 */
export type GiveUpDetails = {
  /**
   * 恒为 true。写成字面量类型而不是 boolean:这个回执只在「交回」时存在,没有 false 的情形。
   */
  gaveUp: true
}

/**
 * search 的入参:模型拼的检索词。从 schema 推,不手抄 —— 手抄会变成两份真相。
 */
export type SearchArgs = Static<typeof SEARCH_PARAMS>

/**
 * set_slots 的入参:NOC、省码、一句理由。
 */
export type SetSlotsArgs = Static<typeof SET_SLOTS_PARAMS>

/**
 * give_up 的入参:一句「为什么放弃」,可不填。
 */
export type GiveUpArgs = Static<typeof GIVE_UP_PARAMS>

/**
 * search 执行完回给模型的东西(候选清单 + 那批候选本身)。
 */
export type SearchExecOut = Promise<AgentToolResult<SearchDetails>>

/**
 * set_slots 执行完回给模型的东西(一句「记下了」+ 模型填的槽位)。
 */
export type SetSlotsExecOut = Promise<AgentToolResult<SlotsClaim>>

/**
 * give_up 执行完回给模型的东西(一句「放弃了」+ 放弃标记)。
 */
export type GiveUpExecOut = Promise<AgentToolResult<GiveUpDetails>>

/**
 * 查职业候选的那把工具。
 */
export type SearchTool = AgentTool<typeof SEARCH_PARAMS, SearchDetails>

/**
 * 记下槽位的那把工具。
 */
export type SetSlotsTool = AgentTool<typeof SET_SLOTS_PARAMS, SlotsClaim>

/**
 * 交回反问的那把工具。
 */
export type GiveUpTool = AgentTool<typeof GIVE_UP_PARAMS, GiveUpDetails>

/**
 * 一次兜底解析交给模型的全部工具,顺序固定成三元组。
 */
export type AgentTools = [SearchTool, SetSlotsTool, GiveUpTool]

// =========================================================================
// 4. 采信校验的入参与返回
// =========================================================================

/**
 * 拿一个 NOC 去比对搜索真实返回的候选。
 */
export type InCandidatesIn = {
  /**
   * 这一趟检索真返回的候选,当白名单用。
   */
  candidates: Candidate[]

  /**
   * 要比对的那个职业码。
   */
  noc: string
}

/**
 * 这个 NOC 在不在候选里。
 */
export type InCandidatesOut = boolean

/**
 * 模型挑的 NOC(可能是 null)+ 这一轮搜到的全部候选。
 */
export type AcceptNocIn = {
  /**
   * 模型填的码,可能是 null(它自己承认解不出来)。
   */
  raw: string | null

  /**
   * 这一轮搜到的全部候选。**采信只认这个集合** —— 库外的码一概不认。
   */
  candidates: Candidate[]
}

/**
 * 采信通过的 NOC;null = 形状不对或不在候选里,不收。
 */
export type AcceptNocOut = string | null

// =========================================================================
// 5. 三个工具的入参与返回
// =========================================================================

/**
 * 拼一条工具回执:给模型看的文字 + 给我们自己读的 details + 这一步要不要收工。
 */
export type SayIn<T> = {
  /**
   * 给模型看的文字。它下一轮读到的就是这一段。
   */
  text: string

  /**
   * 给我们自己读的结构化附件。**不进模型上下文**,只用于记账与调试。
   */
  details: T

  /**
   * 这一步要不要收工。true → pi 拿到就结束循环,不再多问一轮。
   */
  stop: boolean
}

/**
 * 拼好的工具回执。
 */
export type SayOut<T> = AgentToolResult<T>

/**
 * 查职业候选要的东西:连接和检索词(不要语言 —— 候选只取 noc/title,三语职业名归对话域)。
 */
export type SearchCandidatesIn = {
  /**
   * 库连接。
   */
  pool: Db

  /**
   * 模型拼的检索词。进来之后还会截到 `MAX_QUERY_CHARS` —— 它爱把整句话塞进来。
   */
  query: string
}

/**
 * 查到的候选;查不动就是空数组(错已留痕)。
 */
export type SearchCandidatesOut = Promise<Candidate[]>

/**
 * 要渲染成一行的那个候选。
 */
export type CandidateLineIn = {
  /**
   * 要渲染成一行的那个候选。
   */
  hit: Candidate
}

/**
 * 渲染好的一行:`NOC — 职业名`。
 */
export type CandidateLineOut = string

/**
 * 这一次搜到的全部候选。
 */
export type SearchReplyIn = {
  /**
   * 这一次搜到的全部候选。**空数组是有意义的输入** —— 那时回的是「一个都没有」。
   */
  hits: Candidate[]
}

/**
 * 回给模型的那段话:候选清单,或者「一个都没有」。
 */
export type SearchReplyOut = string

/**
 * 查候选那把工具要的:连接 + 收件箱(候选要攒起来当采信白名单)。
 */
export type SearchToolIn = {
  /**
   * 库连接。
   */
  pool: Db

  /**
   * 这一趟的收件箱。候选要攒进去当采信白名单,所以这把工具非要它不可。
   */
  out: Inbox
}

/**
 * 记槽位那把工具要的:只要收件箱。
 */
export type SetSlotsToolIn = {
  /**
   * 这一趟的收件箱。这把工具只记账,不读库,所以只要它。
   */
  out: Inbox
}

/**
 * 交回反问那把工具要的:只要收件箱。
 */
export type GiveUpToolIn = {
  /**
   * 这一趟的收件箱。交回反问也只是记一个标记,不读库。
   */
  out: Inbox
}

/**
 * makeTools 原样转交下去的那份入参。
 */
export type MakeToolsIn = {
  /**
   * 库连接,原样转交给查候选那把工具。
   */
  pool: Db

  /**
   * 这一趟的收件箱,三把工具共用同一个。
   */
  out: Inbox
}

/**
 * 造好的三把工具。
 */
export type MakeToolsOut = AgentTools

// =========================================================================
// 6. 入口的入参与返回
// =========================================================================

/**
 * 每次调模型前,循环把整条 transcript 交过来。
 */
export type PassThroughMessagesIn = TranscriptMessage[]

/**
 * 滤剩下的、真能喂给模型的那些消息。
 */
export type PassThroughMessagesOut = LlmMessage[]

/**
 * 事件回调不产出任何东西 —— 结果走收件箱。
 */
export type IgnoreEventsOut = void

/**
 * 跑一趟循环要的全部东西:连接、用户原话、密钥、超时信号、收件箱。
 */
export type RunLoopIn = {
  /**
   * 库连接。
   */
  pool: Db

  /**
   * 用户原话。进循环前会截到 `MAX_INPUT_CHARS`。
   */
  text: string

  /**
   * 模型密钥。到这一层时已经确认非空(env 没配就根本不会走到这儿)。
   */
  apiKey: string

  /**
   * 超时信号。到点掐断 —— 兜底不许拖慢反问。
   */
  signal: AbortSignal

  /**
   * 这一趟的收件箱。循环的产出全从它带出来,不靠返回值。
   */
  out: Inbox
}

/**
 * 跑完了没有;false = 出错或超时(已留痕,当它没发生过)。结果不走返回值,走收件箱。
 */
export type RunLoopOut = Promise<boolean>

/**
 * 兜底这条路开没开(env `AGENT_FALLBACK=1`)。
 */
export type AgentFallbackOnOut = boolean

/**
 * 兜底入口的入参 —— lib/chat/orchestrate 的 rescueOcc 按这个形状注入。
 * `lang` 是那份契约带来的,兜底本身用不上(候选只取 noc/title),原样收着不往下传。
 */
export type ResolveByAgentIn = {
  /**
   * 库连接。
   */
  pool: Db

  /**
   * 用户原话。
   */
  text: string

  /**
   * 语种。**兜底本身用不上它**(候选只取 noc/title),收着是因为注入契约带着它 —— 不往下传。
   */
  lang: Lang
}

/**
 * 解出来的槽位 + 这趟花了多少毫秒;null = agent 也没辙,调用方照旧反问。
 */
export type ResolveByAgentOut = Promise<(AgentSlots & AgentTiming) | null>

/**
 * 这一趟花了多少毫秒。单独一个类型,免得在返回类型里就地写一个内联对象。
 */
export type AgentTiming = {
  /**
   * 毫秒。只进日志 —— 它是判断「兜底值不值得开着」的唯一指标。
   */
  ms: number
}

// =========================================================================
// 严格签名:每个函数的入参与返回都要有自己的名字(2026-08-20 Frank 拍板)
// =========================================================================

/**
 * `onTimeout` 的返回。
 */
export type OnTimeoutOut = void

/**
 * `searchTool` 的返回。
 */
export type SearchToolOut = SearchTool

/**
 * `executeSearch` 的入参。
 */
export type ExecuteSearchIn = SearchArgs

/**
 * `executeSearch` 的返回。
 */
export type ExecuteSearchOut = SearchExecOut

/**
 * `setSlotsTool` 的返回。
 */
export type SetSlotsToolOut = SetSlotsTool

/**
 * `executeSetSlots` 的入参。
 */
export type ExecuteSetSlotsIn = SetSlotsArgs

/**
 * `executeSetSlots` 的返回。
 */
export type ExecuteSetSlotsOut = SetSlotsExecOut

/**
 * `giveUpTool` 的返回。
 */
export type GiveUpToolOut = GiveUpTool

/**
 * `executeGiveUp` 的入参。
 */
export type ExecuteGiveUpIn = GiveUpArgs

/**
 * `executeGiveUp` 的返回。
 */
export type ExecuteGiveUpOut = GiveUpExecOut
