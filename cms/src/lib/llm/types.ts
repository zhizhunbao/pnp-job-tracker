/**
 * 模型域的类型:三个后端共用的消息形状、朋友网关的线上回包、每个函数的入参与返回。
 * 🔵 **失败的形状不在这儿**:LlmFailure / GatewayFailure / FriendErrCode 全站只有一处,在 `lib/error`。
 *
 * @author Frank
 * @time 2026-08-19 06:32:21
 */

import type {
  ContentBlock, Message, MessageCreateParamsNonStreaming, MessageStreamParams, WebFetchTool20250910,
} from '@anthropic-ai/sdk/resources/messages/messages'

// =========================================================================
// 1. 库形状的本地名字
// =========================================================================

/**
 * Anthropic SDK 的五个形状,在域内起本地名字 —— 下面的签名里不出现外部类型。
 * 一次性补全的入参。
 */
export type AnthropicParams = MessageCreateParamsNonStreaming

/**
 * 流式的入参(SDK 自己多带一层 parse 能力,形状同上)。
 */
export type AnthropicStreamParams = MessageStreamParams

/**
 * 回包里的一块内容:按 `type` 分的联合,判 `=== 'text'` 就窄化到文本块。
 */
export type AnthropicBlock = ContentBlock

/**
 * 服务端 web_fetch 工具声明(SDK 认这个版本号,见 webFetchTool)。
 */
export type WebFetchTool = WebFetchTool20250910

/**
 * 能发给 Anthropic 的那种轮次:system 已经拆到顶层参数,这里只剩一问一答。
 */
export type AnthropicTurn = {
  /**
   * 谁说的 —— system 已经拆走,只剩这两种
   */
  role: 'user' | 'assistant'

  /**
   * 说了什么
   */
  content: string
}

/**
 * 一次性补全的回包。
 */
export type AnthropicMessage = Message

// =========================================================================
// 2. 对外的形状
// =========================================================================

/**
 * 一轮对话里的一条消息 —— 三个后端都收这个形状,拆 system 的活在域内做。
 */
export type ChatMessage = {
  /**
   * 谁说的;system 由各后端自己决定拆不拆到顶层
   */
  role: 'system' | 'user' | 'assistant'

  /**
   * 说了什么
   */
  content: string
}

/**
 * 走哪个后端。不传 = 跟全局 LLM_PROVIDER 走。
 */
export type Provider = 'friend' | 'anthropic' | 'ollama'

/**
 * 网关一次调用的结果:答案本身,加上这一趟是怎么走的。
 */
export type FriendResult = {
  /**
   * 整段答案,已 trim;空答案走不到这儿(上一层就抛了)
   */
  answer: string

  /**
   * 联网搜索给的出处;只有旧链会有,新链恒空
   */
  sources: string[]

  /**
   * 这一发是不是上游缓存给的 —— 串答类事故只能靠它发现
   */
  cached: boolean

  /**
   * 走的哪条链:v1 = 新 OpenAI 兼容端点,legacy = 旧 /api/chat(webSearch 或回退)
   */
  via: 'v1' | 'legacy'

  /**
   * 新端点的 `x-cache` 响应头原值(HIT|MISS);旧链没这个头 → null
   */
  xCache: string | null
}

/**
 * 后端回给调用方的元信息(上游缓存串答类事故只能靠它发现,见 CompleteTextIn.onMeta)。
 */
export type ResultMeta = {
  /**
   * 是不是缓存给的
   */
  cached: boolean

  /**
   * 走的哪条链
   */
  via: 'v1' | 'legacy'

  /**
   * `x-cache` 头的原值;旧链没这个头 → null
   */
  xCache: string | null
}

// =========================================================================
// 3. 网关的线上形状(上游给什么就是什么,字段一律可缺)
// =========================================================================

/**
 * 发给 /v1 的一条消息(system 也在这条链里,不拆顶层)。
 * 🔴 本段以下都是**跨边界**的形状:`res.json()` 给的是 any,靠这些类型接住,解析时逐个兜底。
 * 别在这儿写必填字段 —— 上游少给一个,必填只会让我们在错的地方炸。
 */
export type GatewayMessage = {
  /**
   * 网关只认这两种
   */
  role: 'system' | 'user'

  /**
   * 内容
   */
  content: string
}

/**
 * 发给 /v1 的请求体。
 */
export type V1Request = {
  /**
   * 用哪个模型
   */
  model: string

  /**
   * system 与正文都在这里
   */
  messages: GatewayMessage[]

  /**
   * 要不要流;⚠️ 它进上游缓存键,流式与非流式各缓存一份
   */
  stream?: boolean

  /**
   * 输出长度上限,2026-08-04 起真生效
   */
  max_tokens?: number

  /**
   * 采样温度,不传走上游默认 0.4
   */
  temperature?: number

  /**
   * 置 false 绕开上游缓存(排查串答用)
   */
  cache?: boolean
}

/**
 * 发给旧 /api/chat 的请求体。
 */
export type LegacyRequest = {
  /**
   * 正文,前面钉着 [ref:指纹]
   */
  prompt: string

  /**
   * 旧链的 system 走顶层字段,不进 messages
   */
  system?: string

  /**
   * 开联网搜索 —— 这是旧链存在的唯一理由(/v1 不支持)
   */
  web_search?: boolean

  /**
   * 搜什么,不给就让上游自己从 prompt 里定
   */
  search_query?: string
}

/**
 * /v1 回包里的一条候选。流式的答案在 delta 里,非流式的在 message 里。
 */
export type V1Choice = {
  /**
   * 流式:这一块的增量
   */
  delta?: { content?: string }

  /**
   * 非流式:整段答案
   */
  message?: { content?: string }

  /**
   * 为什么停(stop / length …),只进日志
   */
  finish_reason?: string
}

/**
 * /v1 的回包。
 */
export type V1Response = {
  /**
   * 候选列表,我们只取第 0 条
   */
  choices?: V1Choice[]

  /**
   * token 用量,只进日志
   */
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/**
 * 旧链的一条来源:上游给对象就取 url,给字符串就用它自己。
 */
export type LegacySource = string | { url?: string }

/**
 * 旧链的回包。它的字段名和新链完全不同。
 */
export type LegacyResponse = {
  /**
   * 整段答案
   */
  answer?: string

  /**
   * 联网搜索的出处,形状不定
   */
  sources?: LegacySource[]

  /**
   * 旧链自报的缓存命中(没有 x-cache 头,只能信它)
   */
  cached?: boolean

  /**
   * 这一发有没有真用上联网搜索
   */
  web_search_used?: boolean
}

/**
 * /api/translate 的回包。
 */
export type TranslateResponse = { translated_text?: string }

/**
 * Ollama /api/chat 的回包(非流式)。
 */
export type OllamaResponse = { message?: { content?: string } }

/**
 * 发给 Ollama 的请求体。
 */
export type OllamaRequest = {
  /**
   * 本地模型名
   */
  model: string

  /**
   * 关思考链 —— 我们要答案,不要它的草稿
   */
  think: boolean

  /**
   * 要不要流
   */
  stream: boolean

  /**
   * 整轮消息,system 不拆顶层
   */
  messages: ChatMessage[]

  /**
   * 采样温度与输出上限,Ollama 收在这一层
   */
  options: { temperature: number; num_predict: number }
}

// =========================================================================
// 4. 看门狗
// =========================================================================

/**
 * 一个 AbortController 同时挂两个闸 —— 硬上限(timeoutMs,只响一次)与停摆(stallMs,每有动静就重置)。
 * 两个闸共用同一个 signal,所以**它管得住整通请求**:等响应头那段、以及读 SSE body 那段。
 * `why()` 只为日志分得清是「整通太久」还是「中途没动静」——错误码两者都是 timeout(调用方按同一条路降级)。
 */
export type Watch = {
  /**
   * 两个闸共用这一个 signal,所以它管得住整通请求
   */
  signal: AbortSignal

  /**
   * 收到一块**真内容**就喂一次(心跳/空 delta 不算动静,否则看门狗就白装了)
   */
  kick: () => void

  /**
   * 整通收尾时撤掉两个定时器 —— 忘了它就是漏一个句柄
   */
  stop: () => void

  /**
   * 为什么掐的,只为日志分得清
   */
  why: () => WatchWhy

  /**
   * 掐断原因的人话版,进错误 message
   */
  label: () => string
}

/**
 * 掐断的原因:整通太久 / 中途没动静 / 还没掐。
 */
export type WatchWhy = 'timeout' | 'stall' | null

// =========================================================================
// 5. 出口:两个公开函数的入参
// =========================================================================

/**
 * streamChat 的入参。
 */
export type StreamChatIn = {
  /**
   * 整轮消息,system 混在里面
   */
  messages: ChatMessage[]

  /**
   * 输出长度上限
   */
  maxTokens: number

  /**
   * 只在 anthropic 生效:声明服务端 web_fetch,让模型现场抓这个 URL 做 grounding
   */
  fetchUrl?: string
}

/**
 * 纯文本增量的字节流。调用方直接透传给前端。
 */
export type StreamChatOut = Promise<ReadableStream<Uint8Array>>

/**
 * completeText 的入参。
 */
export type CompleteTextIn = {
  /**
   * 整轮消息,system 混在里面
   */
  messages: ChatMessage[]

  /**
   * 输出长度上限
   */
  maxTokens: number

  /**
   * 按调用点定向通道。
   *
   * 2026-08-03 Frank 拍板「简历对照不用 Haiku,用朋友的大模型」,所以 resume-match 传 'friend'。
   * 不传就照旧走全局 LLM_PROVIDER,其他调用点零影响。
   */
  provider?: Provider

  /**
   * 要确定性的调用点(抽 JSON、对照打分)显式压低;不传走上游默认 0.4
   */
  temperature?: number

  /**
   * 把后端的元信息回传给调用方打日志。只有 friend 通道会回调。
   *
   * 上游缓存串答那类事故只能靠它发现 —— 不透出来,下次还得靠人肉撞见(2026-08-04 事故)。
   * xCache 是上游 `x-cache: HIT|MISS` 响应头的原值,换 /v1 端点后直接读头,不再靠我们自己推断;
   * via 记的是这次走了新端点还是回退到了旧 /api/chat。
   */
  onMeta?: (meta: ResultMeta) => void

  /**
   * 流式增量。只有 friend 通道支持,传了就让网关发 `stream:true`。
   *
   * 传不传,返回值都是整段答案。对话侧拿它测首字延迟,但**不往前端发**:
   * 出口那五道校验是整段跑的,流答案等于让用户读到随后可能被撤回的数字。
   */
  onDelta?: (chunk: string) => void

  /**
   * 多久没吐字就别再等。只有 friend 通道支持,不传就只有 90s 的硬上限。
   *
   * 这个数由调用点自己定:等得起的后台活(简历对照)与等不起的对话合成,忍耐力本来就不该一样。
   */
  stallMs?: number
}

/**
 * 整段答案。
 */
export type CompleteTextOut = Promise<string>

// =========================================================================
// 6. 朋友网关:调用与内部零件的入参
// =========================================================================

/**
 * friendChat 与 friendChatOrThrow 的入参。两条链共用它,各自忽略用不上的字段。
 */
export type FriendChatIn = {
  /**
   * 正文
   */
  prompt: string

  /**
   * 系统提示;两条链放的位置不同,由各自的构建函数处理
   */
  system?: string

  /**
   * 联网搜索:/v1 不支持 → 强制走旧 /api/chat(实测记录见 constants 第 2 段)
   */
  webSearch?: boolean

  /**
   * 搜什么;不给就让上游自己从 prompt 里定
   */
  searchQuery?: string

  /**
   * 整通电话最长多久;不传走网关默认 60s
   */
  timeoutMs?: number

  /**
   * 输出长度上限(/v1 真生效;旧链忽略)。不传 = 上游默认 4096
   */
  maxTokens?: number

  /**
   * 采样温度(/v1 生效;旧链忽略)。不传 = 上游默认 0.4。要确定性的场景显式传低值
   */
  temperature?: number

  /**
   * 绕开上游缓存(排查串答用):/v1 发 X-No-Cache 头 + body cache:false
   */
  noCache?: boolean

  /**
   * 流式增量回调(**只 /v1 支持**;传了就发 `stream:true`,回调按上游吐的块逐段给)。
   * 传不传都返回完整 answer —— 调用方可以只拿它测首字延迟,不改变返回契约。
   * ⚠️ `stream:true` 进 body = 进上游缓存键,所以流式与非流式各缓存一份(第一次切过去必然 MISS)。
   */
  onDelta?: (chunk: string) => void

  /**
   * 停摆上限:**连着这么久一个字都没吐** → abort 整个请求,报 `timeout`(2026-08-09 加)。
   * 与 timeoutMs 的分工:timeoutMs 是「整通电话最长多久」,stallMs 是「多久没听见对方出声」。
   * 🔴 为什么非有它不可:timeoutMs 当时只管到**响应头到手**(那会儿 postJson 的 finally 当场 clearTimeout;
   *    今天不再 clear,见它顶上那条 🔴),
   *    SSE body 那一段此前**一点上限都没有** —— 上游把头发回来再卡住,我们就一直读到天荒地老。
   *    Frank 实撞的 112.7s(chat_logs id132,朋友 qwen 冷启/单队列;热身后 9-11s)就卡在这种「还连着但不出声」上。
   * 不传 = 不装看门狗,行为与今天一字不差。
   */
  stallMs?: number
}

/**
 * friendChatOrThrow 的返回。
 */
export type FriendChatOut = Promise<FriendResult>

/**
 * 老签名的返回:失败静默 null(现有调用方靠它降级)
 */
export type FriendChatMaybeOut = Promise<FriendResult | null>

/**
 * 网关能不能用。
 */
export type FriendLlmReadyOut = boolean

/**
 * makeWatch 的入参。两个闸都在这里配。
 */
export type MakeWatchIn = {
  /**
   * 硬上限:整通电话最长多久,只响一次
   */
  timeoutMs: number

  /**
   * 停摆闸:多久没听见对方出声;不传 = 不装这个闸
   */
  stallMs?: number
}

/**
 * postJson 的入参。
 */
export type PostJsonIn = {
  /**
   * 端点路径,拼在网关地址后面
   */
  path: string

  /**
   * 两条链的请求体形状不同,这里收并集
   */
  body: V1Request | LegacyRequest

  /**
   * 除公共头之外这一发要加的(X-API-Key / X-No-Cache)
   */
  extraHeaders: Record<string, string>

  /**
   * 看门狗;**这儿不撤定时器**,body 还没读完
   */
  watch: Watch
}

/**
 * 原始响应。状态码和 body 都交给调用方处置。
 */
export type PostJsonOut = Promise<Response>

/**
 * readV1Sse 的入参。
 */
export type ReadV1SseIn = {
  /**
   * 响应体,已确认是 text/event-stream
   */
  body: ReadableStream<Uint8Array>

  /**
   * 每读到一块**真内容**喂一次,喂不动就是停摆
   */
  watch: Watch

  /**
   * 增量回调,不传就只累积不回吐
   */
  onDelta?: (chunk: string) => void
}

/**
 * 拼完的整段答案。增量在读的过程中已经喂给 onDelta 了。
 */
export type ReadV1SseOut = Promise<string>

/**
 * gatewayMessages 的入参。
 */
export type GatewayMessagesIn = {
  /**
   * 正文
   */
  prompt: string

  /**
   * 有就排在正文前面一条
   */
  system?: string
}

/**
 * 拼好的消息数组。有 system 的话它排在第一条。
 */
export type GatewayMessagesOut = GatewayMessage[]

/**
 * charCount 的入参。上游按所有 content 的字符数之和算,所以要整个数组。
 */
export type CharCountIn = { messages: GatewayMessage[] }

/**
 * 所有 content 的字符数之和。超过上限就在本地拦下,不发出去。
 */
export type CharCountOut = number

/**
 * sourceUrl 的入参。旧链给的来源可能是对象也可能是字符串。
 */
export type SourceUrlIn = { source: LegacySource }

/**
 * 取出来的 URL。取不到就返回空串,调用方会把空串丢掉。
 */
export type SourceUrlOut = string

/**
 * sendV1 的入参。stream 由调用方定:空答案原地重来那次,要的正是同样的 body 但不要流。
 */
export type SendV1In = { call: FriendChatIn; messages: GatewayMessage[]; stream: boolean; watch: Watch }

/**
 * 原始响应。
 */
export type SendV1Out = Promise<Response>

// =========================================================================
// 7. 三个后端的内部零件
// =========================================================================

/**
 * friend 通道要的两段:system 合并成一段,其余合并成 prompt。
 */
export type SplitMessagesIn = { messages: ChatMessage[] }

/**
 * 拆出来的两段。一条 system 都没有时是 undefined,这个字段就不发。
 */
export type SplitMessagesOut = {
  /**
   * 所有 system 合并;一条都没有 → undefined(不发这个字段)
   */
  system: string | undefined

  /**
   * 其余轮次合并
   */
  prompt: string
}

/**
 * anthropic 通道要的两段:system 拆到顶层参数,其余留在 messages。
 */
export type SystemOfIn = { messages: ChatMessage[] }

/**
 * 合并后的 system。一条都没有时是空串,空串不会进请求。
 */
export type SystemOfOut = string

/**
 * turnsOf 的入参。
 */
export type TurnsOfIn = { messages: ChatMessage[] }

/**
 * 除 system 之外的轮次,顺序不变。
 */
export type TurnsOfOut = AnthropicTurn[]

/**
 * textOf 的入参。
 */
export type TextOfIn = { blocks: AnthropicBlock[] }

/**
 * 回包里所有文本块拼起来。其余的块(工具调用等)丢掉。
 */
export type TextOfOut = string

/**
 * webFetchTool 的入参。没给 URL 就不声明这把工具。
 */
export type WebFetchToolIn = { fetchUrl?: string }

/**
 * 声明好的工具。URL 没给或不合法时返回 null,这时的行为和没有 URL 完全一样。
 */
export type WebFetchToolOut = WebFetchTool | null

/**
 * friendStream 与 ollamaStream 的入参。
 */
export type BackendStreamIn = {
  /**
   * 整轮消息
   */
  messages: ChatMessage[]

  /**
   * 输出长度上限
   */
  maxTokens: number
}

/**
 * anthropicStream 的入参。比另外两条多一个 fetchUrl。
 */
export type AnthropicStreamIn = {
  /**
   * 整轮消息
   */
  messages: ChatMessage[]

  /**
   * 输出长度上限
   */
  maxTokens: number

  /**
   * 给了就声明 web_fetch,让模型现场抓它
   */
  fetchUrl?: string
}

/**
 * 三条链统一吐这个。
 */
export type BackendStreamOut = Promise<ReadableStream<Uint8Array>>

/**
 * completeFriend 的入参。它要用到 onMeta / onDelta / stallMs,所以直接沿用出口的入参。
 */
export type CompleteFriendIn = CompleteTextIn

/**
 * completeAnthropic 与 completeOllama 的入参。这两条通道没有回调。
 */
export type CompleteBackendIn = {
  /**
   * 整轮消息
   */
  messages: ChatMessage[]

  /**
   * 输出长度上限
   */
  maxTokens: number
}

/**
 * 整段答案。
 */
export type CompleteBackendOut = Promise<string>

// =========================================================================
// 8. 逐行对齐翻译
// =========================================================================

/**
 * 翻译链能不能用。它和 friendLlmReady 判的是同一对 env。
 */
export type TranslateReadyOut = boolean

/**
 * stripMd 的入参。
 */
export type StripMdIn = { text: string }

/**
 * 去掉加粗与标题记号之后的正文。
 */
export type StripMdOut = string

/**
 * parseNumbered 的入参。
 */
export type ParseNumberedIn = { text: string }

/**
 * 编号 → 译文;缺号/空段就是缺,不抛
 */
export type ParseNumberedOut = Map<number, string>

/**
 * numberLines 的入参。
 */
export type NumberLinesIn = { lines: string[] }

/**
 * 编好号的一整段,行与行之间用换行分开。
 */
export type NumberLinesOut = string

/**
 * translateChunk 的入参。
 */
export type TranslateChunkIn = {
  /**
   * 这一块的行,≤8 行
   */
  lines: string[]

  /**
   * 目标语种;它也拌进指纹
   */
  lang: string

  /**
   * 路由那侧的总超时,掐了就整批停
   */
  signal: AbortSignal
}

/**
 * 解出来的编号→译文映射。两次都一行没解到就返回 null,表示这一块整块没翻成。
 */
export type TranslateChunkOut = Promise<ParseNumberedOut | null>

/**
 * translateLinesAligned 的入参。
 */
export type TranslateLinesIn = {
  /**
   * 整批要翻的行,内部自己切块
   */
  lines: string[]

  /**
   * 目标语种
   */
  lang: string

  /**
   * 路由那侧的总超时
   */
  signal: AbortSignal
}

/**
 * 与 lines 等长;null = 该行没翻到(调用方保留原文)
 */
export type TranslateLinesOut = Promise<(string | null)[]>

// =========================================================================
// 9. 指纹
// =========================================================================

/**
 * fnv1a 的入参。
 */
export type Fnv1aIn = {
  /**
   * 要算的内容
   */
  text: string

  /**
   * 种子;换一个就是另一份独立哈希
   */
  seed: number
}

/**
 * 32 位无符号哈希值。
 */
export type Fnv1aOut = number

/**
 * alpha7 的入参。
 */
export type Alpha7In = { n: number }

/**
 * 7 个字母。
 */
export type Alpha7Out = string

/**
 * contentTag 的入参。
 */
export type ContentTagIn = { text: string }

/**
 * 14 个字母的指纹。只用字母不带数字,免得被防幻觉校验误伤。
 */
export type ContentTagOut = string

/**
 * 拌进指纹但**不进正文**的那一段:旧链是 system,翻译链是目标语种
 */
export type RefPromptIn = {
  /**
   * 正文,指纹钉在它前面
   */
  prompt: string

  /**
   * 拌进指纹但不进正文的那一段
   */
  salt: string
}

/**
 * 指纹行加原文。指纹排在第 0 位,一定落在上游缓存键取的那段窗口里。
 */
export type RefPromptOut = string

